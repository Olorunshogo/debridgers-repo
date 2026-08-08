import { pgTable, serial, text, integer, boolean } from "drizzle-orm/pg-core";
import { timestamps } from "../../helper/column.helper";

export const simple_products = pgTable("simple_products", {
  id: serial().primaryKey().notNull(),
  name: text().notNull(),
  unit: text().notNull(),
  price_kobo: integer().notNull(),
  description: text(),
  image_url: text(),
  is_active: boolean().notNull().default(true),
  sort_order: integer().notNull().default(0),
  ...timestamps,
});
