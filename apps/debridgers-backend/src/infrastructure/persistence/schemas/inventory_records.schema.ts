import { pgTable, serial, integer, text } from "drizzle-orm/pg-core";
import { timestamps } from "../../helper/column.helper";
import { users } from "./users.schema";
import { createInsertSchema } from "drizzle-zod";

// Tracks every batch of modu received from Agrolinking (or other sources).
// Current stock = SUM(quantity_received) - SUM(quantity dispatched via orders/stock_requests)
export const inventory_records = pgTable("inventory_records", {
  id: serial().primaryKey().notNull(),
  quantity: integer().notNull(), // modu received
  source: text().notNull().default("Agrolinking"),
  notes: text(),
  recorded_by: integer().references(() => users.id, { onDelete: "set null" }),
  ...timestamps,
});

export const inventoryRecordInsertSchema =
  createInsertSchema(inventory_records);
