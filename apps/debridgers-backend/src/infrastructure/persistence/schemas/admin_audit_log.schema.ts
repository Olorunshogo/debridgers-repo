import {
  pgTable,
  serial,
  integer,
  varchar,
  text,
  jsonb,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { users } from "./users.schema";

/*
 * `action` is an event name, e.g. "WITHDRAWAL_APPROVED", "BUYER_BLOCKED".
 * `resource_type` names the entity acted on, e.g. "withdrawal", "buyer", "commission".
 * `details` holds the before/after values or request payload.
 * `ip_address` is sized for IPv6.
 */
export const admin_audit_log = pgTable(
  "admin_audit_log",
  {
    id: serial().primaryKey().notNull(),
    admin_id: integer().references(() => users.id, { onDelete: "set null" }),
    action: text().notNull(),
    resource_type: text().notNull(),
    resource_id: integer(),
    details: jsonb(),
    ip_address: varchar({ length: 45 }),
    user_agent: text(),
    created_at: timestamp().defaultNow().notNull(),
  },
  (table) => ({
    adminIdIndex: index().on(table.admin_id),
    resourceIndex: index().on(table.resource_type, table.resource_id),
    createdAtIndex: index().on(table.created_at),
  }),
);

export type AdminAuditLog = typeof admin_audit_log.$inferSelect;
export type InsertAdminAuditLog = typeof admin_audit_log.$inferInsert;
