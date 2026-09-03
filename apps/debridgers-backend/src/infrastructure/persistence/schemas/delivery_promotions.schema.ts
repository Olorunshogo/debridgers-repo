import {
  pgTable,
  pgEnum,
  serial,
  integer,
  text,
  boolean,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { timestamps } from "../../helper/column.helper";
import { users } from "./users.schema";
import { zones } from "./zones.schema";
import { createInsertSchema } from "drizzle-zod";

/*
 * How wide a free-delivery campaign reaches.
 *
 * `first_order` is per buyer rather than per order, so it fires once and then
 * stops for that buyer regardless of how long the window is still open.
 */
export const deliveryPromotionScopeEnum = pgEnum("delivery_promotion_scope", [
  "global",
  "zone",
  "first_order",
]);

/*
 * A time-boxed free-delivery campaign.
 *
 * This replaces the `free_delivery_until` key in system_settings, which could
 * not express a window with two ends, could not be scoped to a zone or to a
 * buyer's first order, and could not be joined to the orders it discounted, so
 * a campaign's cost was unrecoverable once it had ended.
 *
 * `zones.free_delivery` is a different thing and is not superseded: that is
 * standing policy for one area and wins independently of any window here, so
 * a permanently free area does not start charging when a campaign ends.
 */
export const deliveryPromotions = pgTable(
  "delivery_promotions",
  {
    id: serial().primaryKey().notNull(),
    name: text().notNull(),
    scope: deliveryPromotionScopeEnum().notNull().default("global"),
    /** Null unless scope is `zone`. */
    zone_id: integer().references(() => zones.id, { onDelete: "cascade" }),
    starts_at: timestamp().notNull(),
    ends_at: timestamp().notNull(),
    /*
     * The kill switch. A campaign ends by itself at `ends_at`; this is how an
     * admin ends one early without losing the window it actually ran for.
     */
    is_active: boolean().notNull().default(true),
    created_by_admin_id: integer().references(() => users.id, {
      onDelete: "set null",
    }),
    ...timestamps,
  },
  (table) => ({
    /* Resolution runs on the checkout path, once per quote. */
    activeWindowIndex: index().on(table.is_active, table.starts_at),
    zoneIndex: index().on(table.zone_id),
  }),
);

export const deliveryPromotionInsertSchema =
  createInsertSchema(deliveryPromotions);

export type DeliveryPromotion = typeof deliveryPromotions.$inferSelect;
export type InsertDeliveryPromotion = typeof deliveryPromotions.$inferInsert;
