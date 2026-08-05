import { z } from "zod";

export const initiateRefundSchema = z.object({
  order_id: z.number().int().positive("Order ID must be a positive integer"),
  reason: z.string().min(5, "Reason must be at least 5 characters").max(255),
});

export type InitiateRefundDto = z.infer<typeof initiateRefundSchema>;
