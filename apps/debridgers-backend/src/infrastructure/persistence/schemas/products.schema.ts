import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  pgEnum,
} from "drizzle-orm/pg-core";
import { timestamps } from "../../helper/column.helper";
import { createInsertSchema } from "drizzle-zod";
import { product_categories } from "./product_categories.schema";

/*
 * How a product is sold. Structured rather than free text so it can be
 * displayed, filtered and unit-priced, instead of being parsed out of a string
 * like "25 litre keg".
 */
export const measureUnitEnum = pgEnum("measure_unit", ["kg", "litre", "piece"]);

export const products = pgTable("products", {
  id: serial().primaryKey().notNull(),
  name: text().notNull(),
  /* Human-readable pack size shown to buyers, e.g. "50kg bag", "25 litre keg". */
  unit: text().notNull(),
  price_kobo: integer().notNull(),
  /*
   * The quantity and unit one package contains: 50 kg, 25 litre, 100 piece.
   * `unit` above stays as the display label ("50kg bag") because that is what
   * buyers read; these two are the data behind it.
   */
  measure_value: integer().notNull().default(0),
  measure_unit: measureUnitEnum().notNull().default("kg"),
  /*
   * DEPRECATED. Superseded by measure_value/measure_unit once delivery moved to
   * per-package pricing, which needs no mass. Left in place so the schema diff
   * stays additive; drop it in a dedicated migration once nothing reads it.
   */
  weight_grams: integer().notNull().default(0),
  /*
   * Merchandising category: Rice, Beans, Garri, Oil, Tubers.
   *
   * Plain text with the allowed values held in a shared constant, rather than a
   * pgEnum - adding a category should not need a migration. Nullable so
   * existing rows stay valid and uncategorised products simply do not appear
   * under a filter.
   *
   * This exists because `description` was doing triple duty as the badge, the
   * blurb AND the category filter, which made every filter chip match exactly
   * one product.
   */
  category: text(),
  /*
   * Leaf of the product_categories tree this product sells as.
   *
   * Supersedes `category` above, which could only ever express one flat level
   * and so could not describe "Grains > Rice > Ofada". Nullable during the
   * transition: existing rows are backfilled by matching their `category` text,
   * and anything unmatched simply has no taxonomy yet rather than a wrong one.
   */
  category_id: integer().references(() => product_categories.id, {
    onDelete: "set null",
  }),
  description: text(),
  image_url: text(),
  is_active: boolean().notNull().default(true),
  sort_order: integer().notNull().default(0),
  ...timestamps,
});

export const productInsertSchema = createInsertSchema(products);
