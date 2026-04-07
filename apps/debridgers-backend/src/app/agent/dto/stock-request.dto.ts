import { z } from "zod";

export const stockRequestSchema = z.object({
  quantity: z.number().int().positive("Quantity must be a positive integer"),
});

export type StockRequestDto = z.infer<typeof stockRequestSchema>;
