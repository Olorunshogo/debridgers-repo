import {
  pgTable,
  serial,
  text,
  varchar,
  integer,
  boolean,
} from "drizzle-orm/pg-core";
import { timestamps } from "../../helper/column.helper";
import { zones } from "./zones.schema";
import { createInsertSchema } from "drizzle-zod";

export const riders = pgTable("riders", {
  id: serial().primaryKey().notNull(),
  full_name: text().notNull(),
  phone: varchar("phone", { length: 20 }).notNull(),
  zone_id: integer().references(() => zones.id, { onDelete: "set null" }),
  is_available: boolean().notNull().default(true),
  ...timestamps,
});

export const riderInsertSchema = createInsertSchema(riders);
