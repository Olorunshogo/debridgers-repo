import { z } from "zod";

/* Mirrors submitReportSchema on the backend (apps/debridgers-backend/src/api/v1/agent/dto/submit-report.dto.ts); cashCollected stays a comma-formatted string here since that's the input mask, parsed to a number at the submission boundary. */
export const dailyReportSchema = z.object({
  bagsSold: z
    .number({ message: "Enter bags sold" })
    .int()
    .min(1, "Must sell at least 1 bag"),
  cashCollected: z
    .string()
    .min(1, "Enter cash collected")
    .refine((value) => {
      const amount = Number(value.replace(/,/g, ""));
      return Number.isFinite(amount) && amount > 0;
    }, "Enter a valid amount"),
  areaCovered: z.string().min(1, "Select the area you covered today"),
  feedback: z.string(),
  unsoldReason: z.string(),
});

export type DailyReportValues = z.infer<typeof dailyReportSchema>;
