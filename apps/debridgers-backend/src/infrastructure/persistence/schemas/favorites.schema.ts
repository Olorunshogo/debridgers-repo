import { pgTable, serial, integer, uniqueIndex } from "drizzle-orm/pg-core";
import { timestamps } from "../../helper/column.helper";
import { users } from "./users.schema";
import { products } from "./products.schema";
import { createInsertSchema } from "drizzle-zod";

/*
 * Explicit bookmarks - the heart on a product card.
 *
 * Deliberately separate from "buy again", which is derived from order history
 * and needs no table. A favourite is a stated intention ("I want to find this
 * later"); a frequent purchase is an observed behaviour. Conflating them makes
 * both worse: the heart stops being predictable, and the rail stops reflecting
 * what the buyer actually buys.
 */
export const favorites = pgTable(
  "favorites",
  {
    id: serial().primaryKey().notNull(),
    user_id: integer()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    product_id: integer()
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    ...timestamps,
  },
  (table) => [
    // Favouriting twice is a no-op, not a second row
    uniqueIndex("favorites_user_product_idx").on(
      table.user_id,
      table.product_id,
    ),
  ],
);

export const favoriteInsertSchema = createInsertSchema(favorites);
