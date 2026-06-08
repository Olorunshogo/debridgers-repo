import { z } from "zod";

export const stockRequestSchema = z.object({
  product_id: z.number().int().positive("Product is required"),
  quantity: z.number().int().positive("Quantity must be a positive integer"),
});

export type StockRequestDto = z.infer<typeof stockRequestSchema>;
