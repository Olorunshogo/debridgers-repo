import {
  pgTable,
  serial,
  integer,
  text,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { timestamps } from "../../helper/column.helper";
import { users } from "./users.schema";
import { productsTable } from "./product.schema";
import { createInsertSchema } from "drizzle-zod";

/*
 * The server-side cart, one per buyer.
 *
 * The client keeps the authoritative copy in localStorage while browsing, so
 * this exists for cross-device continuity, not as the live working copy. It is
 * written by a debounced sync once the user is authenticated, and merged into
 * on login. There is deliberately no guest cart: an anonymous cart has no owner
 * to key on, and localStorage already covers same-device continuity.
 */
export const cart_items = pgTable(
  "cart_items",
  {
    id: serial().primaryKey().notNull(),
    user_id: integer()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    product_id: integer()
      .notNull()
      .references(() => productsTable.id, { onDelete: "cascade" }),
    quantity: integer().notNull().default(1),
    /*
     * "package" (a whole bag/keg, priced from product.price_kobo directly) or
     * "measure" (a retail sub-package quantity, priced as a fraction of it).
     * Defaults to "package" so every row written before this column existed
     * still means exactly what it always meant.
     */
    unit_mode: text().notNull().default("package"),
    ...timestamps,
  },
  (table) => [
    /*
     * One row per product per buyer per unit mode, so a buyer can carry both
     * a whole-bag line and a measure line of the same product at once. The
     * sync does a full replace, and this makes a duplicated line a database
     * error rather than a silent double charge.
     */
    uniqueIndex("cart_items_user_product_mode_idx").on(
      table.user_id,
      table.product_id,
      table.unit_mode,
    ),
  ],
);

export const cartItemInsertSchema = createInsertSchema(cart_items);
