import {
  pgTable,
  pgEnum,
  serial,
  integer,
  text,
  varchar,
  numeric,
  unique,
} from "drizzle-orm/pg-core";
import { timestamps } from "../../helper/column.helper";
import { users } from "./users.schema";
import { createInsertSchema } from "drizzle-zod";

export const agentStatusEnum = pgEnum("agent_status", [
  "pending",
  "approved",
  "rejected",
]);

export const agent_profiles = pgTable(
  "agent_profiles",
  {
    id: serial().primaryKey().notNull(),
    user_id: integer()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    cv_url: text(),
    address: text(),
    nin: varchar("nin", { length: 20 }),
    status: agentStatusEnum().notNull().default("pending"),
    target: integer().notNull().default(0),
    paystack_subaccount_code: varchar("paystack_subaccount_code", {
      length: 100,
    }),
    admin_notes: text(),
    ...timestamps,
  },
  (table) => [unique("uq_agent_user_id").on(table.user_id)],
);

export const agentProfileInsertSchema = createInsertSchema(agent_profiles);
