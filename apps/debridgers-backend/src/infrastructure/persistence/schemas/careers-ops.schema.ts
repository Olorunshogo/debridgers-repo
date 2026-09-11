import {
  pgTable,
  pgEnum,
  serial,
  integer,
  text,
  varchar,
  timestamp,
  boolean,
  index,
} from "drizzle-orm/pg-core";
import { timestamps } from "../../helper/column.helper";
import { users } from "./users.schema";
import { careersApplications } from "./careers.schema";
import { createInsertSchema } from "drizzle-zod";

// === Performance

export const careersReviewTypeEnum = pgEnum("careers_review_type", [
  "annual",
  "probation",
]);

export const careersReviewStatusEnum = pgEnum("careers_review_status", [
  "pending_self",
  "pending_manager",
  "completed",
]);

export const careersPerformanceReviews = pgTable(
  "careers_performance_reviews",
  {
    id: serial().primaryKey().notNull(),
    employee_user_id: integer()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    manager_user_id: integer().references(() => users.id, {
      onDelete: "set null",
    }),
    review_type: careersReviewTypeEnum().notNull().default("annual"),
    due_at: timestamp().notNull(),
    status: careersReviewStatusEnum().notNull().default("pending_self"),
    self_achievements: text(),
    self_learnings: text(),
    self_goals_met: text(),
    self_improvements: text(),
    self_next_goals: text(),
    self_submitted_at: timestamp(),
    manager_goals_met: boolean(),
    manager_rating: integer(),
    manager_feedback: text(),
    manager_submitted_at: timestamp(),
    probation_decision: varchar("probation_decision", { length: 32 }),
    ...timestamps,
  },
  (table) => [
    index("careers_perf_reviews_employee_idx").on(table.employee_user_id),
    index("careers_perf_reviews_status_idx").on(table.status),
  ],
);

export const careersPipStatusEnum = pgEnum("careers_pip_status", [
  "active",
  "passed",
  "failed",
]);

export const careersPerformancePlans = pgTable(
  "careers_performance_plans",
  {
    id: serial().primaryKey().notNull(),
    employee_user_id: integer()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    manager_user_id: integer()
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    goals: text().notNull(),
    timelines: text().notNull(),
    support: text(),
    success_criteria: text().notNull(),
    status: careersPipStatusEnum().notNull().default("active"),
    due_at: timestamp().notNull(),
    outcome_notes: text(),
    closed_at: timestamp(),
    ...timestamps,
  },
  (table) => [index("careers_pips_employee_idx").on(table.employee_user_id)],
);

// === Extra report types

export const careersExpenseCategoryEnum = pgEnum("careers_expense_category", [
  "travel",
  "meals",
  "materials",
  "client_entertainment",
  "other",
]);

export const careersExpenseStatusEnum = pgEnum("careers_expense_status", [
  "pending",
  "manager_approved",
  "admin_approved",
  "rejected",
  "reimbursed",
]);

export const careersExpenseReports = pgTable(
  "careers_expense_reports",
  {
    id: serial().primaryKey().notNull(),
    employee_user_id: integer()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    description: text().notNull(),
    amount_kobo: integer().notNull(),
    expense_date: timestamp().notNull(),
    category: careersExpenseCategoryEnum().notNull(),
    receipt_url: text(),
    status: careersExpenseStatusEnum().notNull().default("pending"),
    reviewer_user_id: integer().references(() => users.id, {
      onDelete: "set null",
    }),
    reviewer_notes: text(),
    reviewed_at: timestamp(),
    ...timestamps,
  },
  (table) => [
    index("careers_expenses_employee_idx").on(table.employee_user_id),
    index("careers_expenses_status_idx").on(table.status),
  ],
);

export const careersIncidentCategoryEnum = pgEnum("careers_incident_category", [
  "safety",
  "hr_issue",
  "conflict",
  "damage",
  "other",
]);

export const careersIncidentStatusEnum = pgEnum("careers_incident_status", [
  "reported",
  "under_investigation",
  "resolved",
  "closed",
]);

