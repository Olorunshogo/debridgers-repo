import {
  pgTable,
  pgEnum,
  serial,
  integer,
  timestamp,
} from "drizzle-orm/pg-core";
import { timestamps } from "../../helper/column.helper";
import { users } from "./users.schema";
import { productsTable } from "./product.schema";
import { createInsertSchema } from "drizzle-zod";

export const stockRequestStatusEnum = pgEnum("stock_request_status", [
  "pending",
  "fulfilled",
  "cancelled",
]);

/* `amount_to_remit` and `amount_remitted` are kobo; the remit price comes from remitPerPackageKobo. */
export const stock_requests = pgTable("stock_requests", {
  id: serial().primaryKey().notNull(),
  agent_id: integer()
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  product_id: integer().references(() => productsTable.id, {
    onDelete: "set null",
  }),
  quantity: integer().notNull(),
  status: stockRequestStatusEnum().notNull().default("pending"),
  amount_to_remit: integer().notNull(),
  amount_remitted: integer().notNull().default(0),
  fulfilled_at: timestamp(),
  ...timestamps,
});

export const stockRequestInsertSchema = createInsertSchema(stock_requests);
