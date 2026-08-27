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

export const buyerWallets = pgTable(
  "buyer_wallets",
  {
    id: serial().primaryKey().notNull(),
    user_id: integer()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /* Kobo. See wallets.schema for why these are bigint. */
    available_balance: bigint({ mode: "number" }).notNull().default(0),
    pending_balance: bigint({ mode: "number" }).notNull().default(0),
    total_deposited: bigint({ mode: "number" }).notNull().default(0),
    paystack_customer_code: varchar({ length: 100 }), // CUS_xxxxx
    account_number: varchar({ length: 20 }), // DVA account number
    bank_name: varchar({ length: 100 }), // e.g., "Wema Bank"
    account_name: varchar({ length: 100 }), // e.g., "DEBRIDGERS/John Doe"
    /*
     * Withdrawal destination, distinct from the DVA above. The DVA is where
     * money comes IN; paying withdrawals back into it would just re-trigger a
     * deposit webhook and credit the wallet again, so the buyer nominates a
     * separate bank account to withdraw TO.
     */
    payout_bank_code: varchar({ length: 10 }),
    payout_bank_name: varchar({ length: 100 }),
    payout_account_number: varchar({ length: 20 }),
    payout_account_name: varchar({ length: 100 }),
    paystack_recipient_code: varchar({ length: 100 }), // RCP_xxxxx
    ...timestamps,
  },
  (table) => ({
    userIdUnique: unique().on(table.user_id),
  }),
);

export type BuyerWallet = typeof buyerWallets.$inferSelect;
export type InsertBuyerWallet = typeof buyerWallets.$inferInsert;
