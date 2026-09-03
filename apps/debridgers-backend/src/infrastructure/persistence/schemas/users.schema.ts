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
]);

export const users = pgTable(
  "users",
  {
    id: serial().primaryKey().notNull(),
    first_name: text().notNull(),
    last_name: text().notNull(),
    email: text().notNull(),
    phone: varchar("phone", { length: 20 }),
    password: varchar("password", { length: 256 }),
    /*
     * Buyer is the least-privileged self-registerable role, so a write that omits
     * the role can only create a harmless account. This previously defaulted to
     * "agent", which meant any such omission silently created an agent.
     */
    role: userRoleEnum().notNull().default("buyer"),
    is_email_verified: boolean().notNull().default(false),
    is_phone_verified: boolean().notNull().default(false),
    is_blocked: boolean().notNull().default(false),
    is_suspended: boolean().notNull().default(false),
    suspended_at: timestamp(),
    suspended_reason: text(),
    total_deposited: integer().notNull().default(0), // in kobo
    // zone assigned from delivery address (buyers) or LGA (agents)
    zone_id: integer(),
    delivery_address: text(),
    // agent who referred this buyer (permanent link)
    referred_by_agent_id: integer(),
    avatar_url: text(),
    mailtrap_contact_id: text(),
    refresh_token: text(),
    email_notifications: boolean().notNull().default(true),
    // Admin tier: super_admin (owner), sub_admin (invited)
    admin_tier: varchar("admin_tier", { length: 20 }),
    /*
     * Still on the password the account was issued.
     *
     * The invite flow emails a temporary password in plaintext, so this is the
     * single source of truth behind the dashboard's reminder. The UI renders
     * it and stores nothing of its own: dismissing the prompt does not clear
     * the obligation, only changing the password does.
     */
    must_change_password: boolean().notNull().default(false),
    password_changed_at: timestamp("password_changed_at"),
    /*
     * The consent recorded at signup: when it was given, which document, and
     * which version of it. Null for every account created before consent was
     * collected, which is the truth rather than a default that would claim
     * they agreed to something they were never shown.
     */
    terms_accepted_at: timestamp("terms_accepted_at"),
    terms_document: varchar("terms_document", { length: 64 }),
    terms_version: varchar("terms_version", { length: 32 }),
    // Unique API key for admin authentication via header
    admin_api_key: varchar("admin_api_key", { length: 255 }).unique(),
    ...timestamps,
  },
  (table) => [uniqueIndex("users_email_idx").on(lower(table.email))],
);

export function lower(col: AnyPgColumn): SQL {
  return sql`lower(${col})`;
}

export const userInsertSchema = createInsertSchema(users);
