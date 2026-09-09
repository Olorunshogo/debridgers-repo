import {
  varchar,
  pgTable,
  pgEnum,
  serial,
  integer,
  boolean,
  uniqueIndex,
  text,
  AnyPgColumn,
  timestamp,
} from "drizzle-orm/pg-core";
import { SQL, sql } from "drizzle-orm";
import { timestamps } from "../../helper/column.helper";
import { createInsertSchema } from "drizzle-zod";

export const userRoleEnum = pgEnum("user_role", [
  "admin",
  "agent",
  "buyer",
  "company",
  "hr",
  "hiring_manager",
  "applicant",
  "employee",
]);

/*
 * `role` defaults to buyer, the least-privileged self-registerable role, so a write that omits it can only create a harmless account; it previously defaulted to "agent", which meant any such omission silently created an agent.
 * `total_deposited` is kobo.
 * `zone_id` is assigned from the delivery address for buyers, or the LGA for agents.
 * `referred_by_agent_id` is a permanent link to the agent who referred this buyer.
 * `admin_tier` is super_admin (owner) or sub_admin (invited).
 * `must_change_password` stays true while the account is still on the password the invite flow emailed in plaintext; the UI renders this flag and stores nothing of its own, so dismissing the prompt does not clear the obligation, only changing the password does.
 * `terms_accepted_at`, `terms_document` and `terms_version` record the consent given at signup: when, which document, and which version.
 * Null for every account created before consent was collected, which is the truth rather than a default that would claim they agreed to something they were never shown.
 * `admin_api_key` authenticates admin requests via a header instead of a JWT.
 */
export const users = pgTable(
  "users",
  {
    id: serial().primaryKey().notNull(),
    first_name: text().notNull(),
    last_name: text().notNull(),
    email: text().notNull(),
    phone: varchar("phone", { length: 20 }),
    password: varchar("password", { length: 256 }),
    role: userRoleEnum().notNull().default("buyer"),
    is_email_verified: boolean().notNull().default(false),
    is_phone_verified: boolean().notNull().default(false),
    is_blocked: boolean().notNull().default(false),
    is_suspended: boolean().notNull().default(false),
    suspended_at: timestamp(),
    suspended_reason: text(),
    total_deposited: integer().notNull().default(0),
    zone_id: integer(),
    delivery_address: text(),
    referred_by_agent_id: integer(),
    avatar_url: text(),
    mailtrap_contact_id: text(),
    refresh_token: text(),
    email_notifications: boolean().notNull().default(true),
    admin_tier: varchar("admin_tier", { length: 20 }),
    must_change_password: boolean().notNull().default(false),
    password_changed_at: timestamp("password_changed_at"),
    terms_accepted_at: timestamp("terms_accepted_at"),
    terms_document: varchar("terms_document", { length: 64 }),
    terms_version: varchar("terms_version", { length: 32 }),
    admin_api_key: varchar("admin_api_key", { length: 255 }).unique(),
    ...timestamps,
  },
  (table) => [uniqueIndex("users_email_idx").on(lower(table.email))],
);

export function lower(col: AnyPgColumn): SQL {
  return sql`lower(${col})`;
}

export const userInsertSchema = createInsertSchema(users);
