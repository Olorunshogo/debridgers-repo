import { z } from "zod";

/*
 * distance_km is the LGA's road distance from the Narayi warehouse; the
 * delivery fee is computed live from it via computeDeliveryFee in
 * @debridgers/pricing, never stored.
 * free_delivery is a standing policy for this area, not a campaign. It wins independently of any promotion window.
 * A permanently free zone does not start charging when a campaign ends.
 */
const zoneFields = {
  name: z.string().min(2, "Zone name required"),
  description: z.string().max(500).nullish(),
  distance_km: z.number().int().nonnegative(),
  areas: z.array(z.string().min(1)).default([]),
  free_delivery: z.boolean().default(false),
  is_active: z.boolean().default(true),
};

export const createZoneSchema = z.object(zoneFields);

export type CreateZoneDto = z.infer<typeof createZoneSchema>;

/* Partial, so a correction to one field does not require restating the rest. */
export const updateZoneSchema = z.object(zoneFields).partial();

export type UpdateZoneDto = z.infer<typeof updateZoneSchema>;
