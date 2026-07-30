import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  AnyPgColumn,
} from "drizzle-orm/pg-core";
import { timestamps } from "../../helper/column.helper";
import { createInsertSchema } from "drizzle-zod";

/*
 * The product taxonomy: Category -> Type -> Variety.
 *
 * One self-referencing table rather than three fixed ones, because the real
 * catalogue is not uniformly three levels deep:
 *
 *   Grains -> Rice   -> Ofada, Long Grain, Tuwo   (3 levels)
 *   Oil    -> Palm Oil                             (2 levels)
 *
 * A rigid category/type/variety triple would force an invented middle row for
 * Oil just to reach its leaves. `parent_id` lets each branch be exactly as deep
 * as it needs to be, and the agent stock drill-down walks whatever depth it
 * finds instead of assuming three.
 *
 * `products.category_id` points at a LEAF of this tree. The older
 * `products.category` text column is left in place and still written, so
 * anything reading it keeps working while the two coexist.
 */
export const product_categories = pgTable("product_categories", {
  id: serial().primaryKey().notNull(),
  name: text().notNull(),
  /* Stable, URL-safe key. Unique per parent, not globally - "White" is a valid
     variety under both Garri and Beans. */
  slug: text().notNull(),
  /* Null means this is a top-level category. */
  parent_id: integer().references((): AnyPgColumn => product_categories.id, {
    onDelete: "cascade",
  }),
  description: text(),
  /*
   * Images matter most at variety level: Wake Gida does not look like cowpea,
   * and Ofada does not look like long grain. A buyer picking by photo needs the
   * leaf image, not the category's.
   */
  image_url: text(),
  sort_order: integer().notNull().default(0),
  is_active: boolean().notNull().default(true),
  ...timestamps,
});

export const productCategoryInsertSchema =
  createInsertSchema(product_categories);
