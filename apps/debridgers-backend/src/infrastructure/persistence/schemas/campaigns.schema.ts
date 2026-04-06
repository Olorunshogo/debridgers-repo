import {
  pgTable,
  pgEnum,
  serial,
  integer,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { timestamps } from "../../helper/column.helper";
import { users } from "./users.schema";
import { createInsertSchema } from "drizzle-zod";

export const campaignTargetEnum = pgEnum("campaign_target", [
  "buyers",
  "agents",
  "all",
]);

export const campaignStatusEnum = pgEnum("campaign_status", ["draft", "sent"]);

export const campaigns = pgTable("campaigns", {
  id: serial().primaryKey().notNull(),
  title: text().notNull(),
  subject: text().notNull(),
  body: text().notNull(),
  target_list: campaignTargetEnum().notNull(),
  mailtrap_campaign_id: text(),
  status: campaignStatusEnum().notNull().default("draft"),
  sent_at: timestamp(),
  sent_by: integer().references(() => users.id, { onDelete: "set null" }),
  ...timestamps,
});

export const campaignInsertSchema = createInsertSchema(campaigns);
