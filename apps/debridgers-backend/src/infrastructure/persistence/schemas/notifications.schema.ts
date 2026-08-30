import {
  pgTable,
  serial,
  integer,
  text,
  boolean,
  index,
} from "drizzle-orm/pg-core";
import { timestamps } from "../../helper/column.helper";
import { users } from "./users.schema";

/*
 * Kept as text rather than a pg enum: the set grows every time a flow starts
 * notifying, and an enum makes each addition a migration with a lock. The
 * frontend falls back to a neutral icon for anything it does not recognise, so
 * an unknown value degrades rather than breaks.
 */
export const NOTIFICATION_TYPES = [
  "order",
  "payment",
  "wallet",
  "delivery",
  "agent",
  "kyc",
  "withdrawal",
  "stock",
  "general",
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const notifications = pgTable(
  "notifications",
  {
    id: serial().primaryKey().notNull(),
    user_id: integer()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text().notNull().default("general").$type<NotificationType>(),
    title: text().notNull(),
    description: text().notNull(),
    read: boolean().notNull().default(false),
    /* "Handled, stop showing it to me." Implies read; the service enforces
       that pairing so the two can never disagree. */
    done: boolean().notNull().default(false),
    ...timestamps,
  },
  (table) => [
    /* The list and the bell badge both filter on exactly this pair. */
    index("notifications_user_read_idx").on(table.user_id, table.read),
  ],
);
