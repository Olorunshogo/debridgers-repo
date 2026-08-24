import {
  pgTable,
  pgEnum,
  serial,
  integer,
  text,
  timestamp,
  varchar,
  jsonb,
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
  "field", // Mode 1 - agent submits, Debridgers delivers
  "referral", // Mode 3 - buyer ordered via referral link
]);

export const paymentStatusEnum = pgEnum("payment_status", [
  "unpaid",
  "awaiting", // virtual account created, waiting for transfer
  "paid",
  "failed",
]);

export const orders = pgTable("orders", {
  id: serial().primaryKey().notNull(),
  order_reference: varchar("order_reference", { length: 30 })
    .unique()
    .notNull(), // ord_xxxxx format
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
  // Paystack invoice tracking
  paystack_invoice_code: varchar("paystack_invoice_code", { length: 100 }),
  // SafeHaven payment
  payment_status: paymentStatusEnum().notNull().default("unpaid"),
  payment_reference: varchar("payment_reference", { length: 100 }),
  virtual_account_number: varchar("virtual_account_number", { length: 20 }),
  virtual_account_bank: text(),
  virtual_account_account_name: text(),
  virtual_account_expires_at: timestamp(),
  paid_at: timestamp(),
  // Delivery verification by buyer admin
  delivery_verified_at: timestamp(),
  delivery_verified_by_admin_id: integer().references(() => users.id, {
    onDelete: "set null",
  }),
  delivery_proof_photos: jsonb(), // array of {url, caption}
  delivery_notes: text(),
  ...timestamps,
});

export const orderInsertSchema = createInsertSchema(orders);
