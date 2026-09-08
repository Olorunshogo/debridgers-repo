import {
  pgTable,
  serial,
  integer,
  bigint,
  unique,
  varchar,
} from "drizzle-orm/pg-core";
import { timestamps } from "../../helper/column.helper";
import { users } from "./users.schema";

/*
 * Balances are kobo; see wallets.schema for why they are bigint.
 * `account_number`, `bank_name` and `account_name` describe the DVA that money comes in through.
 * `payout_bank_code`, `payout_bank_name`, `payout_account_number` and `payout_account_name` are a separate, buyer-nominated withdrawal destination: paying a withdrawal back into the DVA would just re-trigger a deposit webhook and credit the wallet again.
 */
export const buyerWallets = pgTable(
  "buyer_wallets",
  {
    id: serial().primaryKey().notNull(),
    user_id: integer()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    available_balance: bigint({ mode: "number" }).notNull().default(0),
    pending_balance: bigint({ mode: "number" }).notNull().default(0),
    total_deposited: bigint({ mode: "number" }).notNull().default(0),
    paystack_customer_code: varchar({ length: 100 }),
    account_number: varchar({ length: 20 }),
    bank_name: varchar({ length: 100 }),
    account_name: varchar({ length: 100 }),
    payout_bank_code: varchar({ length: 10 }),
    payout_bank_name: varchar({ length: 100 }),
    payout_account_number: varchar({ length: 20 }),
    payout_account_name: varchar({ length: 100 }),
    paystack_recipient_code: varchar({ length: 100 }),
    ...timestamps,
  },
  (table) => ({
    userIdUnique: unique().on(table.user_id),
  }),
);

export type BuyerWallet = typeof buyerWallets.$inferSelect;
export type InsertBuyerWallet = typeof buyerWallets.$inferInsert;
