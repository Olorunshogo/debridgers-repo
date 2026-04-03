import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { users } from "./users.schema";

export const email_verification = pgTable("email_verification", {
  id: serial().primaryKey().notNull(),
  user_id: integer()
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  token: text().notNull(),
  expires_at: timestamp().notNull(),
  created_at: timestamp().defaultNow().notNull(),
  updated_at: timestamp().defaultNow(),
});
