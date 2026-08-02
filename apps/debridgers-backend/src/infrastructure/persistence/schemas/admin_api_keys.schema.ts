import {
  pgTable,
  serial,
  text,
  varchar,
  timestamp,
  boolean,
} from "drizzle-orm/pg-core";
import { timestamps } from "../../helper/column.helper";

export const admin_api_keys = pgTable("admin_api_keys", {
  id: serial("id").primaryKey().notNull(),
  admin_id: serial("admin_id").notNull(), // References users.id
  key_hash: text("key_hash").notNull(), // SHA256 hash of the API key
  name: varchar("name", { length: 255 }).notNull(), // Friendly name: "Production Key", "Local Dev"
  last_used_at: timestamp("last_used_at"),
  is_active: boolean("is_active").notNull().default(true),
  ...timestamps,
});
