import {
  pgTable,
  pgEnum,
  serial,
  integer,
  numeric,
  timestamp,
} from "drizzle-orm/pg-core";
import { timestamps } from "../../helper/column.helper";
import { users } from "./users.schema";
import { sales_reports } from "./sales_reports.schema";
import { createInsertSchema } from "drizzle-zod";

export const commissionStatusEnum = pgEnum("commission_status", [
  "pending",
  "paid",
]);

export const commissions = pgTable("commissions", {
  id: serial().primaryKey().notNull(),
  agent_id: integer()
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  report_id: integer()
    .notNull()
    .references(() => sales_reports.id, { onDelete: "cascade" }),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  rate: numeric("rate", { precision: 5, scale: 2 }).notNull().default("0.30"),
  status: commissionStatusEnum().notNull().default("pending"),
  paid_at: timestamp(),
  ...timestamps,
});

export const commissionInsertSchema = createInsertSchema(commissions);
