import {
  pgTable,
  pgEnum,
  serial,
  integer,
  text,
  varchar,
  boolean,
  unique,
} from "drizzle-orm/pg-core";
import { timestamps } from "../../helper/column.helper";
import { users } from "./users.schema";
import { createInsertSchema } from "drizzle-zod";

export const agentStatusEnum = pgEnum("agent_status", [
  "pending",
  "approved",
  "rejected",
  "suspended",
]);

export const kycStatusEnum = pgEnum("kyc_status", [
  "not_submitted",
  "submitted",
  "approved",
  "rejected",
]);

export const agentIdTypeEnum = pgEnum("agent_id_type", [
  "NIN",
  "Passport",
  "Drivers License",
]);

export const agent_profiles = pgTable(
  "agent_profiles",
  {
    id: serial().primaryKey().notNull(),
    user_id: integer()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    address: text(),
    state: text(),
    lga: text(),
    status: agentStatusEnum().notNull().default("pending"),
    admin_notes: text(),
    // referral
    referred_by_agent_id: integer().references(() => users.id, {
      onDelete: "set null",
    }),
    referral_buyer_code: varchar("referral_buyer_code", { length: 20 }),
    referral_agent_code: varchar("referral_agent_code", { length: 20 }),
    // state manager
    is_state_manager: boolean().notNull().default(false),
    managed_state: text(),
    // bank details
    bank_name: text(),
    bank_account_number: varchar("bank_account_number", { length: 20 }),
    bank_account_name: text(),
    // KYC
    kyc_status: kycStatusEnum().notNull().default("not_submitted"),
    kyc_rejection_reason: text(),
    // identity verification
    id_type: agentIdTypeEnum(),
    id_front_url: text(),
    id_selfie_url: text(),
    // legacy / payment
    nin: varchar("nin", { length: 20 }),
    cv_url: text(),
    target: integer().notNull().default(0),
    paystack_subaccount_code: varchar("paystack_subaccount_code", {
      length: 100,
    }),
    mailtrap_contact_id: text(),
    ...timestamps,
  },
  (table) => [
    unique("uq_agent_user_id").on(table.user_id),
    unique("uq_referral_buyer_code").on(table.referral_buyer_code),
    unique("uq_referral_agent_code").on(table.referral_agent_code),
  ],
);

export const agentProfileInsertSchema = createInsertSchema(agent_profiles);
