import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Banknote,
  Check,
  X,
  Landmark,
  Clock,
  PlayCircle,
  Loader2,
} from "lucide-react";
import {
  apiFetch,
  apiFetchPaged,
  ApiError,
  type PaginationMeta,
} from "@debridgers/api-client";
import {
  formatFromKobo,
  fadeDownVariants,
  transitionBase,
  useDialog,
  DataTable,
  TablePrimaryCell,
  TableAmountCell,
  TableDateCell,
  TableTextCell,
  TableStatusBadge,
  TableEmptyState,
  type RowAction,
  type StatusTone,
  type TableColumn,
  type TableStateSnapshot,
} from "@debridgers/ui-web";

import { buildPageMeta } from "../../../lib/seo";
export function meta() {
  return buildPageMeta({
    title: "Payouts | Debridgers Admin",
    description:
      "Review agent payout requests, approve or reject them, and run the weekly disbursement.",
    path: "/payouts",
    noIndex: true,
  });
}

/*
 * The approval step in the payout chain.
 * Agents request payouts and the Friday cron pays approved ones, but nothing could move a request from pending to approved: the endpoints existed with no interface behind them, so the queue had no exit and no agent could ever be paid.
 */

type WithdrawalStatus = "pending" | "approved" | "rejected" | "paid";

interface Withdrawal {
  id: number;
  agent_id: number;
  agent_first_name: string | null;
  agent_last_name: string | null;
  agent_email: string | null;
  amount: number;
  bank_name: string;
  bank_account_number: string;
  bank_account_name: string;
  status: WithdrawalStatus;
  rejection_reason: string | null;
  payout_reference: string | null;
  processed_at: string | null;
  created_at: string;
}

/* The queue's own sums, counted server-side over every row rather than the visible page, which the two totals cards read. */
interface WithdrawalListMeta extends PaginationMeta {
  pending_total: number;
  approved_total: number;
}

interface PayoutRunResult {
  attempted: number;
  paid: number;
  failed: { withdrawal_id: number; reason: string }[];
}

const STATUS_BADGE: Record<
  WithdrawalStatus,
  { tone: StatusTone; label: string }
> = {
  pending: { tone: "warning", label: "Pending review" },
  approved: { tone: "info", label: "Approved - awaiting payout" },
  paid: { tone: "success", label: "Paid" },
  rejected: { tone: "danger", label: "Rejected" },
};

const FILTERS: { value: string; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "paid", label: "Paid" },
  { value: "rejected", label: "Rejected" },
  { value: "", label: "All" },
];

function agentName(w: Withdrawal): string {
  const name = [w.agent_first_name, w.agent_last_name]
    .filter(Boolean)
    .join(" ")
    .trim();
  return name || w.agent_email || `Agent #${w.agent_id}`;
}

