// apps/debridgers-backend/src/db/schema/products.schema.ts
import { pgTable, serial, text, integer, boolean } from "drizzle-orm/pg-core";
import { timestamps } from "../../helper/column.helper";

export const productsTable = pgTable("product", {
  // Keep singular
  id: serial().primaryKey().notNull(),
  name: text().notNull(),
  unit: text().notNull(),
  price_kobo: integer().notNull(),
  stock_quantity: integer().notNull().default(0),
  measure_value: text(),
  measure_unit: text(),
  weight_grams: integer(),
  category: text().default("Uncategorized").notNull(),
  category_id: integer(),
  description: text(),
  image_url: text(),
  is_active: boolean().notNull().default(true),
  sort_order: integer().notNull().default(0),
  ...timestamps,
});
