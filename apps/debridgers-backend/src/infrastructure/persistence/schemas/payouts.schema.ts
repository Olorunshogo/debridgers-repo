import {
  pgTable,
  pgEnum,
  serial,
  integer,
  numeric,
  varchar,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { timestamps } from "../../helper/column.helper";
import { users } from "./users.schema";
import { createInsertSchema } from "drizzle-zod";

export const payoutStatusEnum = pgEnum("payout_status", [
  "pending",
  "processing",
  "completed",
  "failed",
]);

export const payouts = pgTable("payouts", {
  id: serial().primaryKey().notNull(),
  agent_id: integer()
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  subaccount_code: varchar({ length: 50 }), // Paystack subaccount for commission splits
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(), // in kobo
  reference: varchar({ length: 100 }).notNull().unique(), // Paystack transfer reference
  status: payoutStatusEnum().notNull().default("pending"),
  initiated_at: timestamp().notNull().defaultNow(),
  completed_at: timestamp(),
  error_message: text(),
  ...timestamps,
});

export const payoutInsertSchema = createInsertSchema(payouts);
