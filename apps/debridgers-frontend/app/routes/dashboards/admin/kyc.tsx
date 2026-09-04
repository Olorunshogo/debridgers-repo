import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, Check, X, Landmark, FileImage } from "lucide-react";
import { apiFetch, ApiError } from "@debridgers/api-client";
import {
  fadeDownVariants,
  staggerItemVariants,
  staggerDelay,
  transitionBase,
  TextInputField,
} from "@debridgers/ui-web";

export function meta() {
  return [
    { title: "KYC Review | Debridgers Admin" },
    {
      name: "description",
      content:
        "Review agent identity documents and bank details, then approve or reject KYC submissions.",
    },
    { name: "robots", content: "noindex, nofollow" },
  ];
}

type KycStatus = "not_submitted" | "submitted" | "approved" | "rejected";

interface KycRow {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  kyc_status: KycStatus;
  id_type: string | null;
  id_front_url: string | null;
  id_selfie_url: string | null;
  bank_name: string | null;
  bank_account_number: string | null;
  bank_account_name: string | null;
}

const STATUS_BADGE: Record<
  KycStatus,
  { bgClass: string; textClass: string; label: string }
> = {
  submitted: {
    bgClass: "bg-amber-100",
    textClass: "text-amber-800",
    label: "Pending review",
  },
  approved: {
    bgClass: "bg-status-delivered-bg",
    textClass: "text-status-delivered-text",
    label: "Approved",
  },
  rejected: {
    bgClass: "bg-status-cancelled-bg",
    textClass: "text-status-cancelled-text",
    label: "Rejected",
  },
  not_submitted: {
    bgClass: "bg-status-pending-bg",
    textClass: "text-status-pending-text",
    label: "Not submitted",
  },
};

const FILTERS: { value: KycStatus; label: string }[] = [
  { value: "submitted", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "not_submitted", label: "Not submitted" },
];

function agentName(row: KycRow): string {
  const name = `${row.first_name} ${row.last_name}`.trim();
  return name || row.email;
}

