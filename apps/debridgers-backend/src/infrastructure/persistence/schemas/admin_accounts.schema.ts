import {
  pgTable,
  serial,
  integer,
  varchar,
  text,
  timestamp,
  pgEnum,
  index,
} from "drizzle-orm/pg-core";

export const adminAccountTypeEnum = pgEnum("admin_account_type", [
  "platform",
  "merchant",
  "holding",
]);

/* Balance and totals are kobo. */
export const adminAccounts = pgTable(
  "admin_accounts",
  {
    id: serial().primaryKey().notNull(),
    account_type: adminAccountTypeEnum().notNull().default("platform"),
    name: varchar({ length: 100 }).notNull(),
    balance: integer().notNull().default(0),
    total_received: integer().notNull().default(0),
    total_paid_out: integer().notNull().default(0),
    description: text(),
    created_at: timestamp().defaultNow().notNull(),
    updated_at: timestamp().defaultNow().notNull(),
  },
  (table) => ({
    accountTypeIndex: index().on(table.account_type),
    createdAtIndex: index().on(table.created_at),
  }),
);

export type AdminAccount = typeof adminAccounts.$inferSelect;
export type InsertAdminAccount = typeof adminAccounts.$inferInsert;
