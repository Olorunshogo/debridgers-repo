import { pgTable, serial, text, varchar, integer } from "drizzle-orm/pg-core";
import { timestamps } from "../../helper/column.helper";

export const outreach_records = pgTable("outreach_records", {
  id: serial().primaryKey().notNull(),
  shop_name: text().notNull(),
  owner_name: text(),
  phone: text(),
  lga: text(),
  area: text(),
  address: text(),
  product_interest: text(),
  quantity: integer(),
  notes: text(),
  collected_by: text(),
  visit_date: text().notNull(),
  ...timestamps,
});
