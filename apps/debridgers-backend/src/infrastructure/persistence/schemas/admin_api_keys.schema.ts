import {
  pgTable,
  serial,
  integer,
  text,
  varchar,
  timestamp,
  boolean,
} from "drizzle-orm/pg-core";
import { timestamps } from "../../helper/column.helper";
import { users } from "./users.schema";

/*
 * Per-admin API keys. Only the SHA256 hash is stored; the plaintext is returned
 * once at creation and never again.
 *
 * `admin_id` was a `serial` referencing nothing, despite a comment claiming it
 * pointed at users.id. It carried its own sequence default, so an insert that
 * omitted it silently took the next sequence value and the key ended up owned
 * by whichever user id that happened to hit. Migration 0006 drops the default
 * and the sequence and adds the real constraint.
 *
 * On delete cascades rather than restricts: a removed admin's keys must not
 * outlive them. This differs from product.category_id on purpose, because that
 * is a soft delete and this is not.
 *
 * `revoked_at` records when, not just whether: `is_active` alone cannot date a revocation.
 */
export const admin_api_keys = pgTable("admin_api_keys", {
  id: serial("id").primaryKey().notNull(),
  admin_id: integer("admin_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  key_hash: text("key_hash").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  last_used_at: timestamp("last_used_at"),
  is_active: boolean("is_active").notNull().default(true),
  revoked_at: timestamp("revoked_at"),
  ...timestamps,
});
