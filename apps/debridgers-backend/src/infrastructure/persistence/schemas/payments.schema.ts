import {
  pgTable,
  serial,
  integer,
  varchar,
  text,
  timestamp,
  pgEnum,
  index,
} from "drizzle-orm/pg-core";
import { orders } from "./orders.schema";

export const paymentTransactionStatusEnum = pgEnum(
  "payment_transaction_status",
  ["pending", "completed", "failed", "cancelled"],
);

export const payments = pgTable(
  "payments",
  {
    id: serial().primaryKey().notNull(),
    order_id: integer()
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    our_reference: varchar("our_reference", { length: 100 }),
    paystack_reference: varchar("paystack_reference", { length: 100 }),
    amount_kobo: integer().notNull(),
    status: paymentTransactionStatusEnum().notNull().default("pending"),
    payment_method: varchar({ length: 50 }).default("paystack"),
    paid_at: timestamp(),
    created_at: timestamp().defaultNow().notNull(),
    updated_at: timestamp().defaultNow().notNull(),
  },
  (table) => ({
    orderIdIndex: index().on(table.order_id),
    paystackRefIndex: index().on(table.paystack_reference),
    ourRefIndex: index().on(table.our_reference),
    statusIndex: index().on(table.status),
  }),
);

export type Payment = typeof payments.$inferSelect;
export type InsertPayment = typeof payments.$inferInsert;
