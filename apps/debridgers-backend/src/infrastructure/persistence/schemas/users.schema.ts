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
    role: userRoleEnum().notNull().default("agent"),
    is_email_verified: boolean().notNull().default(false),
    is_phone_verified: boolean().notNull().default(false),
    is_blocked: boolean().notNull().default(false),
    // zone assigned from delivery address (buyers) or LGA (agents)
    zone_id: integer(),
    // agent who referred this buyer (permanent link)
    referred_by_agent_id: integer(),
    mailtrap_contact_id: text(),
    refresh_token: text(),
    ...timestamps,
  },
  (table) => [uniqueIndex("users_email_idx").on(lower(table.email))],
);

export function lower(col: AnyPgColumn): SQL {
  return sql`lower(${col})`;
}

export const userInsertSchema = createInsertSchema(users);
