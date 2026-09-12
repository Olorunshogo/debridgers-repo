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
import { wallets } from "./wallets.schema";

/*
 * Mirrors wallet_transactions (the buyer side) for the agent wallet.
 * credit: AgentWalletService.credit - a commission landing in pending or available.
 * confirm: AgentWalletService.confirmPending - a commission moving pending -> available.
 * debit: AgentWalletService.debit - a withdrawal request taken out of available.
 * refund: AgentWalletService.refundAvailable - a rejected/failed withdrawal returned to available.
 * reversal: AgentWalletService.reverseCredit - a commission clawed back after a refund or dispute.
 */
export const agentWalletTransactionTypeEnum = pgEnum(
  "agent_wallet_transaction_type",
  ["credit", "confirm", "debit", "refund", "reversal"],
);

export const agentWalletTransactionStatusEnum = pgEnum(
  "agent_wallet_transaction_status",
  ["pending", "completed", "failed"],
);

export const agentWalletTransactions = pgTable(
  "agent_wallet_transactions",
  {
    id: serial().primaryKey().notNull(),
    wallet_id: integer()
      .notNull()
      .references(() => wallets.id, { onDelete: "cascade" }),
    type: agentWalletTransactionTypeEnum().notNull(),
    amount: integer().notNull(),
    status: agentWalletTransactionStatusEnum().notNull().default("completed"),
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

export type AgentWalletTransaction =
  typeof agentWalletTransactions.$inferSelect;
export type InsertAgentWalletTransaction =
  typeof agentWalletTransactions.$inferInsert;
