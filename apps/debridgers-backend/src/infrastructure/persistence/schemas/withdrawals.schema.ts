import {
  pgTable,
  pgEnum,
  serial,
  integer,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { timestamps } from "../../helper/column.helper";
import { users } from "./users.schema";
import { createInsertSchema } from "drizzle-zod";

export const withdrawalStatusEnum = pgEnum("withdrawal_status", [
  "pending",
  "approved",
  "rejected",
  "paid",
]);

export const withdrawals = pgTable("withdrawals", {
  id: serial().primaryKey().notNull(),
  agent_id: integer()
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  amount: integer().notNull(), // in kobo
  bank_name: text().notNull(),
  bank_account_number: text().notNull(),
  bank_account_name: text().notNull(),
  status: withdrawalStatusEnum().notNull().default("pending"),
  rejection_reason: text(),
  processed_at: timestamp(),
  processed_by: integer().references(() => users.id, { onDelete: "set null" }), // admin user id
  ...timestamps,
});

export const withdrawalInsertSchema = createInsertSchema(withdrawals);
