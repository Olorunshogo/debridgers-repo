import { pgTable, serial, integer, uniqueIndex } from "drizzle-orm/pg-core";
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
    ...timestamps,
  },
  (table) => [
    /*
     * One row per product per buyer. The sync does a full replace, and this
     * makes a duplicated line a database error rather than a silent double
     * charge.
     */
    uniqueIndex("cart_items_user_product_idx").on(
      table.user_id,
      table.product_id,
    ),
  ],
);

export const cartItemInsertSchema = createInsertSchema(cart_items);
