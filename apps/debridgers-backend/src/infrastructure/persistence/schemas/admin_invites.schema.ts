import {
  pgTable,
  serial,
  varchar,
  timestamp,
  integer,
} from "drizzle-orm/pg-core";
import { users } from "./users.schema";
import { createInsertSchema } from "drizzle-zod";

export const adminInvites = pgTable("admin_invites", {
  id: serial().primaryKey().notNull(),
  invite_code: varchar("invite_code", { length: 32 }).unique().notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  invited_by_admin_id: integer()
    .notNull()
    .references(() => users.id, { onDelete: "restrict" }),
  used_at: timestamp(),
  used_by_admin_id: integer().references(() => users.id, {
    onDelete: "set null",
  }),
  expires_at: timestamp().notNull(),
  created_at: timestamp().notNull().defaultNow(),
});

export const adminInvitesInsertSchema = createInsertSchema(adminInvites);
