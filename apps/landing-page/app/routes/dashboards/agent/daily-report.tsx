import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, CheckCircle2 } from "lucide-react";
import {
  DashDateInput,
  DashNumberInput,
  DashTextInput,
  DashSelectInput,
  DashTextareaInput,
  SubmitButton,
  getTodayDateString,
} from "@debridgers/ui-web";
import { kadunaStateLgas, unsoldReasons } from "@/models/models";

export function meta() {
  return [{ title: "Daily Report | Debridgers" }];
}

// === Types
type ReportStatus = "approved" | "pending" | "rejected" | "missed";

interface ReportHistoryEntry {
  id: string;
  dayLabel: string;
  bagsSold: number;
  area: string;
  amount: string;
  status: ReportStatus;
}

// === Mock history
const MOCK_HISTORY: ReportHistoryEntry[] = [
  {
    id: "h1",
    dayLabel: "Apr 5, Sat",
    bagsSold: 3,
    area: "Barnawa",
    amount: "₦200",
    status: "approved",
  },
  {
    id: "h2",
    dayLabel: "Apr 4, Fri",
    bagsSold: 3,
    area: "Barnawa",
    amount: "₦200",
    status: "approved",
  },
  {
    id: "h3",
    dayLabel: "Apr 3, Thu",
    bagsSold: 0,
    area: "Day off",
    amount: "—",
    status: "missed",
  },
  {
    id: "h4",
    dayLabel: "Apr 2, Wed",
    bagsSold: 3,
    area: "Barnawa",
    amount: "₦200",
    status: "approved",
  },
  {
    id: "h5",
    dayLabel: "Apr 1, Tue",
    bagsSold: 5,
    area: "Narayi",
    amount: "₦350",
    status: "approved",
  },
  {
    id: "h6",
    dayLabel: "Mar 31, Mon",
    bagsSold: 2,
    area: "Kakuri",
    amount: "₦140",
    status: "pending",
  },
  {
    id: "h7",
    dayLabel: "Mar 30, Sun",
    bagsSold: 4,
    area: "Barnawa",
    amount: "₦280",
    status: "approved",
  },
  {
    id: "h8",
    dayLabel: "Mar 29, Sat",
    bagsSold: 1,
    area: "Narayi",
    amount: "₦70",
    status: "rejected",
  },
  {
    id: "h9",
    dayLabel: "Mar 28, Fri",
    bagsSold: 6,
    area: "Zaria",
    amount: "₦420",
    status: "approved",
  },
  {
    id: "h10",
    dayLabel: "Mar 27, Thu",
    bagsSold: 3,
    area: "Barnawa",
    amount: "₦210",
    status: "approved",
  },
];

// === Status styles
const STATUS_STYLES: Record<ReportStatus, { color: string; icon: string }> = {
  approved: { color: "var(--status-active-text)", icon: "✓" },
  pending: { color: "var(--status-pending-text)", icon: "…" },
  rejected: { color: "#DC2626", icon: "✗" },
  missed: { color: "#DC2626", icon: "–" },
};

