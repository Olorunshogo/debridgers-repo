import { useState } from "react";
import { motion } from "framer-motion";
import { ClipboardPenLine, CheckCircle } from "lucide-react";

export function meta() {
  return [{ title: "Daily Report | Debridgers" }];
}

interface ReportEntry {
  id: string;
  date: string;
  pagesSold: number;
  amount: string;
  commission: string;
  status: "approved" | "pending" | "rejected";
}

const MOCK_REPORTS: ReportEntry[] = [
  {
    id: "r1",
    date: "Apr 5, 2026",
    pagesSold: 6,
    amount: "₦90,000",
    commission: "₦27,000",
    status: "approved",
  },
  {
    id: "r2",
    date: "Apr 4, 2026",
    pagesSold: 4,
    amount: "₦60,000",
    commission: "₦18,000",
    status: "pending",
  },
  {
    id: "r3",
    date: "Apr 3, 2026",
    pagesSold: 5,
    amount: "₦75,000",
    commission: "₦22,500",
    status: "approved",
  },
  {
    id: "r4",
    date: "Apr 2, 2026",
    pagesSold: 2,
    amount: "₦30,000",
    commission: "₦9,000",
    status: "rejected",
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

export default function AgentDailyReportPage() {
  const [submitted, setSubmitted] = useState(false);
  const [pages, setPages] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 3000);
    setPages("");
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <ClipboardPenLine size={24} style={{ color: "var(--primary-color)" }} />
        <div>
          <h2
            className="font-syne text-xl font-bold"
            style={{ color: "var(--heading-colour)" }}
          >
            Daily Report
          </h2>
          <p className="text-sm" style={{ color: "var(--text-colour)" }}>
            Submit your daily sales activity
          </p>
        </div>
      </div>

      {/* Submit form */}
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
          Submit Today&apos;s Report
        </h3>
        {submitted ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-2 text-sm font-medium"
            style={{ color: "var(--status-active-text)" }}
          >
            <CheckCircle size={18} />
            Report submitted successfully!
          </motion.div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label
                className="text-sm font-medium"
                style={{ color: "var(--heading-colour)" }}
              >
                Pages Sold Today
              </label>
              <input
                type="number"
                min="0"
                value={pages}
                onChange={(e) => setPages(e.target.value)}
                placeholder="e.g. 5"
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
              Submit Report
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
          className="grid grid-cols-5 gap-4 border-b px-5 py-3 text-xs font-semibold tracking-wider uppercase"
          style={{
            borderColor: "var(--border-gray)",
            color: "var(--text-colour)",
          }}
        >
          <span>Date</span>
          <span>Pages</span>
          <span>Amount</span>
          <span>Commission</span>
          <span>Status</span>
        </div>
        {MOCK_REPORTS.map((r, i) => {
          const s = statusStyles[r.status];
          return (
            <motion.div
              key={r.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.06 }}
              className="grid grid-cols-5 gap-4 border-b px-5 py-4 text-sm last:border-0"
              style={{ borderColor: "var(--border-gray)" }}
            >
              <span style={{ color: "var(--text-colour)" }}>{r.date}</span>
              <span style={{ color: "var(--heading-colour)" }}>
                {r.pagesSold}
              </span>
              <span style={{ color: "var(--heading-colour)" }}>{r.amount}</span>
              <span
                className="font-semibold"
                style={{ color: "var(--primary-color)" }}
              >
                {r.commission}
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
