import { z } from "zod";

/*
 * Prices a basket without creating an order, so the checkout summary can show
 * delivery and handling before the buyer commits.
 */
export const quoteCartSchema = z.object({
  /* Where it is going. Omitted falls back to the buyer's registered zone. */
  zone_id: z.number().int().positive().optional(),
  cart: z
    .array(
      z.object({
        product_id: z.number().int().positive(),
        qty: z.number().int().min(1).max(999),
      }),
    )
    .min(1, "Cart is empty"),
});

export type QuoteCartDto = z.infer<typeof quoteCartSchema>;
