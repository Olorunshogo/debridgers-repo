CREATE TYPE "public"."admin_account_type" AS ENUM('platform', 'merchant', 'holding');--> statement-breakpoint
CREATE TYPE "public"."admin_transaction_status" AS ENUM('completed', 'pending', 'failed', 'reversed');--> statement-breakpoint
CREATE TYPE "public"."admin_transaction_type" AS ENUM('order_payment', 'vendor_payout', 'refund', 'manual_adjustment', 'platform_fee');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('wallet', 'card', 'transfer', 'ussd');--> statement-breakpoint
CREATE TYPE "public"."payment_record_status" AS ENUM('initiated', 'pending', 'completed', 'failed', 'reversed');--> statement-breakpoint
CREATE TABLE "admin_accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"account_type" "admin_account_type" DEFAULT 'platform' NOT NULL,
	"name" varchar(100) NOT NULL,
	"balance" integer DEFAULT 0 NOT NULL,
	"total_received" integer DEFAULT 0 NOT NULL,
	"total_paid_out" integer DEFAULT 0 NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admin_transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"admin_account_id" integer NOT NULL,
	"type" "admin_transaction_type" NOT NULL,
	"amount" integer NOT NULL,
	"status" "admin_transaction_status" DEFAULT 'completed' NOT NULL,
	"reference" varchar(100),
	"description" text,
	"related_user_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "buyer_admin_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"admin_id" integer NOT NULL,
	"buyer_id" integer NOT NULL,
	"action" varchar(50) NOT NULL,
	"details" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL,
	"buyer_id" integer NOT NULL,
	"amount_kobo" integer NOT NULL,
	"payment_method" "payment_method" NOT NULL,
	"status" "payment_record_status" DEFAULT 'initiated' NOT NULL,
	"paystack_reference" varchar(100),
	"paystack_transfer_code" varchar(100),
	"paystack_receipt_number" varchar(100),
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	CONSTRAINT "payment_records_paystack_reference_unique" UNIQUE("paystack_reference")
);
--> statement-breakpoint
ALTER TABLE "admin_transactions" ADD CONSTRAINT "admin_transactions_admin_account_id_admin_accounts_id_fk" FOREIGN KEY ("admin_account_id") REFERENCES "public"."admin_accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "buyer_admin_logs" ADD CONSTRAINT "buyer_admin_logs_admin_id_users_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "buyer_admin_logs" ADD CONSTRAINT "buyer_admin_logs_buyer_id_users_id_fk" FOREIGN KEY ("buyer_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_records" ADD CONSTRAINT "payment_records_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_records" ADD CONSTRAINT "payment_records_buyer_id_users_id_fk" FOREIGN KEY ("buyer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "admin_accounts_account_type_index" ON "admin_accounts" USING btree ("account_type");--> statement-breakpoint
CREATE INDEX "admin_accounts_created_at_index" ON "admin_accounts" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "admin_transactions_admin_account_id_index" ON "admin_transactions" USING btree ("admin_account_id");--> statement-breakpoint
CREATE INDEX "admin_transactions_type_index" ON "admin_transactions" USING btree ("type");--> statement-breakpoint
CREATE INDEX "admin_transactions_status_index" ON "admin_transactions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "admin_transactions_reference_index" ON "admin_transactions" USING btree ("reference");--> statement-breakpoint
CREATE INDEX "admin_transactions_created_at_index" ON "admin_transactions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "payment_records_order_id_index" ON "payment_records" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "payment_records_buyer_id_index" ON "payment_records" USING btree ("buyer_id");--> statement-breakpoint
CREATE INDEX "payment_records_paystack_reference_index" ON "payment_records" USING btree ("paystack_reference");--> statement-breakpoint
CREATE INDEX "payment_records_status_index" ON "payment_records" USING btree ("status");--> statement-breakpoint
CREATE INDEX "payment_records_created_at_index" ON "payment_records" USING btree ("created_at");--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "order_reference" varchar(30);
ALTER TABLE "orders" ADD COLUMN "paystack_invoice_code" varchar(100);--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "delivery_verified_at" timestamp;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "delivery_verified_by_admin_id" integer;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "delivery_proof_photos" jsonb;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "delivery_notes" text;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_delivery_verified_by_admin_id_users_id_fk" FOREIGN KEY ("delivery_verified_by_admin_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "orders" ADD CONSTRAINT "orders_order_reference_unique" UNIQUE("order_reference");
