import { z } from "zod";

export const remitStockSchema = z.object({
  stock_request_id: z.number().int().positive(),
  amount_remitted: z.number().int().positive("Amount must be in kobo"),
});

export type RemitStockDto = z.infer<typeof remitStockSchema>;
