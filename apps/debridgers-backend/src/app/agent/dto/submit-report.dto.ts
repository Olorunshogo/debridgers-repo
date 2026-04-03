import { z } from "zod";

export const submitReportSchema = z.object({
  pages_sold: z.number().int().min(1, "Must sell at least 1 page"),
  amount: z.number().positive("Amount must be positive"),
  notes: z.string().max(500).optional(),
});

export type SubmitReportDto = z.infer<typeof submitReportSchema>;
