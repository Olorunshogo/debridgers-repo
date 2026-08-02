import { z } from "zod";

export const createVirtualAccountSchema = z.object({
  order_id: z.number().int().positive("Order ID required"),
  amount: z.number().positive("Amount in kobo required"),
  valid_for_seconds: z.number().int().min(300).max(86400).default(3600),
});

export type CreateVirtualAccountDto = z.infer<
  typeof createVirtualAccountSchema
>;
