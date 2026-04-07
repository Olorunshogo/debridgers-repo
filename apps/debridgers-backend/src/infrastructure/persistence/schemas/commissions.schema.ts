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
import { orders } from "./orders.schema";
import { createInsertSchema } from "drizzle-zod";

export const commissionStatusEnum = pgEnum("commission_status", [
  "pending",
  "confirmed",
  "paid",
]);

export const commissionTypeEnum = pgEnum("commission_type", [
  "direct", // agent's own field/referral order
  "buyer_referral", // ₦20 per order from a referred buyer
  "agent_override", // 5% of recruited agent's monthly earnings
  "state_manager_override", // 2% from agents under managed state
]);

export const commissions = pgTable("commissions", {
  id: serial().primaryKey().notNull(),
  agent_id: integer()
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  order_id: integer().references(() => orders.id, { onDelete: "cascade" }),
  type: commissionTypeEnum().notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  status: commissionStatusEnum().notNull().default("pending"),
  paid_at: timestamp(),
  ...timestamps,
});

export const commissionInsertSchema = createInsertSchema(commissions);
