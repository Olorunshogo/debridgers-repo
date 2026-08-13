import { pgTable, serial, integer, unique } from "drizzle-orm/pg-core";
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
    ...timestamps,
  },
  (table) => ({
    userIdUnique: unique().on(table.user_id),
  }),
);

export type BuyerWallet = typeof buyerWallets.$inferSelect;
export type InsertBuyerWallet = typeof buyerWallets.$inferInsert;
