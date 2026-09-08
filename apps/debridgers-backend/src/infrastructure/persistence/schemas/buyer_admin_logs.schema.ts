import {
  pgTable,
  serial,
  integer,
  varchar,
  jsonb,
  timestamp,
} from "drizzle-orm/pg-core";
import { users } from "./users.schema";
import { createInsertSchema } from "drizzle-zod";

/* `action` is one of suspend, unsuspend, verify_delivery, view_profile. `details` holds what changed. */
export const buyerAdminLogs = pgTable("buyer_admin_logs", {
  id: serial().primaryKey().notNull(),
  admin_id: integer()
    .notNull()
    .references(() => users.id, { onDelete: "restrict" }),
  buyer_id: integer()
    .notNull()
    .references(() => users.id, { onDelete: "restrict" }),
  action: varchar("action", { length: 50 }).notNull(),
  details: jsonb(),
  created_at: timestamp().notNull().defaultNow(),
});

export const buyerAdminLogsInsertSchema = createInsertSchema(buyerAdminLogs);
