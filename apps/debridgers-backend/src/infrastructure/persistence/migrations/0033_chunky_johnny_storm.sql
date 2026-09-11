-- Rewritten by hand: drizzle-kit generated this as DROP+CREATE for every
-- hr_* table and enum (the interactive rename prompts were answered as
-- "new table" instead of "renamed"), which would have destroyed every row
-- in every staffing table on any database that already has data.
-- Every statement below is a rename instead - same end state, zero data loss.
-- FK constraints and existing indexes survive a table/type rename
-- automatically in Postgres, so they are not recreated here.

--> statement-breakpoint
ALTER TYPE "public"."hr_expense_category" RENAME TO "careers_expense_category";--> statement-breakpoint
ALTER TYPE "public"."hr_expense_status" RENAME TO "careers_expense_status";--> statement-breakpoint
ALTER TYPE "public"."hr_incident_category" RENAME TO "careers_incident_category";--> statement-breakpoint
ALTER TYPE "public"."hr_incident_status" RENAME TO "careers_incident_status";--> statement-breakpoint
ALTER TYPE "public"."hr_pip_status" RENAME TO "careers_pip_status";--> statement-breakpoint
ALTER TYPE "public"."hr_project_report_status" RENAME TO "careers_project_report_status";--> statement-breakpoint
ALTER TYPE "public"."hr_review_status" RENAME TO "careers_review_status";--> statement-breakpoint
ALTER TYPE "public"."hr_review_type" RENAME TO "careers_review_type";--> statement-breakpoint
ALTER TYPE "public"."hr_sign_kind" RENAME TO "careers_sign_kind";--> statement-breakpoint
ALTER TYPE "public"."hr_sign_status" RENAME TO "careers_sign_status";--> statement-breakpoint
ALTER TYPE "public"."hr_application_status" RENAME TO "careers_application_status";--> statement-breakpoint
ALTER TYPE "public"."hr_employee_status" RENAME TO "careers_employee_status";--> statement-breakpoint
ALTER TYPE "public"."hr_employment_type" RENAME TO "careers_employment_type";--> statement-breakpoint
ALTER TYPE "public"."hr_interview_status" RENAME TO "careers_interview_status";--> statement-breakpoint
ALTER TYPE "public"."hr_job_status" RENAME TO "careers_job_status";--> statement-breakpoint
ALTER TYPE "public"."hr_leave_status" RENAME TO "careers_leave_status";--> statement-breakpoint
ALTER TYPE "public"."hr_leave_type" RENAME TO "careers_leave_type";--> statement-breakpoint
ALTER TYPE "public"."hr_offer_status" RENAME TO "careers_offer_status";--> statement-breakpoint
ALTER TYPE "public"."hr_work_report_period" RENAME TO "careers_work_report_period";--> statement-breakpoint
ALTER TYPE "public"."hr_work_report_status" RENAME TO "careers_work_report_status";--> statement-breakpoint

ALTER TABLE "hr_expense_reports" RENAME TO "careers_expense_reports";--> statement-breakpoint
ALTER TABLE "hr_incident_reports" RENAME TO "careers_incident_reports";--> statement-breakpoint
ALTER TABLE "hr_performance_plans" RENAME TO "careers_performance_plans";--> statement-breakpoint
ALTER TABLE "hr_performance_reviews" RENAME TO "careers_performance_reviews";--> statement-breakpoint
ALTER TABLE "hr_policies" RENAME TO "careers_policies";--> statement-breakpoint
ALTER TABLE "hr_policy_acknowledgments" RENAME TO "careers_policy_acknowledgments";--> statement-breakpoint
ALTER TABLE "hr_project_status_reports" RENAME TO "careers_project_status_reports";--> statement-breakpoint
ALTER TABLE "hr_sign_requests" RENAME TO "careers_sign_requests";--> statement-breakpoint
ALTER TABLE "hr_applications" RENAME TO "careers_applications";--> statement-breakpoint
ALTER TABLE "hr_employees" RENAME TO "careers_employees";--> statement-breakpoint
ALTER TABLE "hr_interviews" RENAME TO "careers_interviews";--> statement-breakpoint
ALTER TABLE "hr_job_postings" RENAME TO "careers_job_postings";--> statement-breakpoint
ALTER TABLE "hr_leave_requests" RENAME TO "careers_leave_requests";--> statement-breakpoint
ALTER TABLE "hr_offers" RENAME TO "careers_offers";--> statement-breakpoint
ALTER TABLE "hr_work_activity_reports" RENAME TO "careers_work_activity_reports";--> statement-breakpoint