export default function AdminKycPage() {
  const [rows, setRows] = useState<KycRow[]>([]);
  const [filter, setFilter] = useState<KycStatus>("submitted");
  const [loading, setLoading] = useState<boolean>(true);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  /* Which row has its reject box open, and what reason has been typed. */
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState<string>("");

  async function load(status: KycStatus) {
    setLoading(true);
    try {
      const data = await apiFetch<KycRow[]>(`/admin/kyc?kyc_status=${status}`);
      setRows(data);
      setActionError(null);
    } catch (err) {
      /* An empty table would read as "nothing submitted", which is different. */
      setRows([]);
      setActionError(
        err instanceof ApiError
          ? err.message
          : "Could not load KYC submissions. Check your connection and retry.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load(filter);
  }, [filter]);

  async function handleApprove(id: number) {
    setBusyId(id);
    setActionError(null);
    setNotice(null);
    try {
      await apiFetch(`/admin/agents/${id}/kyc`, {
        method: "PATCH",
        body: JSON.stringify({ action: "approved" }),
      });
      setNotice("KYC approved. The agent can now request stock.");
      await load(filter);
    } catch (err) {
      setActionError(
        err instanceof ApiError
          ? err.message
          : "Could not approve that submission. Please try again.",
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
      await apiFetch(`/admin/agents/${id}/kyc`, {
        method: "PATCH",
        body: JSON.stringify({
          action: "rejected",
          reason: rejectReason.trim() || undefined,
        }),
      });
      setNotice("KYC rejected. The agent can resubmit their documents.");
      setRejectingId(null);
      setRejectReason("");
      await load(filter);
    } catch (err) {
      setActionError(
        err instanceof ApiError
          ? err.message
          : "Could not reject that submission. Please try again.",
      );
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <ShieldCheck size={24} className="text-primary" />
          <div>
            <h2 className="font-syne text-heading text-xl font-bold">
              KYC Review
            </h2>
            <p className="text-text text-sm">
              {loading ? "Loading..." : `${rows.length} submissions`}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setFilter(f.value)}
              className={`cursor-pointer rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
                filter === f.value
                  ? "bg-primary text-white"
                  : "border-gray-border text-text border hover:bg-black/5"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {actionError && (
        <div className="bg-status-cancelled-bg text-status-cancelled-text rounded-xl px-4 py-3 text-sm">
          {actionError}
        </div>
      )}
      {notice && (
        <div className="bg-status-delivered-bg text-status-delivered-text rounded-xl px-4 py-3 text-sm">
          {notice}
        </div>
      )}

      <div className="flex flex-col gap-4">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="border-gray-border h-40 animate-pulse rounded-2xl border bg-white"
            />
          ))
        ) : rows.length === 0 ? (
          <div className="border-gray-border rounded-2xl border bg-white px-5 py-10 text-center">
            <p className="text-text text-sm">
              No {STATUS_BADGE[filter].label.toLowerCase()} KYC submissions.
            </p>
          </div>
        ) : (
          <AnimatePresence>
            {rows.map((row, i) => {
              const badge = STATUS_BADGE[row.kyc_status];
              const isBusy = busyId === row.id;
              return (
                <motion.div
                  key={row.id}
                  variants={staggerItemVariants}
                  initial="initial"
                  animate="animate"
                  transition={staggerDelay(i)}
                  className="border-gray-border flex flex-col gap-4 rounded-2xl border bg-white p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex flex-col gap-0.5">
                      <p className="text-heading font-semibold">
                        {agentName(row)}
                      </p>
                      <p className="text-text text-xs">{row.email}</p>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${badge.bgClass} ${badge.textClass}`}
                    >
                      {badge.label}
                    </span>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    {/* Documents */}
                    <div className="flex flex-col gap-2">
                      <p className="text-text flex items-center gap-1.5 text-xs font-semibold tracking-wide uppercase">
                        <FileImage size={13} /> Identity - {row.id_type ?? "—"}
                      </p>
                      <div className="flex gap-3">
                        {row.id_front_url ? (
                          <a
                            href={row.id_front_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="border-gray-border block h-24 w-24 shrink-0 overflow-hidden rounded-lg border"
                          >
                            <img
                              src={row.id_front_url}
                              alt="ID front"
                              className="h-full w-full object-cover"
                            />
                          </a>
                        ) : (
                          <div className="border-gray-border bg-bg-light text-text flex h-24 w-24 shrink-0 items-center justify-center rounded-lg border text-xs">
                            No ID
                          </div>
                        )}
                        {row.id_selfie_url ? (
                          <a
                            href={row.id_selfie_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="border-gray-border block h-24 w-24 shrink-0 overflow-hidden rounded-lg border"
                          >
                            <img
                              src={row.id_selfie_url}
                              alt="Selfie holding ID"
                              className="h-full w-full object-cover"
                            />
                          </a>
                        ) : (
                          <div className="border-gray-border bg-bg-light text-text flex h-24 w-24 shrink-0 items-center justify-center rounded-lg border text-xs">
                            No selfie
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Bank details */}
                    <div className="flex flex-col gap-2">
                      <p className="text-text flex items-center gap-1.5 text-xs font-semibold tracking-wide uppercase">
                        <Landmark size={13} /> Bank details
                      </p>
                      <div className="text-heading flex flex-col gap-0.5 text-sm">
                        <span>{row.bank_name ?? "—"}</span>
                        <span>{row.bank_account_number ?? "—"}</span>
                        <span>{row.bank_account_name ?? "—"}</span>
                      </div>
                    </div>
                  </div>

                  {row.kyc_status === "submitted" && (
                    <div className="flex flex-col gap-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => void handleApprove(row.id)}
                          disabled={isBusy}
                          className="bg-primary flex cursor-pointer items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <Check size={14} /> Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setRejectingId((prev) =>
                              prev === row.id ? null : row.id,
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
                        {rejectingId === row.id && (
                          <motion.div
                            variants={fadeDownVariants}
                            initial="initial"
                            animate="animate"
                            exit="exit"
                            transition={transitionBase}
                            className="bg-bg-light flex flex-col gap-2 rounded-xl p-3"
                          >
                            <TextInputField
                              label="Reason (shown to the agent)"
                              id={`reason-${row.id}`}
                              value={rejectReason}
                              onChange={(
                                e: React.ChangeEvent<HTMLInputElement>,
                              ) => setRejectReason(e.target.value)}
                              placeholder="e.g. Selfie photo is unclear, please retake"
                            />
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => void handleReject(row.id)}
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
            })}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
