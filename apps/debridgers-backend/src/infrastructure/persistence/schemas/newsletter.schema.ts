import { pgTable, serial, varchar } from "drizzle-orm/pg-core";
import { timestamps } from "../../helper/column.helper";

export const newsletter_subscribers = pgTable("newsletter_subscribers", {
  id: serial().primaryKey().notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  ...timestamps,
});