ALTER INDEX "hr_expenses_employee_idx" RENAME TO "careers_expenses_employee_idx";--> statement-breakpoint
ALTER INDEX "hr_expenses_status_idx" RENAME TO "careers_expenses_status_idx";--> statement-breakpoint
ALTER INDEX "hr_incidents_reporter_idx" RENAME TO "careers_incidents_reporter_idx";--> statement-breakpoint
ALTER INDEX "hr_incidents_status_idx" RENAME TO "careers_incidents_status_idx";--> statement-breakpoint
ALTER INDEX "hr_pips_employee_idx" RENAME TO "careers_pips_employee_idx";--> statement-breakpoint
ALTER INDEX "hr_perf_reviews_employee_idx" RENAME TO "careers_perf_reviews_employee_idx";--> statement-breakpoint
ALTER INDEX "hr_perf_reviews_status_idx" RENAME TO "careers_perf_reviews_status_idx";--> statement-breakpoint
ALTER INDEX "hr_policies_slug_idx" RENAME TO "careers_policies_slug_idx";--> statement-breakpoint
ALTER INDEX "hr_policy_acks_user_idx" RENAME TO "careers_policy_acks_user_idx";--> statement-breakpoint
ALTER INDEX "hr_policy_acks_policy_idx" RENAME TO "careers_policy_acks_policy_idx";--> statement-breakpoint
ALTER INDEX "hr_project_reports_employee_idx" RENAME TO "careers_project_reports_employee_idx";--> statement-breakpoint
ALTER INDEX "hr_sign_requests_subject_idx" RENAME TO "careers_sign_requests_subject_idx";--> statement-breakpoint
ALTER INDEX "hr_sign_requests_status_idx" RENAME TO "careers_sign_requests_status_idx";--> statement-breakpoint
ALTER INDEX "hr_applications_job_idx" RENAME TO "careers_applications_job_idx";--> statement-breakpoint
ALTER INDEX "hr_applications_user_idx" RENAME TO "careers_applications_user_idx";--> statement-breakpoint
ALTER INDEX "hr_applications_status_idx" RENAME TO "careers_applications_status_idx";--> statement-breakpoint
ALTER INDEX "hr_employees_user_idx" RENAME TO "careers_employees_user_idx";--> statement-breakpoint
ALTER INDEX "hr_employees_department_idx" RENAME TO "careers_employees_department_idx";--> statement-breakpoint
ALTER INDEX "hr_employees_manager_idx" RENAME TO "careers_employees_manager_idx";--> statement-breakpoint
ALTER INDEX "hr_interviews_application_idx" RENAME TO "careers_interviews_application_idx";--> statement-breakpoint
ALTER INDEX "hr_job_postings_status_idx" RENAME TO "careers_job_postings_status_idx";--> statement-breakpoint
ALTER INDEX "hr_leave_requests_employee_idx" RENAME TO "careers_leave_requests_employee_idx";--> statement-breakpoint
ALTER INDEX "hr_leave_requests_status_idx" RENAME TO "careers_leave_requests_status_idx";--> statement-breakpoint
ALTER INDEX "hr_offers_application_idx" RENAME TO "careers_offers_application_idx";--> statement-breakpoint
ALTER INDEX "hr_work_reports_employee_idx" RENAME TO "careers_work_reports_employee_idx";--> statement-breakpoint
ALTER INDEX "hr_work_reports_status_idx" RENAME TO "careers_work_reports_status_idx";--> statement-breakpoint

ALTER TABLE "users" ALTER COLUMN "role" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'buyer'::text;--> statement-breakpoint
DROP TYPE "public"."user_role";--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('admin', 'agent', 'buyer', 'company', 'applicant', 'employee');--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'buyer'::"public"."user_role";--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "role" SET DATA TYPE "public"."user_role" USING "role"::"public"."user_role";--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "admin_desk" varchar(20);
