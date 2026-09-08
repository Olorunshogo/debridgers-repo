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

/* `amount` is kobo. `subaccount_code` is the Paystack subaccount for commission splits, `reference` its transfer reference. */
export const payouts = pgTable("payouts", {
  id: serial().primaryKey().notNull(),
  agent_id: integer()
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  subaccount_code: varchar({ length: 50 }),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  reference: varchar({ length: 100 }).notNull().unique(),
  status: payoutStatusEnum().notNull().default("pending"),
  initiated_at: timestamp().notNull().defaultNow(),
  completed_at: timestamp(),
  error_message: text(),
  ...timestamps,
});

export const payoutInsertSchema = createInsertSchema(payouts);
