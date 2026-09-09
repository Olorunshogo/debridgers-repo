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
import { hrApplications } from "./hr.schema";
import { createInsertSchema } from "drizzle-zod";

// === Performance

export const hrReviewTypeEnum = pgEnum("hr_review_type", [
  "annual",
  "probation",
]);

export const hrReviewStatusEnum = pgEnum("hr_review_status", [
  "pending_self",
  "pending_manager",
  "completed",
]);

export const hrPerformanceReviews = pgTable(
  "hr_performance_reviews",
  {
    id: serial().primaryKey().notNull(),
    employee_user_id: integer()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    manager_user_id: integer().references(() => users.id, {
      onDelete: "set null",
    }),
    review_type: hrReviewTypeEnum().notNull().default("annual"),
    due_at: timestamp().notNull(),
    status: hrReviewStatusEnum().notNull().default("pending_self"),
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
    index("hr_perf_reviews_employee_idx").on(table.employee_user_id),
    index("hr_perf_reviews_status_idx").on(table.status),
  ],
);

export const hrPipStatusEnum = pgEnum("hr_pip_status", [
  "active",
  "passed",
  "failed",
]);

export const hrPerformancePlans = pgTable(
  "hr_performance_plans",
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
    status: hrPipStatusEnum().notNull().default("active"),
    due_at: timestamp().notNull(),
    outcome_notes: text(),
    closed_at: timestamp(),
    ...timestamps,
  },
  (table) => [index("hr_pips_employee_idx").on(table.employee_user_id)],
);

// === Extra report types

export const hrExpenseCategoryEnum = pgEnum("hr_expense_category", [
  "travel",
  "meals",
  "materials",
  "client_entertainment",
  "other",
]);

export const hrExpenseStatusEnum = pgEnum("hr_expense_status", [
  "pending",
  "manager_approved",
  "hr_approved",
  "rejected",
  "reimbursed",
]);

export const hrExpenseReports = pgTable(
  "hr_expense_reports",
  {
    id: serial().primaryKey().notNull(),
    employee_user_id: integer()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    description: text().notNull(),
    amount_kobo: integer().notNull(),
    expense_date: timestamp().notNull(),
    category: hrExpenseCategoryEnum().notNull(),
    receipt_url: text(),
    status: hrExpenseStatusEnum().notNull().default("pending"),
    reviewer_user_id: integer().references(() => users.id, {
      onDelete: "set null",
    }),
    reviewer_notes: text(),
    reviewed_at: timestamp(),
    ...timestamps,
  },
  (table) => [
    index("hr_expenses_employee_idx").on(table.employee_user_id),
    index("hr_expenses_status_idx").on(table.status),
  ],
);

export const hrIncidentCategoryEnum = pgEnum("hr_incident_category", [
  "safety",
  "hr_issue",
  "conflict",
  "damage",
  "other",
]);

export const hrIncidentStatusEnum = pgEnum("hr_incident_status", [
  "reported",
  "under_investigation",
  "resolved",
  "closed",
]);

export const hrIncidentReports = pgTable(
  "hr_incident_reports",
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
    category: hrIncidentCategoryEnum().notNull(),
    critical: boolean().notNull().default(false),
    status: hrIncidentStatusEnum().notNull().default("reported"),
    assignee_user_id: integer().references(() => users.id, {
      onDelete: "set null",
    }),
    ...timestamps,
  },
  (table) => [
    index("hr_incidents_reporter_idx").on(table.reporter_user_id),
    index("hr_incidents_status_idx").on(table.status),
  ],
);

export const hrProjectReportStatusEnum = pgEnum("hr_project_report_status", [
  "draft",
  "submitted",
  "approved",
]);

export const hrProjectStatusReports = pgTable(
  "hr_project_status_reports",
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
    status: hrProjectReportStatusEnum().notNull().default("draft"),
    reviewer_user_id: integer().references(() => users.id, {
      onDelete: "set null",
    }),
    reviewed_at: timestamp(),
    ...timestamps,
  },
  (table) => [
    index("hr_project_reports_employee_idx").on(table.employee_user_id),
  ],
);

// === Policies

export const hrPolicies = pgTable(
  "hr_policies",
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
  (table) => [index("hr_policies_slug_idx").on(table.slug)],
);

export const hrPolicyAcknowledgments = pgTable(
  "hr_policy_acknowledgments",
  {
    id: serial().primaryKey().notNull(),
    policy_id: integer()
      .notNull()
      .references(() => hrPolicies.id, { onDelete: "cascade" }),
    user_id: integer()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    acknowledged_at: timestamp().notNull(),
    policy_version: varchar("policy_version", { length: 32 }).notNull(),
    ...timestamps,
  },
  (table) => [
    index("hr_policy_acks_user_idx").on(table.user_id),
    index("hr_policy_acks_policy_idx").on(table.policy_id),
  ],
);

// === Jotform Sign tracking
// Jotform Sign has no create/send REST API; we store invite URLs and update via webhook.

export const hrSignKindEnum = pgEnum("hr_sign_kind", [
  "offer",
  "contract",
  "policy",
]);

export const hrSignStatusEnum = pgEnum("hr_sign_status", [
  "pending",
  "sent",
  "signed",
  "declined",
  "expired",
]);

export const hrSignRequests = pgTable(
  "hr_sign_requests",
  {
    id: serial().primaryKey().notNull(),
    kind: hrSignKindEnum().notNull(),
    status: hrSignStatusEnum().notNull().default("pending"),
    subject_user_id: integer()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    application_id: integer().references(() => hrApplications.id, {
      onDelete: "set null",
    }),
    policy_id: integer().references(() => hrPolicies.id, {
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
    index("hr_sign_requests_subject_idx").on(table.subject_user_id),
    index("hr_sign_requests_status_idx").on(table.status),
  ],
);

export const hrPerformanceReviewInsertSchema =
  createInsertSchema(hrPerformanceReviews);
export const hrPerformancePlanInsertSchema =
  createInsertSchema(hrPerformancePlans);
export const hrExpenseReportInsertSchema = createInsertSchema(hrExpenseReports);
export const hrIncidentReportInsertSchema =
  createInsertSchema(hrIncidentReports);
export const hrProjectStatusReportInsertSchema = createInsertSchema(
  hrProjectStatusReports,
);
export const hrPolicyInsertSchema = createInsertSchema(hrPolicies);
export const hrPolicyAckInsertSchema = createInsertSchema(
  hrPolicyAcknowledgments,
);
export const hrSignRequestInsertSchema = createInsertSchema(hrSignRequests);
