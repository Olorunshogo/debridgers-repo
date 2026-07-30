import { useState, useEffect, useMemo } from "react";
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
import { apiFetch, ApiError } from "@debridgers/api-client";
import {
  formatFromKobo,
  fadeDownVariants,
  staggerItemVariants,
  staggerDelay,
  transitionBase,
  DashTextInput,
} from "@debridgers/ui-web";

export function meta() {
  return [
    { title: "Payouts | Debridgers Admin" },
    {
      name: "description",
      content:
        "Review agent payout requests, approve or reject them, and run the weekly disbursement.",
    },
    { name: "robots", content: "noindex, nofollow" },
  ];
}

/*
 * The approval step in the payout chain.
 *
 * Agents request payouts and the Friday cron pays approved ones, but nothing
 * could move a request from pending to approved: the endpoints existed with no
 * interface behind them, so the queue had no exit and no agent could ever be
 * paid.
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

interface PayoutRunResult {
  attempted: number;
  paid: number;
  failed: { withdrawal_id: number; reason: string }[];
}

const STATUS_BADGE: Record<
  WithdrawalStatus,
  { bgClass: string; textClass: string; label: string }
> = {
  pending: {
    bgClass: "bg-amber-100",
    textClass: "text-amber-800",
    label: "Pending review",
  },
  approved: {
    bgClass: "bg-status-pending-bg",
    textClass: "text-status-pending-text",
    label: "Approved - awaiting payout",
  },
  paid: {
    bgClass: "bg-status-delivered-bg",
    textClass: "text-status-delivered-text",
    label: "Paid",
  },
  rejected: {
    bgClass: "bg-status-cancelled-bg",
    textClass: "text-status-cancelled-text",
    label: "Rejected",
  },
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

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("en-NG", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function AdminPayoutsPage() {
  const [rows, setRows] = useState<Withdrawal[]>([]);
  const [filter, setFilter] = useState<string>("pending");
  const [loading, setLoading] = useState<boolean>(true);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [runningSweep, setRunningSweep] = useState<boolean>(false);

  /* Which row has its reject box open, and what reason has been typed. */
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState<string>("");

  async function load(status: string) {
    setLoading(true);
    try {
      const query = status ? `?status=${status}` : "";
      const data = await apiFetch<Withdrawal[]>(`/admin/withdrawals${query}`);
      setRows(data);
      setActionError(null);
    } catch (err) {
      /* An empty table would read as "no payout requests", which is different. */
      setRows([]);
      setActionError(
        err instanceof ApiError
          ? err.message
          : "Could not load payout requests. Check your connection and retry.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load(filter);
  }, [filter]);

  const totals = useMemo(() => {
    const pendingKobo = rows
      .filter((r) => r.status === "pending")
      .reduce((sum, r) => sum + r.amount, 0);
    const approvedKobo = rows
      .filter((r) => r.status === "approved")
      .reduce((sum, r) => sum + r.amount, 0);
    return { pendingKobo, approvedKobo };
  }, [rows]);

  async function handleApprove(id: number) {
    setBusyId(id);
    setActionError(null);
    setNotice(null);
    try {
      await apiFetch(`/admin/withdrawals/${id}/approve`, { method: "PATCH" });
      setNotice(
        "Payout approved. It will be sent on the next Friday run, or you can run the sweep now.",
      );
      await load(filter);
    } catch (err) {
      setActionError(
        err instanceof ApiError
          ? err.message
          : "Could not approve that payout. Please try again.",
      );
    } finally {
      setBusyId(null);
    }
  }

  async function handleReject(id: number) {
    setBusyId(id);
    setActionError(null);
    setNotice(null);
    try {
      await apiFetch(`/admin/withdrawals/${id}/reject`, {
        method: "PATCH",
        body: JSON.stringify({ reason: rejectReason.trim() || undefined }),
      });
      setNotice("Payout rejected. The amount was returned to the agent.");
      setRejectingId(null);
      setRejectReason("");
      await load(filter);
    } catch (err) {
      setActionError(
        err instanceof ApiError
          ? err.message
          : "Could not reject that payout. Please try again.",
      );
    } finally {
      setBusyId(null);
    }
  }

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
      await load(filter);
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
            <p className="text-text text-sm">
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
            className="bg-status-delivered-bg text-status-delivered-text flex items-start justify-between gap-3 rounded-xl px-4 py-3 text-sm"
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
            className="bg-status-cancelled-bg text-status-cancelled-text flex items-start justify-between gap-3 rounded-xl px-4 py-3 text-sm"
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
        <div className="border-gray-border flex items-center gap-3 rounded-2xl border bg-white p-5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100">
            <Clock size={18} className="text-amber-800" />
          </span>
          <div className="flex min-w-0 flex-col">
            <span className="text-text text-xs">Awaiting review</span>
            <span className="font-syne text-heading truncate text-lg font-bold">
              {formatFromKobo(totals.pendingKobo)}
            </span>
          </div>
        </div>
        <div className="border-gray-border flex items-center gap-3 rounded-2xl border bg-white p-5">
          <span className="bg-status-pending-bg flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
            <Banknote size={18} className="text-status-pending-text" />
          </span>
          <div className="flex min-w-0 flex-col">
            <span className="text-text text-xs">Approved, due Friday</span>
            <span className="font-syne text-heading truncate text-lg font-bold">
              {formatFromKobo(totals.approvedKobo)}
            </span>
          </div>
        </div>
      </div>

      {/* Filter chips: scroll rather than wrap so the list stays visible */}
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {FILTERS.map((f) => (
          <button
            key={f.value || "all"}
            type="button"
            onClick={() => setFilter(f.value)}
            className={`shrink-0 cursor-pointer rounded-full border px-4 py-2 text-sm font-semibold transition-all ${
              filter === f.value
                ? "border-primary bg-primary text-white"
                : "border-gray-border text-heading hover:border-primary bg-white"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="border-gray-border flex flex-col gap-3 rounded-2xl border bg-white p-5">
        {loading ? (
          <div className="flex flex-col gap-3">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="bg-bg-light h-24 animate-pulse rounded-xl"
              />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-10">
            <Banknote size={36} className="text-text opacity-30" />
            <p className="text-text text-sm">
              No payout requests in this view.
            </p>
          </div>
        ) : (
          rows.map((w, i) => {
            const badge = STATUS_BADGE[w.status];
            const isBusy = busyId === w.id;
            return (
              <motion.div
                key={w.id}
                variants={staggerItemVariants}
                initial="initial"
                animate="animate"
                transition={staggerDelay(i)}
                className="border-gray-border flex flex-col gap-3 rounded-xl border p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <span className="text-heading text-sm font-semibold">
                      {agentName(w)}
                    </span>
                    <span className="text-text flex flex-wrap items-center gap-1.5 text-xs">
                      <Landmark size={12} />
                      {w.bank_name} - {w.bank_account_number} -{" "}
                      {w.bank_account_name}
                    </span>
                    <span className="text-text text-xs">
                      Requested {formatDate(w.created_at)}
                      {w.payout_reference ? ` - ref ${w.payout_reference}` : ""}
                    </span>
                    {w.rejection_reason && (
                      <span className="text-status-cancelled-text text-xs">
                        Reason: {w.rejection_reason}
                      </span>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <span className="font-syne text-heading text-lg font-bold">
                      {formatFromKobo(w.amount)}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${badge.bgClass} ${badge.textClass}`}
                    >
                      {badge.label}
                    </span>
                  </div>
                </div>

                {/* Only a pending request can be acted on. */}
                {w.status === "pending" && (
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => void handleApprove(w.id)}
                        disabled={isBusy}
                        className="bg-primary flex cursor-pointer items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <Check size={14} /> Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setRejectingId((prev) =>
                            prev === w.id ? null : w.id,
                          );
                          setRejectReason("");
                        }}
                        disabled={isBusy}
                        className="border-gray-border text-text cursor-pointer rounded-full border px-4 py-2 text-sm font-semibold transition-colors hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Reject
                      </button>
                    </div>

                    <AnimatePresence>
                      {rejectingId === w.id && (
                        <motion.div
                          variants={fadeDownVariants}
                          initial="initial"
                          animate="animate"
                          exit="exit"
                          transition={transitionBase}
                          className="bg-bg-light flex flex-col gap-2 rounded-xl p-3"
                        >
                          <DashTextInput
                            label="Reason (shown to the agent)"
                            id={`reason-${w.id}`}
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            placeholder="e.g. Bank details do not match KYC"
                          />
                          <p className="text-text text-xs">
                            Rejecting returns {formatFromKobo(w.amount)} to the
                            agent&apos;s available balance.
                          </p>
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => void handleReject(w.id)}
                              disabled={isBusy}
                              className="bg-status-cancelled-text flex cursor-pointer items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              <X size={14} /> Confirm rejection
                            </button>
                            <button
                              type="button"
                              onClick={() => setRejectingId(null)}
                              className="border-gray-border text-text cursor-pointer rounded-full border bg-white px-4 py-2 text-sm font-semibold transition-colors hover:bg-black/5"
                            >
                              Cancel
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
