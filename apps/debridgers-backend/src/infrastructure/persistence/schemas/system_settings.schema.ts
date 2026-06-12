import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const system_settings = pgTable("system_settings", {
  id: serial().primaryKey().notNull(),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  updated_at: timestamp().defaultNow(),
});
