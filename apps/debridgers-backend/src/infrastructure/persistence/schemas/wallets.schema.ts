import {
  pgTable,
  serial,
  integer,
  bigint,
  unique,
  timestamp,
} from "drizzle-orm/pg-core";
import { users } from "./users.schema";
import { createInsertSchema } from "drizzle-zod";

/*
 * `user_id` is named to match buyer_wallets; it was agent_id, the same foreign key to the same table under a different name, which is what kept the two wallet tables looking unrelated.
 * Balances are kobo, stored as bigint because total_earned only ever grows and a 4-byte integer caps at about ₦21.4m.
 */
export const wallets = pgTable(
  "wallets",
  {
    id: serial().primaryKey().notNull(),
    user_id: integer()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    available_balance: bigint({ mode: "number" }).notNull().default(0),
    pending_balance: bigint({ mode: "number" }).notNull().default(0),
    total_earned: bigint({ mode: "number" }).notNull().default(0),
    updated_at: timestamp().defaultNow(),
  },
  (table) => [unique("uq_wallet_user_id").on(table.user_id)],
);

export const walletInsertSchema = createInsertSchema(wallets);
