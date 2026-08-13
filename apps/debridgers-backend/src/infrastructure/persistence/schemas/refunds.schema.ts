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
import { orders } from "./orders.schema";
import { users } from "./users.schema";
import { createInsertSchema } from "drizzle-zod";

export const refundStatusEnum = pgEnum("refund_status", [
  "initiated",
  "processing",
  "completed",
  "failed",
]);

export const refunds = pgTable("refunds", {
  id: serial().primaryKey().notNull(),
  order_id: integer()
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(), // in kobo
  reference: varchar({ length: 100 }).notNull().unique(), // Paystack refund reference
  reason: varchar({ length: 255 }),
  status: refundStatusEnum().notNull().default("initiated"),
  initiated_by: integer().references(() => users.id, { onDelete: "set null" }), // Admin who initiated
  initiated_at: timestamp().notNull().defaultNow(),
  completed_at: timestamp(),
  ...timestamps,
});

export const refundInsertSchema = createInsertSchema(refunds);
