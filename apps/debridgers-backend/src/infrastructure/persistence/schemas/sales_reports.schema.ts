import { pgTable, serial, integer, numeric, text } from "drizzle-orm/pg-core";
import { timestamps } from "../../helper/column.helper";
import { users } from "./users.schema";
import { createInsertSchema } from "drizzle-zod";

export const sales_reports = pgTable("sales_reports", {
  id: serial().primaryKey().notNull(),
  agent_id: integer()
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  pages_sold: integer().notNull().default(0),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  notes: text(),
  ...timestamps,
});

export const salesReportInsertSchema = createInsertSchema(sales_reports);
