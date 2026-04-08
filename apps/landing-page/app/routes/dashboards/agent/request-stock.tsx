import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Minus, Plus, CheckCircle2 } from "lucide-react";

export function meta() {
  return [{ title: "Request Stock | Debridgers" }];
}

// ── Types ─────────────────────────────────────────────────────────────────────
type FulfilledStatus = "fulfilled" | "pending";

interface PastRequest {
  id: string;
  description: string;
  date: string;
  status: FulfilledStatus;
}

// ── Mock data ─────────────────────────────────────────────────────────────────
const MOCK_PAST_REQUESTS: PastRequest[] = [
  {
    id: "r1",
    description: "10 bags of beans",
    date: "Mar 26",
    status: "fulfilled",
  },
  {
    id: "r2",
    description: "10 bags of beans",
    date: "Mar 26",
    status: "fulfilled",
  },
  {
    id: "r3",
    description: "10 bags of beans",
    date: "Mar 26",
    status: "pending",
  },
];

const PRICE_PER_BAG = 10000;
const COMMISSION_PER_BAG = 2000;

const statusStyles: Record<
  FulfilledStatus,
  { bg: string; text: string; label: string }
> = {
  fulfilled: {
    bg: "var(--status-delivered-bg)",
    text: "var(--status-delivered-text)",
    label: "Fulfilled",
  },
  pending: {
    bg: "var(--status-pending-bg)",
    text: "var(--status-pending-text)",
    label: "Pending",
  },
};

function fmt(n: number) {
  return "₦" + n.toLocaleString();
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function AgentRequestStockPage() {
  const [bags, setBags] = useState(5);
  const [deliveryAddress, setDeliveryAddress] = useState(
    "12 Barnawa Close, off Rabah Road, Barnawa",
  );
  const [deliveryTime, setDeliveryTime] = useState("Morning (8am - 12pm)");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  function decrement() {
    setBags((b) => Math.max(1, b - 1));
  }

  function increment() {
    setBags((b) => b + 1);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    // ── PRODUCTION ────────────────────────────────────────────────────────────
    // await fetch(`${BASE_BACKEND_URL}/agent/stock-request`, {
    //   method: "POST",
    //   credentials: "include",
    //   headers: { "Content-Type": "application/json" },
    //   body: JSON.stringify({ bags, deliveryAddress, deliveryTime }),
    // });

    // ── MOCK ──────────────────────────────────────────────────────────────────
    await new Promise<void>((r) => setTimeout(r, 800));
    setLoading(false);
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 3000);
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
              {/* Bag stepper */}
              <div className="flex flex-col items-center gap-3">
                <p
                  className="font-syne text-base font-semibold"
                  style={{ color: "var(--heading-colour)" }}
                >
                  How many bags do you need?
                </p>
                <p className="text-sm" style={{ color: "var(--text-colour)" }}>
                  Choose how many bags of beans to sell this week
                </p>

                <div
                  className="flex w-full max-w-[280px] items-center justify-between rounded-2xl px-6 py-4"
                  style={{ backgroundColor: "var(--bg-light)" }}
                >
                  <button
                    type="button"
                    onClick={decrement}
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
                      bags of beans
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={increment}
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

              {/* Summary row */}
              <div
                className="grid grid-cols-3 gap-4 rounded-xl p-4"
                style={{ backgroundColor: "var(--bg-light)" }}
              >
                <div className="flex flex-col gap-0.5">
                  <p
                    className="text-xs"
                    style={{ color: "var(--text-colour)" }}
                  >
                    Bags
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
                    Est. value
                  </p>
                  <p
                    className="font-syne text-lg font-bold"
                    style={{ color: "var(--heading-colour)" }}
                  >
                    {fmt(bags * PRICE_PER_BAG)}
                  </p>
                </div>
                <div className="flex flex-col gap-0.5">
                  <p
                    className="text-xs"
                    style={{ color: "var(--text-colour)" }}
                  >
                    Commission
                  </p>
                  <p
                    className="font-syne text-lg font-bold"
                    style={{ color: "var(--heading-colour)" }}
                  >
                    {fmt(bags * COMMISSION_PER_BAG)}
                  </p>
                </div>
              </div>

              {/* Delivery address */}
              <div className="flex flex-col gap-1.5">
                <label
                  className="text-xs font-semibold tracking-wider uppercase"
                  style={{ color: "var(--text-colour)" }}
                >
                  Delivery Address
                </label>
                <input
                  type="text"
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  className="w-full rounded-xl border px-4 py-3 text-sm transition-all outline-none"
                  style={{
                    borderColor: "var(--border-gray)",
                    backgroundColor: "var(--bg-light)",
                    color: "var(--heading-colour)",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "var(--primary-color)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "var(--border-gray)";
                  }}
                />
              </div>

              {/* Preferred delivery time */}
              <div className="flex flex-col gap-1.5">
                <label
                  className="text-xs font-semibold tracking-wider uppercase"
                  style={{ color: "var(--text-colour)" }}
                >
                  Preferred Delivery Time
                </label>
                <input
                  type="text"
                  value={deliveryTime}
                  onChange={(e) => setDeliveryTime(e.target.value)}
                  className="w-full rounded-xl border px-4 py-3 text-sm transition-all outline-none"
                  style={{
                    borderColor: "var(--border-gray)",
                    backgroundColor: "var(--bg-light)",
                    color: "var(--heading-colour)",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "var(--primary-color)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "var(--border-gray)";
                  }}
                />
              </div>

              {/* Submit */}
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
          Request new stock
        </h3>
        <div className="flex flex-col gap-2">
          {MOCK_PAST_REQUESTS.map((req, i) => {
            const s = statusStyles[req.status];
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
                    {req.description}
                  </p>
                  <p
                    className="text-xs"
                    style={{ color: "var(--text-colour)" }}
                  >
                    {req.date}
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
      </div>
    </div>
  );
}
