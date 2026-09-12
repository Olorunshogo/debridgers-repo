import { pgTable, serial, text, integer, boolean } from "drizzle-orm/pg-core";
import { timestamps } from "../../helper/column.helper";
import { createInsertSchema } from "drizzle-zod";

/*
 * One row per Kaduna LGA.
 * `distance_km` is the LGA's road distance from the Narayi warehouse.
 * The delivery fee is never stored, only computed live from it via `computeDeliveryFee` in `@debridgers/pricing`, so a formula change takes effect everywhere at once instead of needing every row rewritten.
 * `free_delivery` is a standing policy for this zone specifically, separate from the global `free_delivery_until` promo in system_settings, which is a time-boxed campaign across everywhere.
 * Either being true makes delivery free; the full price is still computed so the UI can show it struck through.
 */
export const zones = pgTable("zones", {
  id: serial().primaryKey().notNull(),
  name: text().notNull(),
  description: text(),
  distance_km: integer().notNull(),
  areas: text().array().notNull().default([]),
  free_delivery: boolean().notNull().default(false),
  is_active: boolean().notNull().default(true),
  ...timestamps,
});

export const zoneInsertSchema = createInsertSchema(zones);
