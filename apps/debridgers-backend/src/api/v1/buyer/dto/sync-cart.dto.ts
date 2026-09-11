import { z } from "zod";

/*
 * The client sends its whole cart, not a delta.
 *
 * A full replace is the right shape here because localStorage is the source of
 * truth while browsing: the server is catching up to a known state, not
 * applying incremental operations that could arrive out of order from two
 * devices. It also makes the sync idempotent, which matters for a debounced
 * writer that may retry.
 */
/*
 * Accepts either spelling. The order endpoints take `qty` and cart sync takes
 * `quantity`, so a caller that gets it the wrong way round used to see a
 * rejection with nothing pointing at the cause. Both normalise to `quantity`
 * here, which keeps every existing client working.
 */
export const cartLineSchema = z
  .object({
    product_id: z.number().int().positive(),
    quantity: z.number().int().min(1).max(999).optional(),
    qty: z.number().int().min(1).max(999).optional(),
    unit_mode: z.enum(["package", "measure"]).optional(),
  })
  .refine((line) => line.quantity !== undefined || line.qty !== undefined, {
    message: "quantity is required",
    path: ["quantity"],
  })
  .transform((line) => ({
    product_id: line.product_id,
    quantity: (line.quantity ?? line.qty) as number,
    unit_mode: line.unit_mode ?? "package",
  }));

export const syncCartSchema = z.object({
  items: z.array(cartLineSchema).max(200),
});

export type CartLineDto = z.infer<typeof cartLineSchema>;
export type SyncCartDto = z.infer<typeof syncCartSchema>;

/*
 * Merge takes the higher quantity per line rather than summing.
 *
 * Summing is how someone who added two bags of rice on their phone and one on
 * their laptop ends up buying three. Max preserves intent from both devices
 * without inventing quantity the buyer never asked for.
 */
export const mergeCartSchema = syncCartSchema;
export type MergeCartDto = SyncCartDto;
