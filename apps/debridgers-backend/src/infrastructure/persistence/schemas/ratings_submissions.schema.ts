import {
  pgTable,
  serial,
  integer,
  text,
  real,
  boolean,
  jsonb,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { timestamps } from "../../helper/column.helper";
import { users } from "./users.schema";
import { orders } from "./orders.schema";
import { createInsertSchema } from "drizzle-zod";

/*
 * `context_key` and `rater_role` are kept as text rather than a pg enum, same reasoning as `notifications.type`: @debridgers/ratings owns the real set of contexts and roles, and a new context there should never need a migration here to match.
 * An unrecognised value degrades to being excluded from aggregates rather than breaking a write.
 *
 * `agent_id` snapshots the order's agent at submission time rather than resolving from the order at read time.
 * An order can only ever have had one agent, but this keeps the write pattern identical to how a multi-party platform would record "who was responsible then" and makes a future re-assignment feature safe by construction.
 * `target_id` is null when target_type is "delivery": the order's fulfilment is the target, not a person, so there is no user row to point at.
 * `weight` is copied from the context's `weight` at submission, so a later config edit never reweights history.
 * `visibility_scope` is "self" (visible to the target and admin) or "admin_only" (excludes the target itself), set once at submission from the context, not derived at read time; see docs/frontend/Ratings.md section 10 in the design plan for why loosening this later is the expensive direction.
 * `disputed` is true while under admin review, and excludes the row from aggregates until cleared.
 *
 * `ratings_submissions_order_context_rater_idx` enforces one submission per rater, per order, per context: resubmitting is an edit, not a new row.
 * `ratings_submissions_target_idx` is what every aggregate query and profile page filters on.
 */
export const ratingsSubmissions = pgTable(
  "ratings_submissions",
  {
    id: serial().primaryKey().notNull(),
    context_key: text().notNull(),
    rater_role: text().notNull(),
    rater_id: integer()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    order_id: integer()
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    agent_id: integer().references(() => users.id, { onDelete: "set null" }),
    target_type: text().notNull(),
    target_id: integer().references(() => users.id, { onDelete: "set null" }),
    score: integer().notNull(),
    facets: jsonb().notNull().default([]).$type<string[]>(),
    comment: text(),
    facet_catalogue_version: integer().notNull(),
    weight: real().notNull().default(1),
    formula_version: integer().notNull().default(1),
    visibility_scope: text().notNull().default("self"),
    consent_version: integer().notNull().default(1),
    disputed: boolean().notNull().default(false),
    editable_until: timestamp().notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("ratings_submissions_order_context_rater_idx").on(
      table.order_id,
      table.context_key,
      table.rater_id,
    ),
    index("ratings_submissions_target_idx").on(
      table.target_type,
      table.target_id,
    ),
    index("ratings_submissions_rater_idx").on(table.rater_id),
  ],
);

export const ratingSubmissionInsertSchema =
  createInsertSchema(ratingsSubmissions);