export default function AdminPayoutsPage() {
  const [rows, setRows] = useState<Withdrawal[]>([]);
  const [filter, setFilter] = useState<string>("pending");
  const [loading, setLoading] = useState<boolean>(true);
  const [actionError, setActionError] = useState<string | null>(null);
  /* The list's own failure. An empty table would read as "no payout requests", which is a different story. */
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [runningSweep, setRunningSweep] = useState<boolean>(false);
  const [pageCount, setPageCount] = useState<number>(1);
  const [total, setTotal] = useState<number>(0);
  const [totals, setTotals] = useState<{
    pendingKobo: number;
    approvedKobo: number;
  }>({ pendingKobo: 0, approvedKobo: 0 });
  /* The engine's last emitted state, so an action can reload the same page. */
  const [snapshot, setSnapshot] = useState<TableStateSnapshot | null>(null);
  const { triggerDialog } = useDialog();

  /*
   * Server mode: the endpoint paginates, sorts and searches. Sort keys below are its own allowlist, so an unknown one is a 400 rather than a silent full-table sort.
   */
  const load = useCallback(
    async (state: TableStateSnapshot, status: string): Promise<void> => {
      setLoading(true);
      try {
        const { data, meta } = await apiFetchPaged<
          Withdrawal,
          WithdrawalListMeta
        >("/admin/withdrawals", {
          page: state.page,
          limit: state.pageSize,
          search: state.search,
          sort: state.sort?.key,
          order: state.sort?.direction,
          status: status || undefined,
        });
        setRows(data);
        setPageCount(meta.pages);
        setTotal(meta.total);
        setTotals({
          pendingKobo: meta.pending_total,
          approvedKobo: meta.approved_total,
        });
        setLoadError(null);
      } catch (err) {
        setRows([]);
        setLoadError(
          err instanceof ApiError
            ? err.message
            : "Could not load payout requests. Check your connection and retry.",
        );
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const handleStateChange = useCallback(
    (state: TableStateSnapshot): void => {
      setSnapshot(state);
      void load(state, filter);
    },
    [load, filter],
  );

  /* Reloads whatever page the admin is on, after an approve or a reject. */
  const reload = useCallback((): void => {
    if (snapshot) void load(snapshot, filter);
  }, [snapshot, filter, load]);

  /* Both throw rather than swallowing: the confirming dialog shows the failure and stays open, instead of closing over a decision that never landed. */
  const handleApprove = useCallback(
    async (id: number): Promise<void> => {
      setBusyId(id);
      setActionError(null);
      setNotice(null);
      try {
        await apiFetch(`/admin/withdrawals/${id}/approve`, { method: "PATCH" });
        setNotice(
          "Payout approved. It will be sent on the next Friday run, or you can run the sweep now.",
        );
        reload();
      } catch (err) {
        throw new Error(
          err instanceof ApiError
            ? err.message
            : "Could not approve that payout. Please try again.",
        );
      } finally {
        setBusyId(null);
      }
    },
    [reload],
  );

  const handleReject = useCallback(
    async (id: number, reason: string): Promise<void> => {
      setBusyId(id);
      setActionError(null);
      setNotice(null);
      try {
        await apiFetch(`/admin/withdrawals/${id}/reject`, {
          method: "PATCH",
          body: JSON.stringify({ reason: reason || undefined }),
        });
        setNotice("Payout rejected. The amount was returned to the agent.");
        reload();
      } catch (err) {
        throw new Error(
          err instanceof ApiError
            ? err.message
            : "Could not reject that payout. Please try again.",
        );
      } finally {
        setBusyId(null);
      }
    },
    [reload],
  );

  async function handleRunSweep() {
    setRunningSweep(true);
    setActionError(null);
    setNotice(null);
    try {
      const result = await apiFetch<PayoutRunResult>(
        "/payment/payout/run-weekly",
        { method: "POST" },
      );
      setNotice(
        `Sweep complete: ${result.paid} of ${result.attempted} paid` +
          (result.failed.length > 0
            ? `, ${result.failed.length} failed and can be retried.`
            : "."),
      );
      reload();
    } catch (err) {
      setActionError(
        err instanceof ApiError
          ? err.message
          : "Could not run the payout sweep. Please try again.",
      );
    } finally {
      setRunningSweep(false);
    }
  }

  const columns = useMemo<TableColumn<Withdrawal>[]>(
    () => [
      /* Column ids double as the endpoint's sort keys in server mode, so they are its allowlist verbatim, not names chosen here. */
      {
        id: "agent_name",
        header: "Agent",
        priority: "primary",
        minWidth: "16rem",
        sortable: true,
        cell: (w) => <TablePrimaryCell title={agentName(w)} />,
      },
      {
        id: "bank",
        header: "Bank details",
        priority: "secondary",
        minWidth: "18rem",
        cell: (w) => (
          <span className="text-body flex flex-wrap items-center gap-1.5 text-xs">
            <Landmark size={12} />
            {w.bank_name} - {w.bank_account_number} - {w.bank_account_name}
          </span>
        ),
      },
      {
        id: "amount",
        header: "Amount",
        align: "right",
        priority: "trailing",
        sortable: true,
        cell: (w) => <TableAmountCell kobo={w.amount} />,
      },
      {
        id: "status",
        header: "Status",
        priority: "trailing",
        sortable: true,
        cell: (w) => (
          <TableStatusBadge
            label={STATUS_BADGE[w.status].label}
            tone={STATUS_BADGE[w.status].tone}
          />
        ),
      },
      {
        id: "created_at",
        header: "Requested",
        priority: "detail",
        sortable: true,
        cell: (w) => <TableDateCell value={w.created_at} />,
      },
      {
        id: "payout_reference",
        header: "Reference",
        priority: "detail",
        cell: (w) => <TableTextCell value={w.payout_reference} />,
      },
      {
        id: "rejection_reason",
        header: "Rejection reason",
        priority: "detail",
        cell: (w) => (
          <TableTextCell
            value={w.rejection_reason}
            className="text-status-cancelled-fg"
          />
        ),
      },
    ],
    [],
  );

  const rowActions = useMemo<RowAction<Withdrawal>[]>(
    () => [
      /* `hidden` restricts this action to a pending request - it is the only one that can be acted on. */
      {
        id: "approve",
        label: "Approve",
        icon: Check,
        tone: "primary",
        hidden: (w) => w.status !== "pending",
        isBusy: (w) => busyId === w.id,
        onSelect: (w) => handleApprove(w.id),
        confirm: {
          dialogKey: "CONFIRM",
          props: (w) => ({
            title: `Approve ${formatFromKobo(w.amount)} to ${agentName(w)}?`,
            description:
              "Approved payouts are sent on the next Friday run, or by the sweep.",
            confirmLabel: "Approve payout",
            tone: "primary",
          }),
        },
      },
      {
        id: "reject",
        label: "Reject",
        icon: X,
        tone: "danger",
        hidden: (w) => w.status !== "pending",
        isBusy: (w) => busyId === w.id,
        /*
         * Opened directly rather than through `confirm`, because the rejection carries a reason back and the engine's confirm contract passes no arguments.
         */
        onSelect: (w) =>
          triggerDialog("REJECT_PAYOUT", {
            agentName: agentName(w),
            amountLabel: formatFromKobo(w.amount),
            onReject: (reason: string) => handleReject(w.id, reason),
          }),
      },
    ],
    [busyId, handleApprove, handleReject, triggerDialog],
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Banknote size={24} className="text-primary" />
          <div>
            <h2 className="font-syne text-heading text-xl font-bold">
              Payouts
            </h2>
            <p className="text-body text-sm">
              Approve agent payout requests. Approved payouts are sent every
              Friday at 9am.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void handleRunSweep()}
          disabled={runningSweep}
          className="bg-primary flex cursor-pointer items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {runningSweep ? (
            <>
              <Loader2 size={16} className="animate-spin" /> Running...
            </>
          ) : (
            <>
              <PlayCircle size={16} /> Run payout sweep
            </>
          )}
        </button>
      </div>

      <AnimatePresence>
        {notice && (
          <motion.div
            variants={fadeDownVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={transitionBase}
            className="bg-status-delivered text-status-delivered-fg flex items-start justify-between gap-3 rounded-xl px-4 py-3 text-sm"
          >
            <span>{notice}</span>
            <button
              type="button"
              aria-label="Dismiss"
              onClick={() => setNotice(null)}
              className="shrink-0 cursor-pointer rounded-full p-0.5 hover:bg-black/5"
            >
              <X size={16} />
            </button>
          </motion.div>
        )}
        {actionError && (
          <motion.div
            variants={fadeDownVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={transitionBase}
            className="bg-status-cancelled text-status-cancelled-fg flex items-start justify-between gap-3 rounded-xl px-4 py-3 text-sm"
          >
            <span>{actionError}</span>
            <button
              type="button"
              aria-label="Dismiss error"
              onClick={() => setActionError(null)}
              className="shrink-0 cursor-pointer rounded-full p-0.5 hover:bg-black/5"
            >
              <X size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Totals for the current view */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="border-line flex items-center gap-3 rounded-2xl border bg-white p-5">
          <span className="bg-status-pending flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
            <Clock size={18} className="text-status-pending-fg" />
          </span>
          <div className="flex min-w-0 flex-col">
            <span className="text-body text-xs">Awaiting review</span>
            <span className="font-syne text-heading truncate text-lg font-bold">
              {formatFromKobo(totals.pendingKobo)}
            </span>
          </div>
        </div>
        <div className="border-line flex items-center gap-3 rounded-2xl border bg-white p-5">
          <span className="bg-status-pending flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
            <Banknote size={18} className="text-status-pending-fg" />
          </span>
          <div className="flex min-w-0 flex-col">
            <span className="text-body text-xs">Approved, due Friday</span>
            <span className="font-syne text-heading truncate text-lg font-bold">
              {formatFromKobo(totals.approvedKobo)}
            </span>
          </div>
        </div>
      </div>

      <DataTable
        rows={rows}
        columns={columns}
        actions={rowActions}
        mode="cards"
        dataMode="server"
        total={total}
        pageCount={pageCount}
        onStateChange={handleStateChange}
        initialSort={{ key: "created_at", direction: "desc" }}
        caption="Payout requests"
        showSearch
        searchPlaceholder="Search by agent, bank or reference"
        loading={loading}
        error={loadError}
        onRetry={reload}
        pageSize={10}
        pageSizeOptions={[10, 25, 50]}
        /* The filter lives on the page, so the engine has to be told when it changes or the viewer stays on a page that no longer exists. */
        resetKey={filter}
        toolbar={FILTERS.map((f) => (
          <button
            key={f.value || "all"}
            type="button"
            onClick={() => setFilter(f.value)}
            className={`shrink-0 cursor-pointer rounded-full border px-4 py-2 text-sm font-semibold transition-all ${
              filter === f.value
                ? "border-primary bg-primary text-white"
                : "border-line text-heading hover:border-primary bg-white"
            }`}
          >
            {f.label}
          </button>
        ))}
        emptyState={
          <TableEmptyState
            icon={Banknote}
            title="No payout requests in this view"
            description="Requests matching this filter will appear here."
          />
        }
      />
    </div>
  );
}
