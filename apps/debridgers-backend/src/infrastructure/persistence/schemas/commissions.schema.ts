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
  /*
   * Deprecated. Numeric naira, kept for one release so a rollback does not lose
   * data. Nothing should read it; `amount_kobo` is the value.
   */
  amount: numeric("amount", { precision: 12, scale: 2 }),
  /* Integer kobo, matching every other balance in the system. */
  amount_kobo: integer().notNull().default(0),
  status: commissionStatusEnum().notNull().default("pending"),
  /*
   * The earning month an override was calculated for. Null for types that the
   * monthly run does not produce. A partial unique index on
   * (agent_id, type, period) makes a repeated run collide rather than pay twice.
   */
  period: date(),
  paid_at: timestamp(),
  ...timestamps,
});

export const commissionInsertSchema = createInsertSchema(commissions);
