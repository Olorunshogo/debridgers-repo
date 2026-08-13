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
import { buyerWallets } from "./buyer_wallets.schema";

export const walletTransactionTypeEnum = pgEnum("wallet_transaction_type", [
  "deposit",
  "withdraw",
  "refund",
]);

export const walletTransactionStatusEnum = pgEnum("wallet_transaction_status", [
  "pending",
  "completed",
  "failed",
]);

export const walletTransactions = pgTable(
  "wallet_transactions",
  {
    id: serial().primaryKey().notNull(),
    wallet_id: integer()
      .notNull()
      .references(() => buyerWallets.id, { onDelete: "cascade" }),
    type: walletTransactionTypeEnum().notNull(),
    amount: integer().notNull(),
    status: walletTransactionStatusEnum().notNull(),
    reference: varchar({ length: 255 }),
    description: text(),
    created_at: timestamp().defaultNow().notNull(),
  },
  (table) => ({
    walletIdIndex: index().on(table.wallet_id),
    statusIndex: index().on(table.status),
    createdAtIndex: index().on(table.created_at),
    referenceUnique: unique().on(table.reference),
  }),
);

export type WalletTransaction = typeof walletTransactions.$inferSelect;
export type InsertWalletTransaction = typeof walletTransactions.$inferInsert;
