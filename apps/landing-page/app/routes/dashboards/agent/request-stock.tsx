import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Minus, Plus, CheckCircle2 } from "lucide-react";
import { apiFetch, ApiError } from "../../../utils/apiFetch";

export function meta() {
  return [{ title: "Request Stock | Debridgers" }];
}

type RequestStatus = "pending" | "fulfilled" | "cancelled";

interface StockRequest {
  id: string;
  quantity: number;
  status: RequestStatus;
  amount_to_remit: number;
  amount_remitted: number;
  created_at: string;
}

interface ApiStockRequest {
  id: number;
  quantity: number;
  status: string;
  amount_to_remit: number;
  amount_remitted: number;
  fulfilled_at: string | null;
  created_at: string;
}

const PRICE_PER_PACK_KOBO = 130000;

const statusStyles: Record<
  RequestStatus,
  { bg: string; text: string; label: string }
> = {
  fulfilled: {
    bg: "var(--status-delivered-bg)",
    text: "var(--status-delivered-text)",
    label: "Fulfilled",
  },
  pending: { bg: "#FEF3C7", text: "#92400E", label: "Pending" },
  cancelled: {
    bg: "var(--status-cancelled-bg)",
    text: "var(--status-cancelled-text)",
    label: "Cancelled",
  },
};

function fmt(kobo: number) {
  return (
    "₦" + (kobo / 100).toLocaleString("en-NG", { minimumFractionDigits: 0 })
  );
}

