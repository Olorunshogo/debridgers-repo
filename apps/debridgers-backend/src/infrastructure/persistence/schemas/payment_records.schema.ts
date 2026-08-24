import {
  pgTable,
  serial,
  integer,
  varchar,
  text,
  timestamp,
  pgEnum,
  index,
  unique,
} from "drizzle-orm/pg-core";
import { orders } from "./orders.schema";
import { users } from "./users.schema";

export const paymentMethodEnum = pgEnum("payment_method", [
  "wallet",
  "card",
  "transfer",
  "ussd",
]);

export const paymentRecordStatusEnum = pgEnum("payment_record_status", [
  "initiated",
  "pending",
  "completed",
  "failed",
  "reversed",
]);

export const paymentRecords = pgTable(
  "payment_records",
  {
    id: serial().primaryKey().notNull(),
    order_id: integer()
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    buyer_id: integer()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    amount_kobo: integer().notNull(),
    payment_method: paymentMethodEnum().notNull(),
    status: paymentRecordStatusEnum().notNull().default("initiated"),
    paystack_reference: varchar({ length: 100 }), // Paystack transfer/charge reference
    paystack_transfer_code: varchar({ length: 100 }), // Paystack transfer code
    paystack_receipt_number: varchar({ length: 100 }), // Paystack receipt
    description: text(),
    created_at: timestamp().defaultNow().notNull(),
    completed_at: timestamp(),
  },
  (table) => ({
    orderIdIndex: index().on(table.order_id),
    buyerIdIndex: index().on(table.buyer_id),
    paystackReferenceIndex: index().on(table.paystack_reference),
    statusIndex: index().on(table.status),
    createdAtIndex: index().on(table.created_at),
    paystackRefUnique: unique().on(table.paystack_reference),
  }),
);

export type PaymentRecord = typeof paymentRecords.$inferSelect;
export type InsertPaymentRecord = typeof paymentRecords.$inferInsert;
