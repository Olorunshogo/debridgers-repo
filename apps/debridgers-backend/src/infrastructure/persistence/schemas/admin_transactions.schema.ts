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

/* order_payment: user paid for an order with wallet. vendor_payout: platform paid a vendor/agent. refund: refund to a user. */
export const adminTransactionTypeEnum = pgEnum("admin_transaction_type", [
  "order_payment",
  "vendor_payout",
  "refund",
  "manual_adjustment",
  "platform_fee",
]);

export const adminTransactionStatusEnum = pgEnum("admin_transaction_status", [
  "completed",
  "pending",
  "failed",
  "reversed",
]);

/* `amount` is kobo. `reference` is an order id, payment reference, or similar. `related_user_id` is whoever initiated the transaction. */
export const adminTransactions = pgTable(
  "admin_transactions",
  {
    id: serial().primaryKey().notNull(),
    admin_account_id: integer()
      .notNull()
      .references(() => adminAccounts.id, { onDelete: "restrict" }),
    type: adminTransactionTypeEnum().notNull(),
    amount: integer().notNull(),
    status: adminTransactionStatusEnum().notNull().default("completed"),
    reference: varchar({ length: 100 }),
    description: text(),
    related_user_id: integer(),
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
