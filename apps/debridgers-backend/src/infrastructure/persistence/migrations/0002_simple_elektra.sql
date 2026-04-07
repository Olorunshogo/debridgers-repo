CREATE TYPE "public"."kyc_status" AS ENUM('not_submitted', 'submitted', 'approved', 'rejected');--> statement-breakpoint
CREATE TABLE "inventory_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"quantity" integer NOT NULL,
	"source" text DEFAULT 'Agrolinking' NOT NULL,
	"notes" text,
	"recorded_by" integer,
	"updated_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "agent_profiles" ADD COLUMN "kyc_status" "kyc_status" DEFAULT 'not_submitted' NOT NULL;--> statement-breakpoint
ALTER TABLE "agent_profiles" ADD COLUMN "kyc_rejection_reason" text;--> statement-breakpoint
ALTER TABLE "inventory_records" ADD CONSTRAINT "inventory_records_recorded_by_users_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;