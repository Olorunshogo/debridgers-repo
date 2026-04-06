import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { users } from "./users.schema";
import { createInsertSchema } from "drizzle-zod";

export const audit_log = pgTable("audit_log", {
  id: serial().primaryKey().notNull(),
  admin_id: integer().references(() => users.id, { onDelete: "set null" }),
  action: text().notNull(), // e.g. "AGENT_APPROVED", "ORDER_CANCELLED"
  entity_type: text().notNull(), // e.g. "agent", "order", "withdrawal"
  entity_id: integer(),
  notes: text(),
  created_at: timestamp().defaultNow().notNull(),
});

export const auditLogInsertSchema = createInsertSchema(audit_log);
