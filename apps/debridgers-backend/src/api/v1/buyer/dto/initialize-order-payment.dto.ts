import { z } from "zod";

/*
 * Buyer checkout. The client sends the cart it is holding; the server re-prices
 * every line from the products table before charging.
 *
 * Prices are deliberately NOT taken from this payload even though the frontend
 * sends them - trusting a client-supplied price lets anyone pay ₦1 for a bag of
 * rice. The incoming price fields are accepted so the existing frontend keeps
 * working, then ignored.
 *
 * `zone_id` is chosen at checkout and falls back to the buyer's registered zone.
 * `name`, `unit` and `price_kobo` are accepted for compatibility, re-derived server-side, and never trusted.
 */
export const initializeOrderPaymentSchema = z.object({
  delivery_address: z.string().min(5, "Delivery address is required"),
  zone_id: z.number().int().positive().optional(),
  delivery_time: z.enum(["today", "tomorrow"]).default("today"),
  notes: z.string().max(500).optional(),
  cart: z
    .array(
      z.object({
        product_id: z.number().int().positive(),
        qty: z.number().int().min(1).max(999),
        name: z.string().optional(),
        unit: z.string().optional(),
        price_kobo: z.number().optional(),
      }),
    )
    .min(1, "Cart is empty"),
});

export type InitializeOrderPaymentDto = z.infer<
  typeof initializeOrderPaymentSchema
>;
