CREATE TYPE "public"."payment_status" AS ENUM('unpaid', 'awaiting', 'paid', 'failed');--> statement-breakpoint
CREATE TABLE "system_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"value" text NOT NULL,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "system_settings_key_unique" UNIQUE("key")
);
--> statement-breakpoint
ALTER TABLE "agent_profiles" ADD COLUMN "bank_code" varchar(10);--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "payment_status" "payment_status" DEFAULT 'unpaid' NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "payment_reference" varchar(100);--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "virtual_account_number" varchar(20);--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "virtual_account_bank" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "virtual_account_account_name" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "virtual_account_expires_at" timestamp;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "paid_at" timestamp;--> statement-breakpoint
ALTER TABLE "withdrawals" ADD COLUMN "bank_code" varchar(10) NOT NULL;--> statement-breakpoint
ALTER TABLE "withdrawals" ADD COLUMN "payout_reference" varchar(100);