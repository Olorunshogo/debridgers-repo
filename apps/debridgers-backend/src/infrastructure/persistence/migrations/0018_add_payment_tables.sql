-- Create enums for payouts, refunds, and disputes
CREATE TYPE "public"."payout_status" AS ENUM('pending', 'processing', 'completed', 'failed');
CREATE TYPE "public"."refund_status" AS ENUM('initiated', 'processing', 'completed', 'failed');
CREATE TYPE "public"."dispute_status" AS ENUM('initiated', 'under_review', 'resolved', 'won', 'lost');
CREATE TYPE "public"."dispute_type" AS ENUM('chargeback', 'customer_complaint', 'refund_dispute');

-- Create payouts table for tracking weekly agent withdrawals
CREATE TABLE "payouts" (
	"id" serial PRIMARY KEY NOT NULL,
	"agent_id" integer NOT NULL,
	"subaccount_code" varchar(50),
	"amount" numeric(12, 2) NOT NULL,
	"reference" varchar(100) NOT NULL,
	"status" "payout_status" DEFAULT 'pending' NOT NULL,
	"initiated_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"error_message" text,
	"updated_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "payouts_reference_unique" UNIQUE("reference"),
	CONSTRAINT "payouts_agent_id_users_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."users"("id") ON DELETE cascade
);

-- Create refunds table for customer refunds
CREATE TABLE "refunds" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"reference" varchar(100) NOT NULL,
	"reason" varchar(255),
	"status" "refund_status" DEFAULT 'initiated' NOT NULL,
	"initiated_by" integer,
	"initiated_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"updated_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "refunds_reference_unique" UNIQUE("reference"),
	CONSTRAINT "refunds_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade,
	CONSTRAINT "refunds_initiated_by_users_id_fk" FOREIGN KEY ("initiated_by") REFERENCES "public"."users"("id") ON DELETE set null
);

-- Create disputes table for chargebacks and disputes
CREATE TABLE "disputes" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL,
	"type" "dispute_type" NOT NULL,
	"status" "dispute_status" DEFAULT 'initiated' NOT NULL,
	"reason" text,
	"paystack_reference" varchar(100),
	"initiated_at" timestamp DEFAULT now() NOT NULL,
	"resolved_at" timestamp,
	"resolution_notes" text,
	"resolved_by" integer,
	"updated_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "disputes_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade,
	CONSTRAINT "disputes_resolved_by_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id") ON DELETE set null
);
