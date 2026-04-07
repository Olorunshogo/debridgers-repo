import {
  pgTable,
  pgEnum,
  serial,
  integer,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { timestamps } from "../../helper/column.helper";
import { users } from "./users.schema";
import { zones } from "./zones.schema";
import { riders } from "./riders.schema";
import { createInsertSchema } from "drizzle-zod";

export const orderStatusEnum = pgEnum("order_status", [
  "pending",
  "confirmed",
  "out_for_delivery",
  "delivered",
  "cancelled",
]);

export const orderModeEnum = pgEnum("order_mode", [
  "field", // Mode 1 — agent submits, Debridgers delivers
  "referral", // Mode 3 — buyer ordered via referral link
]);

export const orders = pgTable("orders", {
  id: serial().primaryKey().notNull(),
  buyer_id: integer()
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  agent_id: integer().references(() => users.id, { onDelete: "set null" }),
  zone_id: integer()
    .notNull()
    .references(() => zones.id, { onDelete: "restrict" }),
  rider_id: integer().references(() => riders.id, { onDelete: "set null" }),
  quantity: integer().notNull(),
  unit_price: integer().notNull().default(140000), // ₦1,400 in kobo
  handling_fee: integer().notNull().default(10000), // ₦100 in kobo
  delivery_fee: integer().notNull(), // from zone, in kobo
  total_amount: integer().notNull(),
  order_mode: orderModeEnum().notNull(),
  status: orderStatusEnum().notNull().default("pending"),
  delivery_address: text().notNull(),
  cancellation_reason: text(),
  notes: text(),
  delivered_at: timestamp(),
  ...timestamps,
});

export const orderInsertSchema = createInsertSchema(orders);
