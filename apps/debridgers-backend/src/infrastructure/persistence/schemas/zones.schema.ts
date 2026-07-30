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
