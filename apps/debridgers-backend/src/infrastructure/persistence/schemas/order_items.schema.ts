import { pgTable, serial, integer, text, index } from "drizzle-orm/pg-core";
import { timestamps } from "../../helper/column.helper";
import { orders } from "./orders.schema";
import { productsTable } from "./product.schema";
import { createInsertSchema } from "drizzle-zod";

/*
 * Line items for an order.
 *
 * Until this existed, `orders` could not record WHAT was bought: it has a
 * quantity, a unit_price and a total, but no product reference at all. That was
 * workable for the single-product field flow and made a multi-product buyer
 * cart impossible to store, which is why buyer checkout was never built.
 *
 * `unit_price_kobo` is captured per line at purchase time rather than read from
 * products - a price change must never rewrite what someone already paid.
 *
 * `product_id` restricts, not cascades, on delete: deleting a product must not silently erase the history of orders that contained it.
 * `order_items_product_idx` also serves buy-again, which groups by product across a buyer's history.
 */
export const order_items = pgTable(
  "order_items",
  {
    id: serial().primaryKey().notNull(),
    order_id: integer()
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    product_id: integer()
      .notNull()
      .references(() => productsTable.id, { onDelete: "restrict" }),
    quantity: integer().notNull(),
    unit_price_kobo: integer().notNull(),
    /*
     * "package" or "measure", carried onto the line so the order history
     * can still show what was actually bought after a cart line is gone.
     * Defaults to "package" so every existing row still means what it did.
     */
    unit_mode: text().notNull().default("package"),
    ...timestamps,
  },
  (table) => [
    index("order_items_order_idx").on(table.order_id),
    index("order_items_product_idx").on(table.product_id),
  ],
);

export const orderItemInsertSchema = createInsertSchema(order_items);
