import {
  pgTable,
  pgEnum,
  serial,
  integer,
  varchar,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { timestamps } from "../../helper/column.helper";
import { orders } from "./orders.schema";
import { users } from "./users.schema";
import { createInsertSchema } from "drizzle-zod";

export const disputeStatusEnum = pgEnum("dispute_status", [
  "initiated",
  "under_review",
  "resolved",
  "won",
  "lost",
]);

export const disputeTypeEnum = pgEnum("dispute_type", [
  "chargeback",
  "customer_complaint",
  "refund_dispute",
]);

export const disputes = pgTable("disputes", {
  id: serial().primaryKey().notNull(),
  order_id: integer()
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  type: disputeTypeEnum().notNull(),
  status: disputeStatusEnum().notNull().default("initiated"),
  reason: text(),
  paystack_reference: varchar({ length: 100 }), // Paystack dispute/chargeback reference
  initiated_at: timestamp().notNull().defaultNow(),
  resolved_at: timestamp(),
  resolution_notes: text(),
  resolved_by: integer().references(() => users.id, { onDelete: "set null" }), // Admin who resolved
  ...timestamps,
});

export const disputeInsertSchema = createInsertSchema(disputes);