export default function AgentRequestStockPage() {
  const [bags, setBags] = useState(5);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [pastRequests, setPastRequests] = useState<StockRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(true);

  function loadRequests() {
    return apiFetch<ApiStockRequest[]>("/agent/stock")
      .then((rows) =>
        setPastRequests(
          rows.map((r) => ({
            id: String(r.id),
            quantity: r.quantity,
            status: r.status as RequestStatus,
            amount_to_remit: r.amount_to_remit,
            amount_remitted: r.amount_remitted,
            created_at: r.created_at,
          })),
        ),
      )
      .catch(console.error);
  }

  useEffect(() => {
    loadRequests().finally(() => setLoadingRequests(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    setLoading(true);
    try {
      await apiFetch("/agent/stock/request", {
        method: "POST",
        body: JSON.stringify({ quantity: bags }),
      });
      setSubmitted(true);
      setBags(5);
      await loadRequests();
      setTimeout(() => setSubmitted(false), 3000);
    } catch (err) {
      setSubmitError(
        err instanceof ApiError
          ? err.message
          : "Failed to submit. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
      {/* Left: form */}
      <div
        className="flex flex-col gap-6 rounded-2xl border p-6"
        style={{
          borderColor: "var(--border-gray)",
          backgroundColor: "var(--white)",
        }}
      >
        <h3
          className="font-syne text-lg font-semibold"
          style={{ color: "var(--heading-colour)" }}
        >
          Request new stock
        </h3>

        <AnimatePresence mode="wait">
          {submitted ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium"
              style={{
                backgroundColor: "var(--status-delivered-bg)",
                color: "var(--status-delivered-text)",
              }}
            >
              <CheckCircle2 size={18} />
              Stock request submitted! Admin will review shortly.
            </motion.div>
          ) : (
            <motion.form
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onSubmit={handleSubmit}
              className="flex flex-col gap-6"
            >
              {submitError && (
                <p
                  className="rounded-xl px-4 py-3 text-sm"
                  style={{
                    backgroundColor: "var(--status-cancelled-bg)",
                    color: "var(--status-cancelled-text)",
                  }}
                >
                  {submitError}
                </p>
              )}

              <div className="flex flex-col items-center gap-3">
                <p
                  className="font-syne text-base font-semibold"
                  style={{ color: "var(--heading-colour)" }}
                >
                  How many packs do you need?
                </p>
                <p className="text-sm" style={{ color: "var(--text-colour)" }}>
                  Each pack costs ₦1,300 (to remit after sale)
                </p>

                <div
                  className="flex w-full max-w-[280px] items-center justify-between rounded-2xl px-6 py-4"
                  style={{ backgroundColor: "var(--bg-light)" }}
                >
                  <button
                    type="button"
                    onClick={() => setBags((b) => Math.max(1, b - 1))}
                    className="flex h-9 w-9 items-center justify-center rounded-full border transition-colors"
                    style={{
                      borderColor: "var(--border-gray)",
                      backgroundColor: "var(--white)",
                      color: "var(--heading-colour)",
                    }}
                  >
                    <Minus size={16} />
                  </button>

                  <div className="flex flex-col items-center gap-0.5">
                    <span
                      className="font-syne text-3xl font-bold"
                      style={{ color: "var(--heading-colour)" }}
                    >
                      {bags}
                    </span>
                    <span
                      className="text-xs"
                      style={{ color: "var(--text-colour)" }}
                    >
                      packs
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setBags((b) => b + 1)}
                    className="flex h-9 w-9 items-center justify-center rounded-full border transition-colors"
                    style={{
                      borderColor: "var(--border-gray)",
                      backgroundColor: "var(--white)",
                      color: "var(--heading-colour)",
                    }}
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>

              <div
                className="grid grid-cols-2 gap-4 rounded-xl p-4"
                style={{ backgroundColor: "var(--bg-light)" }}
              >
                <div className="flex flex-col gap-0.5">
                  <p
                    className="text-xs"
                    style={{ color: "var(--text-colour)" }}
                  >
                    Packs
                  </p>
                  <p
                    className="font-syne text-lg font-bold"
                    style={{ color: "var(--heading-colour)" }}
                  >
                    {bags}
                  </p>
                </div>
                <div className="flex flex-col gap-0.5">
                  <p
                    className="text-xs"
                    style={{ color: "var(--text-colour)" }}
                  >
                    Amount to remit
                  </p>
                  <p
                    className="font-syne text-lg font-bold"
                    style={{ color: "var(--heading-colour)" }}
                  >
                    {fmt(bags * PRICE_PER_PACK_KOBO)}
                  </p>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-full py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                style={{ backgroundColor: "var(--primary-color)" }}
              >
                {loading ? "Submitting..." : "Submit Stock Request"}
              </button>
            </motion.form>
          )}
        </AnimatePresence>
      </div>

      {/* Right: past requests */}
      <div
        className="flex flex-col gap-3 rounded-2xl border p-5"
        style={{
          borderColor: "var(--border-gray)",
          backgroundColor: "var(--white)",
        }}
      >
        <h3
          className="font-syne font-semibold"
          style={{ color: "var(--heading-colour)" }}
        >
          Past Requests
        </h3>

        {loadingRequests ? (
          <div className="flex flex-col gap-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-16 animate-pulse rounded-xl"
                style={{ backgroundColor: "var(--bg-light)" }}
              />
            ))}
          </div>
        ) : pastRequests.length === 0 ? (
          <p
            className="py-4 text-center text-sm"
            style={{ color: "var(--text-colour)" }}
          >
            No stock requests yet.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {pastRequests.map((req, i) => {
              const s = statusStyles[req.status] ?? statusStyles.pending;
              return (
                <motion.div
                  key={req.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className="flex items-center justify-between rounded-xl border px-4 py-3"
                  style={{
                    borderColor: "var(--border-gray)",
                    backgroundColor: "var(--bg-light)",
                  }}
                >
                  <div className="flex flex-col gap-0.5">
                    <p
                      className="text-sm font-semibold"
                      style={{ color: "var(--heading-colour)" }}
                    >
                      {req.quantity} pack{req.quantity !== 1 ? "s" : ""}
                    </p>
                    <p
                      className="text-xs"
                      style={{ color: "var(--text-colour)" }}
                    >
                      {new Date(req.created_at).toLocaleDateString("en-NG", {
                        month: "short",
                        day: "numeric",
                      })}
                      {" · "}
                      {fmt(req.amount_to_remit)}
                    </p>
                  </div>
                  <span
                    className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
                    style={{ backgroundColor: s.bg, color: s.text }}
                  >
                    {s.label}
                  </span>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
