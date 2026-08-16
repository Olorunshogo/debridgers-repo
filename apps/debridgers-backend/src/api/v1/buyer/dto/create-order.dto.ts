import { z } from "zod";

/*
 * Buyer checkout, step one: create the pending order. Step two is choosing a
 * payment method and calling POST /buyer/orders/:id/pay.
 *
 * Deliberately mirrors initializeOrderPaymentSchema. Prices are NOT taken from
 * this payload even though older clients send them: the price the admin set in
 * the products table is the only one that can be trusted, since a
 * client-supplied price lets anyone pay whatever they like. The price, name and
 * unit fields are accepted so existing clients keep working, then ignored.
 */
export const createOrderSchema = z.object({
  delivery_address: z.string().min(10),
  /* Chosen at checkout; falls back to the buyer's registered zone. */
  zone_id: z.number().int().positive().optional(),
  delivery_time: z.string(),
  notes: z.string().max(500).optional(),
  cart: z
    .array(
      z
        .object({
          product_id: z.number().int().positive(),
          // `quantity` is the cart-sync spelling; both normalise to qty below.
          qty: z.number().int().min(1).max(999).optional(),
          quantity: z.number().int().min(1).max(999).optional(),
          // Accepted for compatibility, re-derived server-side. Never trusted.
          name: z.string().optional(),
          unit: z.string().optional(),
          price_kobo: z.number().optional(),
        })
        .refine(
          (line) => line.qty !== undefined || line.quantity !== undefined,
          {
            message: "qty is required",
            path: ["qty"],
          },
        )
        .transform((line) => ({
          ...line,
          qty: (line.qty ?? line.quantity) as number,
        })),
    )
    .min(1, "Cart is empty"),
});

export type CreateOrderDto = z.infer<typeof createOrderSchema>;
