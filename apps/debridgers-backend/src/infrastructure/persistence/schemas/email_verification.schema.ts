import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { users } from "./users.schema";

export const email_verification = pgTable("email_verification", {
  id: serial().primaryKey().notNull(),
  user_id: integer()
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  token: text().notNull(),
  /*
   * Wrong-OTP counter. Held in the database rather than the attempt cache
   * because a 6-digit code is guessable and this is the only thing standing in
   * the way: the cache falls back to per-process memory when Redis is
   * unavailable, so a counter there would reset on restart and never be shared
   * across instances - useless exactly when it matters.
   */
  attempts: integer().default(0).notNull(),
  expires_at: timestamp().notNull(),
  created_at: timestamp().defaultNow().notNull(),
  updated_at: timestamp().defaultNow(),
});
