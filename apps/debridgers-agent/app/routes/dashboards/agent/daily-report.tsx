import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, CheckCircle2 } from "lucide-react";
import {
  DateInputField,
  NumberInputField,
  TextInputField,
  SelectInputField,
  TextareaField,
  SubmitButton,
  getTodayDateString,
  formatCurrency,
  lgaSelectOptions,
} from "@debridgers/ui-web";
import { unsoldReasons } from "../../../data/unsold-reasons";
import { apiFetch, ApiError } from "@debridgers/api-client";

import { buildPageMeta } from "../../../lib/seo";
export function meta() {
  return buildPageMeta({
    title: "Daily Report | Debridgers",
    description:
      "Submit your daily sales and delivery report as a Debridgers field agent.",
    path: "/daily-report",
    noIndex: true,
  });
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

interface ApiReport {
  id: number;
  pages_sold: number;
  amount: string;
  notes: string | null;
  created_at: string;
}

function mapApiReport(r: ApiReport): ReportHistoryEntry {
  const naira = parseFloat(r.amount);
  return {
    id: String(r.id),
    dayLabel: new Date(r.created_at).toLocaleDateString("en-NG", {
      month: "short",
      day: "numeric",
      weekday: "short",
    }),
    bagsSold: r.pages_sold,
    area: r.notes ?? "—",
    amount: formatCurrency(naira),
    status: "approved",
  };
}

// === Status styles
const STATUS_STYLES: Record<
  ReportStatus,
  { colorClass: string; icon: string }
> = {
  approved: { colorClass: "text-status-active-fg", icon: "✓" },
  pending: { colorClass: "text-status-pending-fg", icon: "…" },
  rejected: { colorClass: "text-red-600", icon: "✗" },
  missed: { colorClass: "text-red-600", icon: "–" },
};

// === Report History Card
function ReportHistoryCard({ entries }: { entries: ReportHistoryEntry[] }) {
  const latest = entries.slice(0, 10);
  return (
    <div className="border-line flex flex-col overflow-hidden rounded-2xl border bg-white">
      <div className="border-line border-b px-5 py-4">
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
              className="border-line flex items-center justify-between border-b px-5 py-3.5 last:border-0"
            >
              <div className="flex flex-col gap-0.5">
                <p className="text-body text-xs">{entry.dayLabel}</p>
                <p
                  className={`text-sm font-semibold ${isMissed ? "text-body" : "text-heading"}`}
                >
                  {isMissed
                    ? `${entry.bagsSold} bag  Day off`
                    : `${entry.bagsSold} bags ${entry.area}`}
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <span
                  className={`font-syne text-sm font-semibold ${s.colorClass}`}
                >
                  {isMissed ? "Miss" : entry.amount}
                </span>
                <span className={`text-sm font-bold ${s.colorClass}`}>
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

/* Groups digits as the user types in the amount field. This is input masking,
   not money display - use formatCurrency from @debridgers/ui-web for that. */
function formatAmountInput(raw: string): string {
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
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [history, setHistory] = useState<ReportHistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  useEffect(() => {
    apiFetch<ApiReport[]>("/agent/reports")
      .then((rows) => setHistory(rows.map(mapApiReport)))
      .catch(() => setHistory([]))
      .finally(() => setHistoryLoading(false));
  }, []);

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
    setForm((p) => ({
      ...p,
      cashCollected: formatAmountInput(e.target.value),
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    setLoading(true);
    try {
      const pages_sold = parseInt(form.bagsSold, 10);
      const amount = parseFloat(form.cashCollected.replace(/,/g, ""));
      const notesParts = [form.feedback, form.unsoldReason].filter(Boolean);
      const notes = notesParts.join(" | ") || undefined;

      if (!pages_sold || pages_sold < 1 || isNaN(amount) || amount <= 0) {
        setSubmitError("Enter valid bags sold and cash collected.");
        return;
      }

      await apiFetch("/agent/report", {
        method: "POST",
        body: JSON.stringify({ pages_sold, amount, notes }),
      });

      const rows = await apiFetch<ApiReport[]>("/agent/reports");
      setHistory(rows.map(mapApiReport));

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
    <div className="py-section-py grid gap-6 lg:grid-cols-[1fr_453px]">
      {/* Left: Submit form */}
      <div className="border-line flex flex-col gap-5 rounded-2xl border bg-white p-6">
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
              className="bg-status-delivered text-status-delivered-fg flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium"
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
              {submitError && (
                <p className="bg-status-cancelled text-status-cancelled-fg rounded-xl px-4 py-3 text-sm">
                  {submitError}
                </p>
              )}
              {/* Form */}
              <div className="flex flex-col gap-4">
                {/* Row 1: Date + Bags Sold */}
                <div className="grid gap-4 md:grid-cols-2">
                  <DateInputField
                    label="Date"
                    required
                    value={form.date}
                    onChange={handleChange("date")}
                  />
                  <NumberInputField
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
                  <TextInputField
                    label="Cash Collected"
                    required
                    placeholder="e.g. 15,000"
                    value={form.cashCollected}
                    onChange={handleCashCollected}
                  />
                  <NumberInputField
                    label="Bags Remaining"
                    required
                    min={0}
                    placeholder="0"
                    value={form.bagsRemaining}
                    onChange={handleChange("bagsRemaining")}
                  />
                </div>

                {/* Area Covered */}
                <SelectInputField
                  label="Area Covered Today"
                  required
                  options={lgaSelectOptions("Kaduna")}
                  placeholder="Select area"
                  value={form.areaCovered}
                  onChange={handleChange("areaCovered")}
                />

                {/* Feedback */}
                <TextareaField
                  label="Feedback"
                  placeholder="Any issues, customer feedback…"
                  maxWords={300}
                  resizable={false}
                  value={form.feedback}
                  onChange={handleChange("feedback")}
                />

                {/* Unsold Reason */}
                <SelectInputField
                  label="Unsold Reason"
                  options={unsoldReasons}
                  placeholder="Select if applicable"
                  value={form.unsoldReason}
                  onChange={handleChange("unsoldReason")}
                />
              </div>

              {/* Submit */}
              <div className="mx-auto w-full max-w-102.5">
                <SubmitButton
                  variant="block"
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
      {historyLoading ? (
        <div className="border-line flex flex-col gap-3 overflow-hidden rounded-2xl border bg-white p-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="bg-light-bg h-12 animate-pulse rounded-xl"
            />
          ))}
        </div>
      ) : (
        <ReportHistoryCard entries={history} />
      )}
    </div>
  );
}
