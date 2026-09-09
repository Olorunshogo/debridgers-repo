import {
  pgTable,
  pgEnum,
  serial,
  integer,
  text,
  varchar,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { timestamps } from "../../helper/column.helper";
import { users } from "./users.schema";
import { createInsertSchema } from "drizzle-zod";

export const hrJobStatusEnum = pgEnum("hr_job_status", [
  "open",
  "closed",
  "filled",
]);

export const hrApplicationStatusEnum = pgEnum("hr_application_status", [
  "received",
  "screening",
  "passed",
  "rejected",
]);

export const hrInterviewStatusEnum = pgEnum("hr_interview_status", [
  "scheduled",
  "completed",
  "no_show",
  "rescheduled",
]);

export const hrOfferStatusEnum = pgEnum("hr_offer_status", [
  "sent",
  "accepted",
  "rejected",
  "expired",
]);

export const hrEmploymentTypeEnum = pgEnum("hr_employment_type", [
  "full_time",
  "part_time",
  "contract",
  "agent",
]);

export const hrEmployeeStatusEnum = pgEnum("hr_employee_status", [
  "active",
  "on_leave",
  "probation",
  "terminated",
]);

/*
 * Salary columns are kobo integers. created_by is the HR/admin user who opened
 * the posting. Soft-delete via deleted_at keeps closed history queryable.
 */
export const hrJobPostings = pgTable(
  "hr_job_postings",
  {
    id: serial().primaryKey().notNull(),
    title: text().notNull(),
    department: text().notNull(),
    location: text().notNull(),
    description: text().notNull(),
    requirements: text().notNull(),
    salary_min_kobo: integer(),
    salary_max_kobo: integer(),
    status: hrJobStatusEnum().notNull().default("open"),
    created_by: integer()
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    ...timestamps,
  },
  (table) => [index("hr_job_postings_status_idx").on(table.status)],
);

/*
 * user_id is the applicant account (role applicant, later employee). Email is
 * also stored so HR can read the form even if the user row is renamed later.
 */
export const hrApplications = pgTable(
  "hr_applications",
  {
    id: serial().primaryKey().notNull(),
    job_id: integer()
      .notNull()
      .references(() => hrJobPostings.id, { onDelete: "cascade" }),
    user_id: integer()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    first_name: text().notNull(),
    last_name: text().notNull(),
    email: text().notNull(),
    phone: varchar("phone", { length: 20 }).notNull(),
    cv_url: text(),
    cover_letter: text(),
    status: hrApplicationStatusEnum().notNull().default("received"),
    notes: text(),
    ...timestamps,
  },
  (table) => [
    index("hr_applications_job_idx").on(table.job_id),
    index("hr_applications_user_idx").on(table.user_id),
    index("hr_applications_status_idx").on(table.status),
  ],
);

export const hrInterviews = pgTable(
  "hr_interviews",
  {
    id: serial().primaryKey().notNull(),
    application_id: integer()
      .notNull()
      .references(() => hrApplications.id, { onDelete: "cascade" }),
    scheduled_at: timestamp().notNull(),
    location: text().notNull(),
    interviewer_user_id: integer().references(() => users.id, {
      onDelete: "set null",
    }),
    status: hrInterviewStatusEnum().notNull().default("scheduled"),
    rating: integer(),
    technical_score: integer(),
    culture_fit: integer(),
    feedback: text(),
    ...timestamps,
  },
  (table) => [index("hr_interviews_application_idx").on(table.application_id)],
);

export const hrOffers = pgTable(
  "hr_offers",
  {
    id: serial().primaryKey().notNull(),
    application_id: integer()
      .notNull()
      .references(() => hrApplications.id, { onDelete: "cascade" }),
    position: text().notNull(),
    salary_kobo: integer().notNull(),
    start_date: timestamp().notNull(),
    expires_at: timestamp().notNull(),
    benefits: text(),
    status: hrOfferStatusEnum().notNull().default("sent"),
    letter_snapshot: text(),
    ...timestamps,
  },
  (table) => [index("hr_offers_application_idx").on(table.application_id)],
);

export const hrEmployees = pgTable(
  "hr_employees",
  {
    id: serial().primaryKey().notNull(),
    user_id: integer()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    application_id: integer().references(() => hrApplications.id, {
      onDelete: "set null",
    }),
    job_title: text().notNull(),
    department: text().notNull(),
    manager_user_id: integer().references(() => users.id, {
      onDelete: "set null",
    }),
    start_date: timestamp().notNull(),
    employment_type: hrEmploymentTypeEnum().notNull().default("full_time"),
    status: hrEmployeeStatusEnum().notNull().default("probation"),
    work_location: text(),
    date_of_birth: timestamp(),
    home_address: text(),
    next_of_kin: text(),
    emergency_contact: text(),
    nin: varchar("nin", { length: 32 }),
    tax_id: varchar("tax_id", { length: 64 }),
    bank_account: text(),
    contract_url: text(),
    id_document_url: text(),
    certificates_urls: text(),
    ...timestamps,
  },
  (table) => [
    index("hr_employees_user_idx").on(table.user_id),
    index("hr_employees_department_idx").on(table.department),
    index("hr_employees_manager_idx").on(table.manager_user_id),
  ],
);

export const hrLeaveTypeEnum = pgEnum("hr_leave_type", [
  "annual",
  "sick",
  "compassionate",
  "personal",
]);

export const hrLeaveStatusEnum = pgEnum("hr_leave_status", [
  "pending",
  "approved",
  "rejected",
  "on_leave",
]);

export const hrLeaveRequests = pgTable(
  "hr_leave_requests",
  {
    id: serial().primaryKey().notNull(),
    employee_user_id: integer()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    leave_type: hrLeaveTypeEnum().notNull(),
    start_date: timestamp().notNull(),
    end_date: timestamp().notNull(),
    reason: text().notNull(),
    coverage_plan: text(),
    status: hrLeaveStatusEnum().notNull().default("pending"),
    reviewer_user_id: integer().references(() => users.id, {
      onDelete: "set null",
    }),
    reviewer_notes: text(),
    reviewed_at: timestamp(),
    ...timestamps,
  },
  (table) => [
    index("hr_leave_requests_employee_idx").on(table.employee_user_id),
    index("hr_leave_requests_status_idx").on(table.status),
  ],
);

export const hrWorkReportPeriodEnum = pgEnum("hr_work_report_period", [
  "daily",
  "weekly",
  "monthly",
]);

export const hrWorkReportStatusEnum = pgEnum("hr_work_report_status", [
  "draft",
  "submitted",
  "approved",
  "rejected",
  "revision_requested",
]);

export const hrWorkActivityReports = pgTable(
  "hr_work_activity_reports",
  {
    id: serial().primaryKey().notNull(),
    employee_user_id: integer()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    period_type: hrWorkReportPeriodEnum().notNull().default("weekly"),
    period_start: timestamp().notNull(),
    period_end: timestamp().notNull(),
    tasks_completed: text().notNull(),
    milestones: text(),
    challenges: text(),
    next_steps: text(),
    status: hrWorkReportStatusEnum().notNull().default("draft"),
    reviewer_user_id: integer().references(() => users.id, {
      onDelete: "set null",
    }),
    reviewer_notes: text(),
    reviewed_at: timestamp(),
    ...timestamps,
  },
  (table) => [
    index("hr_work_reports_employee_idx").on(table.employee_user_id),
    index("hr_work_reports_status_idx").on(table.status),
  ],
);

export const hrJobPostingInsertSchema = createInsertSchema(hrJobPostings);
export const hrApplicationInsertSchema = createInsertSchema(hrApplications);
export const hrInterviewInsertSchema = createInsertSchema(hrInterviews);
export const hrOfferInsertSchema = createInsertSchema(hrOffers);
export const hrEmployeeInsertSchema = createInsertSchema(hrEmployees);
export const hrLeaveRequestInsertSchema = createInsertSchema(hrLeaveRequests);
export const hrWorkActivityReportInsertSchema = createInsertSchema(
  hrWorkActivityReports,
);
