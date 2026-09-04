import { z } from "zod";

/*
 * The one invariant that survives every rate change: packages 7 and up must
 * cost less each than packages 3 to 6. The cost of a delivery is the trip, not
 * the bag, so a flat or inverted schedule over-charges exactly the large B2B
 * order the business depends on. A flat taper has shipped once already and cost
 * real money, so it is refused here rather than only warned about in the UI.
 */
const taperDescends = <T extends { tier_one: number; tier_two: number }>(
  value: T,
): boolean => value.tier_two < value.tier_one;

const TAPER_MESSAGE =
  "Tier two must be strictly below tier one. A flat or inverted taper over-charges large orders.";

const zoneFields = {
  name: z.string().min(2, "Zone name required"),
  description: z.string().max(500).nullish(),
  /** Base fee covering the first two packages, in kobo. */
  delivery_fee: z.number().int().nonnegative(),
  areas: z.array(z.string().min(1)).default([]),
  /** Charged per package for packages 3 to 6, in kobo. */
  tier_one_per_package_kobo: z.number().int().nonnegative(),
  /** Charged per package for package 7 and beyond, in kobo. */
  tier_two_per_package_kobo: z.number().int().nonnegative(),
  /** Absolute ceiling on the delivery fee for this zone, in kobo. */
  delivery_cap_kobo: z.number().int().positive(),
  /* Standing policy for this area, not a campaign. It wins independently of
     any promotion window, so a permanently free zone does not start charging
     when a campaign ends. */
  free_delivery: z.boolean().default(false),
  is_active: z.boolean().default(true),
};

export const createZoneSchema = z.object(zoneFields).refine(
  (value) =>
    taperDescends({
      tier_one: value.tier_one_per_package_kobo,
      tier_two: value.tier_two_per_package_kobo,
    }),
  { message: TAPER_MESSAGE, path: ["tier_two_per_package_kobo"] },
);

export type CreateZoneDto = z.infer<typeof createZoneSchema>;

/*
 * Partial, so a correction to one rate does not require restating the rest.
 * The taper invariant is re-checked against the stored row in the service,
 * because a patch carrying only one of the two rates cannot be judged here.
 */
export const updateZoneSchema = z
  .object(zoneFields)
  .partial()
  .refine(
    (value) =>
      value.tier_one_per_package_kobo === undefined ||
      value.tier_two_per_package_kobo === undefined ||
      taperDescends({
        tier_one: value.tier_one_per_package_kobo,
        tier_two: value.tier_two_per_package_kobo,
      }),
    { message: TAPER_MESSAGE, path: ["tier_two_per_package_kobo"] },
  );

export type UpdateZoneDto = z.infer<typeof updateZoneSchema>;

export { TAPER_MESSAGE };
