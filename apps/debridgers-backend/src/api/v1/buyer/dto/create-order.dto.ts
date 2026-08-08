import { z } from "zod";

export const createOrderSchema = z.object({
  delivery_address: z.string().min(10),
  zone_id: z.number().int().positive(),
  delivery_time: z.string(),
  cart: z.array(
    z.object({
      product_id: z.number().int().positive(),
      name: z.string(),
      price_kobo: z.number().int().positive(),
      unit: z.string(),
      qty: z.number().int().positive(),
    }),
  ),
});

export type CreateOrderDto = z.infer<typeof createOrderSchema>;
