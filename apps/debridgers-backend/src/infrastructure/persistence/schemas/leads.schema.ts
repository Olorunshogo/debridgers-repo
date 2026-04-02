import { pgTable, serial, text, varchar } from "drizzle-orm/pg-core";
import { timestamps } from "../../helper/column.helper";
import { createInsertSchema } from "drizzle-zod";

export const leads = pgTable("leads", {
  id: serial().primaryKey().notNull(),
  full_name: varchar("full_name", { length: 200 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  message: text().notNull(),
  ...timestamps,
});

export const leadInsertSchema = createInsertSchema(leads);
