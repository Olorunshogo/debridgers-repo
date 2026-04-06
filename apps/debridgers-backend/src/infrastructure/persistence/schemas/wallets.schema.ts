import {
  pgTable,
  serial,
  integer,
  unique,
  timestamp,
} from "drizzle-orm/pg-core";
import { users } from "./users.schema";
import { createInsertSchema } from "drizzle-zod";

export const wallets = pgTable(
  "wallets",
  {
    id: serial().primaryKey().notNull(),
    agent_id: integer()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    available_balance: integer().notNull().default(0), // in kobo
    pending_balance: integer().notNull().default(0), // in kobo
    total_earned: integer().notNull().default(0), // in kobo
    updated_at: timestamp().defaultNow(),
  },
  (table) => [unique("uq_wallet_agent_id").on(table.agent_id)],
);

export const walletInsertSchema = createInsertSchema(wallets);
