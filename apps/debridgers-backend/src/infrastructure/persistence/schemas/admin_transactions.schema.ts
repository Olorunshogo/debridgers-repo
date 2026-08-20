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
import { adminAccounts } from "./admin_accounts.schema";

export const adminTransactionTypeEnum = pgEnum("admin_transaction_type", [
  "order_payment", // User paid for order with wallet
  "vendor_payout", // Platform paid vendor/agent
  "refund", // Refund to user
  "manual_adjustment",
  "platform_fee",
]);

export const adminTransactionStatusEnum = pgEnum("admin_transaction_status", [
  "completed",
  "pending",
  "failed",
  "reversed",
]);

export const adminTransactions = pgTable(
  "admin_transactions",
  {
    id: serial().primaryKey().notNull(),
    admin_account_id: integer()
      .notNull()
      .references(() => adminAccounts.id, { onDelete: "restrict" }),
    type: adminTransactionTypeEnum().notNull(),
    amount: integer().notNull(), // in kobo
    status: adminTransactionStatusEnum().notNull().default("completed"),
    reference: varchar({ length: 100 }), // order ID, payment reference, etc.
    description: text(),
    related_user_id: integer(), // who initiated this (buyer, vendor, admin)
    created_at: timestamp().defaultNow().notNull(),
  },
  (table) => ({
    adminAccountIdIndex: index().on(table.admin_account_id),
    typeIndex: index().on(table.type),
    statusIndex: index().on(table.status),
    referenceIndex: index().on(table.reference),
    createdAtIndex: index().on(table.created_at),
  }),
);

export type AdminTransaction = typeof adminTransactions.$inferSelect;
export type InsertAdminTransaction = typeof adminTransactions.$inferInsert;
