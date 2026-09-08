import { pgTable, serial, text, integer, boolean } from "drizzle-orm/pg-core";
import { timestamps } from "../../helper/column.helper";
import { createInsertSchema } from "drizzle-zod";

/*
 * `delivery_fee` is kobo.
 * `tier_one_per_package_kobo` (packages 3 to 6) and `tier_two_per_package_kobo` (package 7 and beyond) are the taper for this zone, in kobo; `delivery_cap_kobo` is the absolute ceiling.
 * Distance changes what a marginal package costs, not only what the trip costs, so a single set of rates for every zone under-charged the far ones on packages 3 and up.
 * Defaults are the Kaduna South figures, which is what every zone was effectively priced at before these columns existed.
 * `free_delivery` is a standing policy for this zone specifically, separate from the global `free_delivery_until` promo in system_settings, which is a time-boxed campaign across everywhere.
 * Either being true makes delivery free; the full price is still computed so the UI can show it struck through.
 */
export const zones = pgTable("zones", {
  id: serial().primaryKey().notNull(),
  name: text().notNull(),
  description: text(),
  delivery_fee: integer().notNull(),
  areas: text().array().notNull().default([]),
  tier_one_per_package_kobo: integer().notNull().default(70000),
  tier_two_per_package_kobo: integer().notNull().default(40000),
  delivery_cap_kobo: integer().notNull().default(1000000),
  free_delivery: boolean().notNull().default(false),
  is_active: boolean().notNull().default(true),
  ...timestamps,
});

export const zoneInsertSchema = createInsertSchema(zones);
