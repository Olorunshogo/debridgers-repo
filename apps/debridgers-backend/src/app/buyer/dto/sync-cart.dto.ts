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
export const cartLineSchema = z.object({
  product_id: z.number().int().positive(),
  quantity: z.number().int().min(1).max(999),
});

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
