import { pgTable, serial, integer, unique, varchar } from "drizzle-orm/pg-core";
import { timestamps } from "../../helper/column.helper";
import { users } from "./users.schema";

export const buyerWallets = pgTable(
  "buyer_wallets",
  {
    id: serial().primaryKey().notNull(),
    user_id: integer()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    available_balance: integer().notNull().default(0),
    pending_balance: integer().notNull().default(0),
    total_deposited: integer().notNull().default(0),
    paystack_customer_code: varchar({ length: 100 }), // CUS_xxxxx
    account_number: varchar({ length: 20 }), // DVA account number
    bank_name: varchar({ length: 100 }), // e.g., "Wema Bank"
    account_name: varchar({ length: 100 }), // e.g., "DEBRIDGERS/John Doe"
    ...timestamps,
  },
  (table) => ({
    userIdUnique: unique().on(table.user_id),
  }),
);

export type BuyerWallet = typeof buyerWallets.$inferSelect;
export type InsertBuyerWallet = typeof buyerWallets.$inferInsert;
