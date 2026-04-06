import { pgTable, serial, text, integer, boolean } from "drizzle-orm/pg-core";
import { timestamps } from "../../helper/column.helper";
import { createInsertSchema } from "drizzle-zod";

export const zones = pgTable("zones", {
  id: serial().primaryKey().notNull(),
  name: text().notNull(),
  description: text(),
  delivery_fee: integer().notNull(), // in kobo
  areas: text().array().notNull().default([]),
  is_active: boolean().notNull().default(true),
  ...timestamps,
});

export const zoneInsertSchema = createInsertSchema(zones);
