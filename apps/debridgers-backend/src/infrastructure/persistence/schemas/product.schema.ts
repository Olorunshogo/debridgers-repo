import { pgTable, serial, text, integer, boolean } from "drizzle-orm/pg-core";
import { timestamps } from "../../helper/column.helper";
import { product_categories } from "./product_categories.schema";

/*
 * The catalogue. Prices live here and nowhere else: checkout re-reads price_kobo from this table on every order, so a price the client sends is always discarded.
 * The table name is kept singular ("product"), unlike the rest of the schema.
 *
 * category_id restricts on delete rather than cascading, because deactivateCategory is a soft delete and a cascade would silently null the taxonomy on every product beneath a category an admin only meant to hide.
 */
export const productsTable = pgTable("product", {
  id: serial().primaryKey().notNull(),
  name: text().notNull(),
  unit: text().notNull(),
  price_kobo: integer().notNull(),
  stock_quantity: integer().notNull().default(0),
  measure_value: integer(),
  measure_unit: text(),
  weight_grams: integer(),
  category: text().default("Uncategorized").notNull(),
  category_id: integer().references(() => product_categories.id, {
    onDelete: "restrict",
  }),
  description: text(),
  image_url: text(),
  is_active: boolean().notNull().default(true),
  sort_order: integer().notNull().default(0),
  ...timestamps,
});
