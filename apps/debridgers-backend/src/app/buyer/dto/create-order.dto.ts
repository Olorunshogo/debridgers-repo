import { z } from "zod";

export const createOrderSchema = z.object({
  quantity: z.number().int().positive(),
  total_amount_kobo: z.number().int().positive(),
  delivery_address: z.string().min(1).max(500),
  notes: z.string().max(500).optional(),
});

export type CreateOrderDto = z.infer<typeof createOrderSchema>;
