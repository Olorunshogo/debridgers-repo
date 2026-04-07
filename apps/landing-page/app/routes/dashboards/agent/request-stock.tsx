import { useState } from "react";
import { motion } from "framer-motion";
import { ShoppingCart, CheckCircle } from "lucide-react";

export function meta() {
  return [{ title: "Request Stock | Debridgers" }];
}

interface StockRequest {
  id: string;
  item: string;
  quantity: number;
  date: string;
  status: "approved" | "pending" | "rejected";
}

const MOCK_REQUESTS: StockRequest[] = [
  {
    id: "s1",
    item: "Debridgers Pages (Pack of 10)",
    quantity: 5,
    date: "Apr 4, 2026",
    status: "approved",
  },
  {
    id: "s2",
    item: "Debridgers Pages (Pack of 10)",
    quantity: 3,
    date: "Apr 2, 2026",
    status: "pending",
  },
  {
    id: "s3",
    item: "Debridgers Pages (Pack of 10)",
    quantity: 8,
    date: "Mar 30, 2026",
    status: "approved",
  },
];

const statusStyles: Record<
  string,
  { bg: string; text: string; label: string }
> = {
  approved: {
    bg: "var(--status-active-bg)",
    text: "var(--status-active-text)",
    label: "Approved",
  },
  pending: { bg: "#FEF3C7", text: "#92400E", label: "Pending" },
  rejected: { bg: "#FEE2E2", text: "#991B1B", label: "Rejected" },
};

export default function AgentRequestStockPage() {
  const [submitted, setSubmitted] = useState(false);
  const [quantity, setQuantity] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 3000);
    setQuantity("");
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <ShoppingCart size={24} style={{ color: "var(--primary-color)" }} />
        <div>
          <h2
            className="font-syne text-xl font-bold"
            style={{ color: "var(--heading-colour)" }}
          >
            Request Stock
          </h2>
          <p className="text-sm" style={{ color: "var(--text-colour)" }}>
            Request new stock from the admin
          </p>
        </div>
      </div>

      {/* Request form */}
      <div
        className="rounded-2xl border p-5"
        style={{
          borderColor: "var(--border-gray)",
          backgroundColor: "var(--white)",
        }}
      >
        <h3
          className="font-syne mb-4 font-semibold"
          style={{ color: "var(--heading-colour)" }}
        >
          New Stock Request
        </h3>
        {submitted ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-2 text-sm font-medium"
            style={{ color: "var(--status-active-text)" }}
          >
            <CheckCircle size={18} />
            Request submitted! Admin will review shortly.
          </motion.div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label
                className="text-sm font-medium"
                style={{ color: "var(--heading-colour)" }}
              >
                Item
              </label>
              <input
                type="text"
                value="Debridgers Pages (Pack of 10)"
                readOnly
                className="rounded-xl border px-4 py-2.5 text-sm"
                style={{
                  borderColor: "var(--border-gray)",
                  color: "var(--text-colour)",
                  backgroundColor: "var(--bg-light)",
                }}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label
                className="text-sm font-medium"
                style={{ color: "var(--heading-colour)" }}
              >
                Quantity (packs)
              </label>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="e.g. 3"
                required
                className="rounded-xl border px-4 py-2.5 text-sm outline-none focus:ring-2"
                style={{
                  borderColor: "var(--border-gray)",
                  color: "var(--heading-colour)",
                  backgroundColor: "var(--bg-light)",
                }}
              />
            </div>
            <button
              type="submit"
              className="self-start rounded-full px-6 py-2.5 text-sm font-semibold transition-opacity hover:opacity-90"
              style={{ backgroundColor: "var(--primary-color)", color: "#fff" }}
            >
              Submit Request
            </button>
          </form>
        )}
      </div>

      {/* History */}
      <div
        className="overflow-hidden rounded-2xl border"
        style={{
          borderColor: "var(--border-gray)",
          backgroundColor: "var(--white)",
        }}
      >
        <div
          className="grid grid-cols-4 gap-4 border-b px-5 py-3 text-xs font-semibold tracking-wider uppercase"
          style={{
            borderColor: "var(--border-gray)",
            color: "var(--text-colour)",
          }}
        >
          <span>Date</span>
          <span>Item</span>
          <span>Qty</span>
          <span>Status</span>
        </div>
        {MOCK_REQUESTS.map((r, i) => {
          const s = statusStyles[r.status];
          return (
            <motion.div
              key={r.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.06 }}
              className="grid grid-cols-4 gap-4 border-b px-5 py-4 text-sm last:border-0"
              style={{ borderColor: "var(--border-gray)" }}
            >
              <span style={{ color: "var(--text-colour)" }}>{r.date}</span>
              <span style={{ color: "var(--heading-colour)" }}>{r.item}</span>
              <span style={{ color: "var(--heading-colour)" }}>
                {r.quantity}
              </span>
              <span
                className="w-fit rounded-full px-2 py-0.5 text-xs font-semibold"
                style={{ backgroundColor: s.bg, color: s.text }}
              >
                {s.label}
              </span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
