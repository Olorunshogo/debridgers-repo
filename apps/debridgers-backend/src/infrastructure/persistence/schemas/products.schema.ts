import { pgTable, serial, text, integer, boolean } from "drizzle-orm/pg-core";
import { timestamps } from "../../helper/column.helper";
import { createInsertSchema } from "drizzle-zod";

export const products = pgTable("products", {
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

export const productInsertSchema = createInsertSchema(products);