export const careersIncidentReports = pgTable(
  "careers_incident_reports",
  {
    id: serial().primaryKey().notNull(),
    reporter_user_id: integer()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    occurred_at: timestamp().notNull(),
    description: text().notNull(),
    people_involved: text(),
    impact: text(),
    corrective_actions: text(),
    category: careersIncidentCategoryEnum().notNull(),
    critical: boolean().notNull().default(false),
    status: careersIncidentStatusEnum().notNull().default("reported"),
    assignee_user_id: integer().references(() => users.id, {
      onDelete: "set null",
    }),
    ...timestamps,
  },
  (table) => [
    index("careers_incidents_reporter_idx").on(table.reporter_user_id),
    index("careers_incidents_status_idx").on(table.status),
  ],
);

export const careersProjectReportStatusEnum = pgEnum(
  "careers_project_report_status",
  ["draft", "submitted", "approved"],
);

export const careersProjectStatusReports = pgTable(
  "careers_project_status_reports",
  {
    id: serial().primaryKey().notNull(),
    employee_user_id: integer()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    project_name: text().notNull(),
    progress_pct: integer().notNull().default(0),
    completed_items: text(),
    blockers: text(),
    next_steps: text(),
    status: careersProjectReportStatusEnum().notNull().default("draft"),
    reviewer_user_id: integer().references(() => users.id, {
      onDelete: "set null",
    }),
    reviewed_at: timestamp(),
    ...timestamps,
  },
  (table) => [
    index("careers_project_reports_employee_idx").on(table.employee_user_id),
  ],
);

// === Policies

export const careersPolicies = pgTable(
  "careers_policies",
  {
    id: serial().primaryKey().notNull(),
    title: text().notNull(),
    slug: varchar("slug", { length: 120 }).notNull(),
    body: text().notNull(),
    document_url: text(),
    version: varchar("version", { length: 32 }).notNull().default("1.0"),
    effective_at: timestamp().notNull(),
    restricted: boolean().notNull().default(false),
    created_by: integer()
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    ...timestamps,
  },
  (table) => [index("careers_policies_slug_idx").on(table.slug)],
);

export const careersPolicyAcknowledgments = pgTable(
  "careers_policy_acknowledgments",
  {
    id: serial().primaryKey().notNull(),
    policy_id: integer()
      .notNull()
      .references(() => careersPolicies.id, { onDelete: "cascade" }),
    user_id: integer()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    acknowledged_at: timestamp().notNull(),
    policy_version: varchar("policy_version", { length: 32 }).notNull(),
    ...timestamps,
  },
  (table) => [
    index("careers_policy_acks_user_idx").on(table.user_id),
    index("careers_policy_acks_policy_idx").on(table.policy_id),
  ],
);

// === Jotform Sign tracking
// Jotform Sign has no create/send REST API; we store invite URLs and update via webhook.

export const careersSignKindEnum = pgEnum("careers_sign_kind", [
  "offer",
  "contract",
  "policy",
]);

export const careersSignStatusEnum = pgEnum("careers_sign_status", [
  "pending",
  "sent",
  "signed",
  "declined",
  "expired",
]);

export const careersSignRequests = pgTable(
  "careers_sign_requests",
  {
    id: serial().primaryKey().notNull(),
    kind: careersSignKindEnum().notNull(),
    status: careersSignStatusEnum().notNull().default("pending"),
    subject_user_id: integer()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    application_id: integer().references(() => careersApplications.id, {
      onDelete: "set null",
    }),
    policy_id: integer().references(() => careersPolicies.id, {
      onDelete: "set null",
    }),
    title: text().notNull(),
    sign_url: text(),
    external_id: text(),
    signed_document_url: text(),
    metadata: text(),
    created_by: integer()
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    signed_at: timestamp(),
    ...timestamps,
  },
  (table) => [
    index("careers_sign_requests_subject_idx").on(table.subject_user_id),
    index("careers_sign_requests_status_idx").on(table.status),
  ],
);

export const careersPerformanceReviewInsertSchema = createInsertSchema(
  careersPerformanceReviews,
);
export const careersPerformancePlanInsertSchema = createInsertSchema(
  careersPerformancePlans,
);
export const careersExpenseReportInsertSchema = createInsertSchema(
  careersExpenseReports,
);
export const careersIncidentReportInsertSchema = createInsertSchema(
  careersIncidentReports,
);
export const careersProjectStatusReportInsertSchema = createInsertSchema(
  careersProjectStatusReports,
);
export const careersPolicyInsertSchema = createInsertSchema(careersPolicies);
export const careersPolicyAckInsertSchema = createInsertSchema(
  careersPolicyAcknowledgments,
);
export const careersSignRequestInsertSchema =
  createInsertSchema(careersSignRequests);
