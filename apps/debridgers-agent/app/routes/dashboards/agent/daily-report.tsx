import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, AnimatePresence } from "framer-motion";
import { Check, CheckCircle2 } from "lucide-react";
import {
  NumberInputField,
  TextInputField,
  SelectInputField,
  TextareaField,
  SubmitButton,
  formatCurrency,
  lgaSelectOptions,
  dailyReportSchema,
  type DailyReportValues,
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
interface ReportHistoryEntry {
  id: string;
  dayLabel: string;
  bagsSold: number;
  area: string;
  amount: string;
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
  };
}

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
                <p className="text-heading text-sm font-semibold">
                  {`${entry.bagsSold} bags ${entry.area}`}
                </p>
              </div>
              {/* No status column exists server-side, so no chip is shown. */}
              <span className="font-syne text-heading text-sm font-semibold">
                {entry.amount}
              </span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

/*
 * Groups digits as the user types in the amount field.
 * This is input masking, not money display - use formatCurrency from @debridgers/ui-web for that.
 */
function formatAmountInput(raw: string): string {
  const digits = raw.replace(/[^0-9]/g, "");
  if (!digits) return "";
  return Number(digits).toLocaleString("en-NG");
}

// === Page

const EMPTY_REPORT: DailyReportValues = {
  bagsSold: 0,
  cashCollected: "",
  areaCovered: "",
  feedback: "",
  unsoldReason: "",
};

export default function AgentDailyReportPage() {
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [history, setHistory] = useState<ReportHistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  const {
    register,
    control,
    handleSubmit: handleFormSubmit,
    reset,
    formState: { errors, isSubmitting: loading },
  } = useForm<DailyReportValues>({
    resolver: zodResolver(dailyReportSchema),
    mode: "onChange",
    defaultValues: EMPTY_REPORT,
  });

  useEffect(() => {
    apiFetch<ApiReport[]>("/agent/reports")
      .then((rows) => setHistory(rows.map(mapApiReport)))
      .catch(() => setHistory([]))
      .finally(() => setHistoryLoading(false));
  }, []);

  const handleSubmit = handleFormSubmit(async (values) => {
    setSubmitError(null);
    try {
      /* The report endpoint's schema is only { pages_sold, amount, notes }, so the required area is folded into notes rather than dropped. */
      const notesParts = [
        `Area covered: ${values.areaCovered}.`,
        values.feedback,
        values.unsoldReason,
      ].filter(Boolean);
      const notes = notesParts.join(" | ") || undefined;

      await apiFetch("/agent/report", {
        method: "POST",
        body: JSON.stringify({
          pages_sold: values.bagsSold,
          amount: Number(values.cashCollected.replace(/,/g, "")),
          notes,
        }),
      });

      const rows = await apiFetch<ApiReport[]>("/agent/reports");
      setHistory(rows.map(mapApiReport));

      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 3500);
      reset(EMPTY_REPORT);
    } catch (err) {
      setSubmitError(
        err instanceof ApiError
          ? err.message
          : "Failed to submit. Please try again.",
      );
    }
  });

  return (
    <div className="py-section-py grid gap-6 lg:grid-cols-[1fr_453px]">
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
              <div className="flex flex-col gap-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <NumberInputField
                    label="Bags Sold Today"
                    required
                    min={0}
                    placeholder="0"
                    error={errors.bagsSold?.message}
                    {...register("bagsSold", { valueAsNumber: true })}
                  />
                  <Controller
                    control={control}
                    name="cashCollected"
                    render={({ field }) => (
                      <TextInputField
                        label="Cash Collected"
                        required
                        placeholder="e.g. 15,000"
                        value={field.value}
                        error={errors.cashCollected?.message}
                        onChange={(e) =>
                          field.onChange(formatAmountInput(e.target.value))
                        }
                      />
                    )}
                  />
                </div>

                <Controller
                  control={control}
                  name="areaCovered"
                  render={({ field }) => (
                    <SelectInputField
                      label="Area Covered Today"
                      required
                      options={lgaSelectOptions("Kaduna")}
                      placeholder="Select area"
                      value={field.value}
                      error={errors.areaCovered?.message}
                      onChange={field.onChange}
                    />
                  )}
                />

                <TextareaField
                  label="Feedback"
                  placeholder="Any issues, customer feedback…"
                  maxWords={300}
                  resizable={false}
                  {...register("feedback")}
                />

                <Controller
                  control={control}
                  name="unsoldReason"
                  render={({ field }) => (
                    <SelectInputField
                      label="Unsold Reason"
                      options={unsoldReasons}
                      placeholder="Select if applicable"
                      value={field.value}
                      onChange={field.onChange}
                    />
                  )}
                />
              </div>

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
