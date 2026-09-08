import {
  pgTable,
  pgEnum,
  serial,
  integer,
  numeric,
  timestamp,
  date,
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

/*
 * direct: the agent's own field/referral order.
 * buyer_referral: per order from a referred buyer.
 * agent_override: a share of a recruited agent's monthly earnings.
 * state_manager_override: a share from agents under the managed state.
 * Rates live in @debridgers/pricing, not here.
 */
export const commissionTypeEnum = pgEnum("commission_type", [
  "direct",
  "buyer_referral",
  "agent_override",
  "state_manager_override",
]);

/*
 * amount is deprecated. Numeric naira, kept for one release so a rollback does not lose data.
 * Nothing should read amount; `amount_kobo` is the value.
 * period is the earning month an override was calculated for. Null for types that the monthly run does not produce.
 * A partial unique index on (agent_id, type, period) makes a repeated run collide rather than pay twice.
 */
export const commissions = pgTable("commissions", {
  id: serial().primaryKey().notNull(),
  agent_id: integer()
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  order_id: integer().references(() => orders.id, { onDelete: "cascade" }),
  type: commissionTypeEnum().notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }),
  amount_kobo: integer().notNull().default(0),
  status: commissionStatusEnum().notNull().default("pending"),
  period: date(),
  paid_at: timestamp(),
  ...timestamps,
});

export const commissionInsertSchema = createInsertSchema(commissions);
