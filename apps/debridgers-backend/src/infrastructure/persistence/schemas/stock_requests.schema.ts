import {
  pgTable,
  pgEnum,
  serial,
  integer,
  timestamp,
} from "drizzle-orm/pg-core";
import { timestamps } from "../../helper/column.helper";
import { users } from "./users.schema";
import { createInsertSchema } from "drizzle-zod";

export const stockRequestStatusEnum = pgEnum("stock_request_status", [
  "pending",
  "fulfilled",
  "cancelled",
]);

export const stock_requests = pgTable("stock_requests", {
  id: serial().primaryKey().notNull(),
  agent_id: integer()
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  quantity: integer().notNull(),
  status: stockRequestStatusEnum().notNull().default("pending"),
  amount_to_remit: integer().notNull(), // quantity × ₦1,300 in kobo
  amount_remitted: integer().notNull().default(0),
  fulfilled_at: timestamp(),
  ...timestamps,
});

export const stockRequestInsertSchema = createInsertSchema(stock_requests);
