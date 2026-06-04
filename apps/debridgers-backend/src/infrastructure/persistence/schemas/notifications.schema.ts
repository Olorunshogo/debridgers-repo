import { pgTable, serial, integer, text, boolean } from "drizzle-orm/pg-core";
import { timestamps } from "../../helper/column.helper";
import { users } from "./users.schema";

export const notifications = pgTable("notifications", {
  id: serial().primaryKey().notNull(),
  user_id: integer()
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text().notNull(),
  description: text().notNull(),
  read: boolean().notNull().default(false),
  ...timestamps,
});
