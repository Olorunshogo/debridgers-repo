CREATE TYPE "public"."hr_expense_category" AS ENUM('travel', 'meals', 'materials', 'client_entertainment', 'other');--> statement-breakpoint
CREATE TYPE "public"."hr_expense_status" AS ENUM('pending', 'manager_approved', 'hr_approved', 'rejected', 'reimbursed');--> statement-breakpoint
CREATE TYPE "public"."hr_incident_category" AS ENUM('safety', 'hr_issue', 'conflict', 'damage', 'other');--> statement-breakpoint
CREATE TYPE "public"."hr_incident_status" AS ENUM('reported', 'under_investigation', 'resolved', 'closed');--> statement-breakpoint
CREATE TYPE "public"."hr_pip_status" AS ENUM('active', 'passed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."hr_project_report_status" AS ENUM('draft', 'submitted', 'approved');--> statement-breakpoint
CREATE TYPE "public"."hr_review_status" AS ENUM('pending_self', 'pending_manager', 'completed');--> statement-breakpoint
CREATE TYPE "public"."hr_review_type" AS ENUM('annual', 'probation');--> statement-breakpoint
CREATE TYPE "public"."hr_sign_kind" AS ENUM('offer', 'contract', 'policy');--> statement-breakpoint
CREATE TYPE "public"."hr_sign_status" AS ENUM('pending', 'sent', 'signed', 'declined', 'expired');--> statement-breakpoint
CREATE TYPE "public"."hr_application_status" AS ENUM('received', 'screening', 'passed', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."hr_employee_status" AS ENUM('active', 'on_leave', 'probation', 'terminated');--> statement-breakpoint
CREATE TYPE "public"."hr_employment_type" AS ENUM('full_time', 'part_time', 'contract', 'agent');--> statement-breakpoint
CREATE TYPE "public"."hr_interview_status" AS ENUM('scheduled', 'completed', 'no_show', 'rescheduled');--> statement-breakpoint
CREATE TYPE "public"."hr_job_status" AS ENUM('open', 'closed', 'filled');--> statement-breakpoint
CREATE TYPE "public"."hr_leave_status" AS ENUM('pending', 'approved', 'rejected', 'on_leave');--> statement-breakpoint
CREATE TYPE "public"."hr_leave_type" AS ENUM('annual', 'sick', 'compassionate', 'personal');--> statement-breakpoint
CREATE TYPE "public"."hr_offer_status" AS ENUM('sent', 'accepted', 'rejected', 'expired');--> statement-breakpoint
CREATE TYPE "public"."hr_work_report_period" AS ENUM('daily', 'weekly', 'monthly');--> statement-breakpoint
CREATE TYPE "public"."hr_work_report_status" AS ENUM('draft', 'submitted', 'approved', 'rejected', 'revision_requested');--> statement-breakpoint
ALTER TYPE "public"."user_role" ADD VALUE 'hr';--> statement-breakpoint
ALTER TYPE "public"."user_role" ADD VALUE 'hiring_manager';--> statement-breakpoint
ALTER TYPE "public"."user_role" ADD VALUE 'applicant';--> statement-breakpoint
ALTER TYPE "public"."user_role" ADD VALUE 'employee';--> statement-breakpoint
CREATE TABLE "hr_expense_reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_user_id" integer NOT NULL,
	"description" text NOT NULL,
	"amount_kobo" integer NOT NULL,
	"expense_date" timestamp NOT NULL,
	"category" "hr_expense_category" NOT NULL,
	"receipt_url" text,
	"status" "hr_expense_status" DEFAULT 'pending' NOT NULL,
	"reviewer_user_id" integer,
	"reviewer_notes" text,
	"reviewed_at" timestamp,
	"updated_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "hr_incident_reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"reporter_user_id" integer NOT NULL,
	"occurred_at" timestamp NOT NULL,
	"description" text NOT NULL,
	"people_involved" text,
	"impact" text,
	"corrective_actions" text,
	"category" "hr_incident_category" NOT NULL,
	"critical" boolean DEFAULT false NOT NULL,
	"status" "hr_incident_status" DEFAULT 'reported' NOT NULL,
	"assignee_user_id" integer,
	"updated_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "hr_performance_plans" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_user_id" integer NOT NULL,
	"manager_user_id" integer NOT NULL,
	"goals" text NOT NULL,
	"timelines" text NOT NULL,
	"support" text,
	"success_criteria" text NOT NULL,
	"status" "hr_pip_status" DEFAULT 'active' NOT NULL,
	"due_at" timestamp NOT NULL,
	"outcome_notes" text,
	"closed_at" timestamp,
	"updated_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "hr_performance_reviews" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_user_id" integer NOT NULL,
	"manager_user_id" integer,
	"review_type" "hr_review_type" DEFAULT 'annual' NOT NULL,
	"due_at" timestamp NOT NULL,
	"status" "hr_review_status" DEFAULT 'pending_self' NOT NULL,
	"self_achievements" text,
	"self_learnings" text,
	"self_goals_met" text,
	"self_improvements" text,
	"self_next_goals" text,
	"self_submitted_at" timestamp,
	"manager_goals_met" boolean,
	"manager_rating" integer,
	"manager_feedback" text,
	"manager_submitted_at" timestamp,
	"probation_decision" varchar(32),
	"updated_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "hr_policies" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"slug" varchar(120) NOT NULL,
	"body" text NOT NULL,
	"document_url" text,
	"version" varchar(32) DEFAULT '1.0' NOT NULL,
	"effective_at" timestamp NOT NULL,
	"restricted" boolean DEFAULT false NOT NULL,
	"created_by" integer NOT NULL,
	"updated_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "hr_policy_acknowledgments" (
	"id" serial PRIMARY KEY NOT NULL,
	"policy_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"acknowledged_at" timestamp NOT NULL,
	"policy_version" varchar(32) NOT NULL,
	"updated_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "hr_project_status_reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_user_id" integer NOT NULL,
	"project_name" text NOT NULL,
	"progress_pct" integer DEFAULT 0 NOT NULL,
	"completed_items" text,
	"blockers" text,
	"next_steps" text,
	"status" "hr_project_report_status" DEFAULT 'draft' NOT NULL,
	"reviewer_user_id" integer,
	"reviewed_at" timestamp,
	"updated_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "hr_sign_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"kind" "hr_sign_kind" NOT NULL,
	"status" "hr_sign_status" DEFAULT 'pending' NOT NULL,
	"subject_user_id" integer NOT NULL,
	"application_id" integer,
	"policy_id" integer,
	"title" text NOT NULL,
	"sign_url" text,
	"external_id" text,
	"signed_document_url" text,
	"metadata" text,
	"created_by" integer NOT NULL,
	"signed_at" timestamp,
	"updated_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "hr_applications" (
	"id" serial PRIMARY KEY NOT NULL,
	"job_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"email" text NOT NULL,
	"phone" varchar(20) NOT NULL,
	"cv_url" text,
	"cover_letter" text,
	"status" "hr_application_status" DEFAULT 'received' NOT NULL,
	"notes" text,
	"updated_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "hr_employees" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"application_id" integer,
	"job_title" text NOT NULL,
	"department" text NOT NULL,
	"manager_user_id" integer,
	"start_date" timestamp NOT NULL,
	"employment_type" "hr_employment_type" DEFAULT 'full_time' NOT NULL,
	"status" "hr_employee_status" DEFAULT 'probation' NOT NULL,
	"work_location" text,
	"date_of_birth" timestamp,
	"home_address" text,
	"next_of_kin" text,
	"emergency_contact" text,
	"nin" varchar(32),
	"tax_id" varchar(64),
	"bank_account" text,
	"contract_url" text,
	"id_document_url" text,
	"certificates_urls" text,
	"updated_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "hr_interviews" (
	"id" serial PRIMARY KEY NOT NULL,
	"application_id" integer NOT NULL,
	"scheduled_at" timestamp NOT NULL,
	"location" text NOT NULL,
	"interviewer_user_id" integer,
	"status" "hr_interview_status" DEFAULT 'scheduled' NOT NULL,
	"rating" integer,
	"technical_score" integer,
	"culture_fit" integer,
	"feedback" text,
	"updated_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "hr_job_postings" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"department" text NOT NULL,
	"location" text NOT NULL,
	"description" text NOT NULL,
	"requirements" text NOT NULL,
	"salary_min_kobo" integer,
	"salary_max_kobo" integer,
	"status" "hr_job_status" DEFAULT 'open' NOT NULL,
	"created_by" integer NOT NULL,
	"updated_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "hr_leave_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_user_id" integer NOT NULL,
	"leave_type" "hr_leave_type" NOT NULL,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp NOT NULL,
	"reason" text NOT NULL,
	"coverage_plan" text,
	"status" "hr_leave_status" DEFAULT 'pending' NOT NULL,
	"reviewer_user_id" integer,
	"reviewer_notes" text,
	"reviewed_at" timestamp,
	"updated_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "hr_offers" (
	"id" serial PRIMARY KEY NOT NULL,
	"application_id" integer NOT NULL,
	"position" text NOT NULL,
	"salary_kobo" integer NOT NULL,
	"start_date" timestamp NOT NULL,
	"expires_at" timestamp NOT NULL,
	"benefits" text,
	"status" "hr_offer_status" DEFAULT 'sent' NOT NULL,
	"letter_snapshot" text,
	"updated_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "hr_work_activity_reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_user_id" integer NOT NULL,
	"period_type" "hr_work_report_period" DEFAULT 'weekly' NOT NULL,
	"period_start" timestamp NOT NULL,
	"period_end" timestamp NOT NULL,
	"tasks_completed" text NOT NULL,
	"milestones" text,
	"challenges" text,
	"next_steps" text,
	"status" "hr_work_report_status" DEFAULT 'draft' NOT NULL,
	"reviewer_user_id" integer,
	"reviewer_notes" text,
	"reviewed_at" timestamp,
	"updated_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "hr_expense_reports" ADD CONSTRAINT "hr_expense_reports_employee_user_id_users_id_fk" FOREIGN KEY ("employee_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_expense_reports" ADD CONSTRAINT "hr_expense_reports_reviewer_user_id_users_id_fk" FOREIGN KEY ("reviewer_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_incident_reports" ADD CONSTRAINT "hr_incident_reports_reporter_user_id_users_id_fk" FOREIGN KEY ("reporter_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_incident_reports" ADD CONSTRAINT "hr_incident_reports_assignee_user_id_users_id_fk" FOREIGN KEY ("assignee_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_performance_plans" ADD CONSTRAINT "hr_performance_plans_employee_user_id_users_id_fk" FOREIGN KEY ("employee_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_performance_plans" ADD CONSTRAINT "hr_performance_plans_manager_user_id_users_id_fk" FOREIGN KEY ("manager_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_performance_reviews" ADD CONSTRAINT "hr_performance_reviews_employee_user_id_users_id_fk" FOREIGN KEY ("employee_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_performance_reviews" ADD CONSTRAINT "hr_performance_reviews_manager_user_id_users_id_fk" FOREIGN KEY ("manager_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_policies" ADD CONSTRAINT "hr_policies_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_policy_acknowledgments" ADD CONSTRAINT "hr_policy_acknowledgments_policy_id_hr_policies_id_fk" FOREIGN KEY ("policy_id") REFERENCES "public"."hr_policies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_policy_acknowledgments" ADD CONSTRAINT "hr_policy_acknowledgments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_project_status_reports" ADD CONSTRAINT "hr_project_status_reports_employee_user_id_users_id_fk" FOREIGN KEY ("employee_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_project_status_reports" ADD CONSTRAINT "hr_project_status_reports_reviewer_user_id_users_id_fk" FOREIGN KEY ("reviewer_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_sign_requests" ADD CONSTRAINT "hr_sign_requests_subject_user_id_users_id_fk" FOREIGN KEY ("subject_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_sign_requests" ADD CONSTRAINT "hr_sign_requests_application_id_hr_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."hr_applications"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_sign_requests" ADD CONSTRAINT "hr_sign_requests_policy_id_hr_policies_id_fk" FOREIGN KEY ("policy_id") REFERENCES "public"."hr_policies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_sign_requests" ADD CONSTRAINT "hr_sign_requests_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_applications" ADD CONSTRAINT "hr_applications_job_id_hr_job_postings_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."hr_job_postings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_applications" ADD CONSTRAINT "hr_applications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_employees" ADD CONSTRAINT "hr_employees_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_employees" ADD CONSTRAINT "hr_employees_application_id_hr_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."hr_applications"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_employees" ADD CONSTRAINT "hr_employees_manager_user_id_users_id_fk" FOREIGN KEY ("manager_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_interviews" ADD CONSTRAINT "hr_interviews_application_id_hr_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."hr_applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_interviews" ADD CONSTRAINT "hr_interviews_interviewer_user_id_users_id_fk" FOREIGN KEY ("interviewer_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_job_postings" ADD CONSTRAINT "hr_job_postings_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_leave_requests" ADD CONSTRAINT "hr_leave_requests_employee_user_id_users_id_fk" FOREIGN KEY ("employee_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_leave_requests" ADD CONSTRAINT "hr_leave_requests_reviewer_user_id_users_id_fk" FOREIGN KEY ("reviewer_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_offers" ADD CONSTRAINT "hr_offers_application_id_hr_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."hr_applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_work_activity_reports" ADD CONSTRAINT "hr_work_activity_reports_employee_user_id_users_id_fk" FOREIGN KEY ("employee_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_work_activity_reports" ADD CONSTRAINT "hr_work_activity_reports_reviewer_user_id_users_id_fk" FOREIGN KEY ("reviewer_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "hr_expenses_employee_idx" ON "hr_expense_reports" USING btree ("employee_user_id");--> statement-breakpoint
CREATE INDEX "hr_expenses_status_idx" ON "hr_expense_reports" USING btree ("status");--> statement-breakpoint
CREATE INDEX "hr_incidents_reporter_idx" ON "hr_incident_reports" USING btree ("reporter_user_id");--> statement-breakpoint
CREATE INDEX "hr_incidents_status_idx" ON "hr_incident_reports" USING btree ("status");--> statement-breakpoint
CREATE INDEX "hr_pips_employee_idx" ON "hr_performance_plans" USING btree ("employee_user_id");--> statement-breakpoint
CREATE INDEX "hr_perf_reviews_employee_idx" ON "hr_performance_reviews" USING btree ("employee_user_id");--> statement-breakpoint
CREATE INDEX "hr_perf_reviews_status_idx" ON "hr_performance_reviews" USING btree ("status");--> statement-breakpoint
CREATE INDEX "hr_policies_slug_idx" ON "hr_policies" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "hr_policy_acks_user_idx" ON "hr_policy_acknowledgments" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "hr_policy_acks_policy_idx" ON "hr_policy_acknowledgments" USING btree ("policy_id");--> statement-breakpoint
CREATE INDEX "hr_project_reports_employee_idx" ON "hr_project_status_reports" USING btree ("employee_user_id");--> statement-breakpoint
CREATE INDEX "hr_sign_requests_subject_idx" ON "hr_sign_requests" USING btree ("subject_user_id");--> statement-breakpoint
CREATE INDEX "hr_sign_requests_status_idx" ON "hr_sign_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "hr_applications_job_idx" ON "hr_applications" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "hr_applications_user_idx" ON "hr_applications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "hr_applications_status_idx" ON "hr_applications" USING btree ("status");--> statement-breakpoint
CREATE INDEX "hr_employees_user_idx" ON "hr_employees" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "hr_employees_department_idx" ON "hr_employees" USING btree ("department");--> statement-breakpoint
CREATE INDEX "hr_employees_manager_idx" ON "hr_employees" USING btree ("manager_user_id");--> statement-breakpoint
CREATE INDEX "hr_interviews_application_idx" ON "hr_interviews" USING btree ("application_id");--> statement-breakpoint
CREATE INDEX "hr_job_postings_status_idx" ON "hr_job_postings" USING btree ("status");--> statement-breakpoint
CREATE INDEX "hr_leave_requests_employee_idx" ON "hr_leave_requests" USING btree ("employee_user_id");--> statement-breakpoint
CREATE INDEX "hr_leave_requests_status_idx" ON "hr_leave_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "hr_offers_application_idx" ON "hr_offers" USING btree ("application_id");--> statement-breakpoint
CREATE INDEX "hr_work_reports_employee_idx" ON "hr_work_activity_reports" USING btree ("employee_user_id");--> statement-breakpoint
CREATE INDEX "hr_work_reports_status_idx" ON "hr_work_activity_reports" USING btree ("status");