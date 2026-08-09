// apps/debridgers-backend/src/db/schema/products.schema.ts
import { pgTable, serial, text, integer, boolean } from "drizzle-orm/pg-core";
import { timestamps } from "../../helper/column.helper";
import { product_categories } from "./product_categories.schema";

export const productsTable = pgTable("product", {
  // Keep singular
  id: serial().primaryKey().notNull(),
  name: text().notNull(),
  unit: text().notNull(),
  price_kobo: integer().notNull(),
  stock_quantity: integer().notNull().default(0),
  measure_value: integer(),
  measure_unit: text(),
  weight_grams: integer(),
  category: text().default("Uncategorized").notNull(),
  /* Restricted, not cascade: deactivateCategory is a soft delete, so a cascade
     here would silently null the taxonomy on every product beneath it. */
  category_id: integer().references(() => product_categories.id, {
    onDelete: "restrict",
  }),
  description: text(),
  image_url: text(),
  is_active: boolean().notNull().default(true),
  sort_order: integer().notNull().default(0),
  ...timestamps,
});