// === Report History Card
function ReportHistoryCard({ entries }: { entries: ReportHistoryEntry[] }) {
  const latest = entries.slice(0, 10);
  return (
    <div className="border-border-gray flex flex-col overflow-hidden rounded-2xl border bg-white">
      <div className="border-border-gray border-b px-5 py-4">
        <h3 className="font-syne text-heading font-semibold">Report History</h3>
      </div>
      <div className="flex flex-col">
        {latest.map((entry, i) => {
          const s = STATUS_STYLES[entry.status];
          const isMissed = entry.status === "missed";
          return (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              className="border-border-gray flex items-center justify-between border-b px-5 py-3.5 last:border-0"
            >
              <div className="flex flex-col gap-0.5">
                <p className="text-xs" style={{ color: "var(--text-colour)" }}>
                  {entry.dayLabel}
                </p>
                <p
                  className="text-sm font-semibold"
                  style={{
                    color: isMissed
                      ? "var(--text-colour)"
                      : "var(--heading-colour)",
                  }}
                >
                  {isMissed
                    ? `${entry.bagsSold} bag  Day off`
                    : `${entry.bagsSold} bags ${entry.area}`}
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <span
                  className="font-syne text-sm font-semibold"
                  style={{ color: s.color }}
                >
                  {isMissed ? "Miss" : entry.amount}
                </span>
                <span className="text-sm font-bold" style={{ color: s.color }}>
                  {s.icon}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// === Form state
interface ReportForm {
  date: string;
  bagsSold: string;
  cashCollected: string;
  bagsRemaining: string;
  areaCovered: string;
  feedback: string;
  unsoldReason: string;
}

function formatCurrency(raw: string): string {
  const digits = raw.replace(/[^0-9]/g, "");
  if (!digits) return "";
  return Number(digits).toLocaleString("en-NG");
}

// === Page

export default function AgentDailyReportPage() {
  const [form, setForm] = useState<ReportForm>({
    date: getTodayDateString(),
    bagsSold: "",
    cashCollected: "",
    bagsRemaining: "",
    areaCovered: "",
    feedback: "",
    unsoldReason: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  function handleChange(field: keyof ReportForm) {
    return (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      >,
    ) => {
      setForm((p) => ({ ...p, [field]: e.target.value }));
    };
  }

  function handleCashCollected(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((p) => ({ ...p, cashCollected: formatCurrency(e.target.value) }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    // === PRODUCTION
    // await fetch(`${BASE_BACKEND_URL}/agent/daily-report`, {
    //   method: "POST",
    //   credentials: "include",
    //   headers: { "Content-Type": "application/json" },
    //   body: JSON.stringify(form),
    // });
    await new Promise<void>((r) => setTimeout(r, 900));
    setLoading(false);
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 3500);
    setForm({
      date: getTodayDateString(),
      bagsSold: "",
      cashCollected: "",
      bagsRemaining: "",
      areaCovered: "",
      feedback: "",
      unsoldReason: "",
    });
  }

  return (
    <div className="py-section-py grid gap-6 lg:grid-cols-[1fr_453px]">
      {/* Left: Submit form */}
      <div className="border-border-gray flex flex-col gap-5 rounded-2xl border bg-white p-6">
        <h3 className="font-syne text-heading text-lg font-semibold">
          Submit Today&apos;s Report
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
              Report submitted successfully!
            </motion.div>
          ) : (
            <motion.form
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onSubmit={handleSubmit}
              className="flex flex-col gap-6"
            >
              {/* Form */}
              <div className="flex flex-col gap-4">
                {/* Row 1: Date + Bags Sold */}
                <div className="grid gap-4 md:grid-cols-2">
                  <DashDateInput
                    label="Date"
                    required
                    value={form.date}
                    onChange={handleChange("date")}
                  />
                  <DashNumberInput
                    label="Bags Sold Today"
                    required
                    min={0}
                    placeholder="0"
                    value={form.bagsSold}
                    onChange={handleChange("bagsSold")}
                  />
                </div>

                {/* Row 2: Cash Collected + Bags Remaining */}
                <div className="grid gap-4 md:grid-cols-2">
                  <DashTextInput
                    label="Cash Collected"
                    required
                    placeholder="e.g. 15,000"
                    value={form.cashCollected}
                    onChange={handleCashCollected}
                  />
                  <DashNumberInput
                    label="Bags Remaining"
                    required
                    min={0}
                    placeholder="0"
                    value={form.bagsRemaining}
                    onChange={handleChange("bagsRemaining")}
                  />
                </div>

                {/* Area Covered */}
                <DashSelectInput
                  label="Area Covered Today"
                  required
                  options={kadunaStateLgas}
                  placeholder="Select area"
                  value={form.areaCovered}
                  onChange={handleChange("areaCovered")}
                />

                {/* Feedback */}
                <DashTextareaInput
                  label="Feedback"
                  placeholder="Any issues, customer feedback…"
                  maxWords={300}
                  resizable={false}
                  value={form.feedback}
                  onChange={handleChange("feedback")}
                />

                {/* Unsold Reason */}
                <DashSelectInput
                  label="Unsold Reason"
                  options={unsoldReasons}
                  placeholder="Select if applicable"
                  value={form.unsoldReason}
                  onChange={handleChange("unsoldReason")}
                />
              </div>

              {/* Submit */}
              <div className="mx-auto w-full max-w-[410px]">
                <SubmitButton
                  loading={loading}
                  loadingText="Submitting…"
                  icon={Check}
                >
                  Submit Report
                </SubmitButton>
              </div>
            </motion.form>
          )}
        </AnimatePresence>
      </div>

      {/* Right: History */}
      <ReportHistoryCard entries={MOCK_HISTORY} />
    </div>
  );
}
