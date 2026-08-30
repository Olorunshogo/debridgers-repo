import { pgTable, serial, text, integer, boolean } from "drizzle-orm/pg-core";
import { timestamps } from "../../helper/column.helper";
import { createInsertSchema } from "drizzle-zod";

export const zones = pgTable("zones", {
  id: serial().primaryKey().notNull(),
  name: text().notNull(),
  description: text(),
  delivery_fee: integer().notNull(), // in kobo
  areas: text().array().notNull().default([]),
  /*
   * The taper and ceiling for this zone. Distance changes what a marginal
   * package costs, not only what the trip costs, so a single set of rates for
   * every zone under-charged the far ones on packages 3 and up.
   *
   * Defaults are the Kaduna South figures, which is what every zone was
   * effectively priced at before these columns existed.
   */
  /** Charged per package for packages 3 to 6, in kobo. */
  tier_one_per_package_kobo: integer().notNull().default(70000),
  /** Charged per package for package 7 and beyond, in kobo. */
  tier_two_per_package_kobo: integer().notNull().default(40000),
  /** Absolute ceiling on the delivery fee for this zone, in kobo. */
  delivery_cap_kobo: integer().notNull().default(1000000),
  /*
   * Free delivery for this zone specifically. Separate from the global
   * `free_delivery_until` promo in system_settings: that is a time-boxed
   * campaign across everywhere, this is a standing policy for one area - a zone
   * close to the depot, or one being pushed to win share.
   *
   * Either being true makes delivery free; the full price is still computed so
   * the UI can show it struck through.
   */
  free_delivery: boolean().notNull().default(false),
  is_active: boolean().notNull().default(true),
  ...timestamps,
});

export const zoneInsertSchema = createInsertSchema(zones);
