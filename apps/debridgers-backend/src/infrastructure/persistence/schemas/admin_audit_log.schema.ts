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

export const admin_audit_log = pgTable(
  "admin_audit_log",
  {
    id: serial().primaryKey().notNull(),
    admin_id: integer().references(() => users.id, { onDelete: "set null" }),
    action: text().notNull(), // e.g. "WITHDRAWAL_APPROVED", "BUYER_BLOCKED"
    resource_type: text().notNull(), // e.g. "withdrawal", "buyer", "commission"
    resource_id: integer(),
    details: jsonb(), // before/after values or request payload
    ip_address: varchar({ length: 45 }), // 45 chars covers IPv6
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
