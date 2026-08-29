-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TYPE "public"."admin_account_type" AS ENUM('platform', 'merchant', 'holding');--> statement-breakpoint
CREATE TYPE "public"."admin_transaction_status" AS ENUM('completed', 'pending', 'failed', 'reversed');--> statement-breakpoint
CREATE TYPE "public"."admin_transaction_type" AS ENUM('order_payment', 'vendor_payout', 'refund', 'manual_adjustment', 'platform_fee');--> statement-breakpoint
CREATE TYPE "public"."agent_id_type" AS ENUM('NIN', 'Passport', 'Drivers License');--> statement-breakpoint
CREATE TYPE "public"."agent_status" AS ENUM('pending', 'approved', 'rejected', 'suspended');--> statement-breakpoint
CREATE TYPE "public"."campaign_status" AS ENUM('draft', 'sent');--> statement-breakpoint
CREATE TYPE "public"."campaign_target" AS ENUM('buyers', 'agents', 'all');--> statement-breakpoint
CREATE TYPE "public"."commission_status" AS ENUM('pending', 'confirmed', 'paid');--> statement-breakpoint
CREATE TYPE "public"."commission_type" AS ENUM('direct', 'buyer_referral', 'agent_override', 'state_manager_override');--> statement-breakpoint
CREATE TYPE "public"."dispute_status" AS ENUM('initiated', 'under_review', 'resolved', 'won', 'lost');--> statement-breakpoint
CREATE TYPE "public"."dispute_type" AS ENUM('chargeback', 'customer_complaint', 'refund_dispute');--> statement-breakpoint
CREATE TYPE "public"."kyc_status" AS ENUM('not_submitted', 'submitted', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."order_mode" AS ENUM('field', 'referral');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('pending', 'confirmed', 'out_for_delivery', 'delivered', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('wallet', 'card', 'transfer', 'ussd');--> statement-breakpoint
CREATE TYPE "public"."payment_record_status" AS ENUM('initiated', 'pending', 'completed', 'failed', 'reversed');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('unpaid', 'awaiting', 'paid', 'failed');--> statement-breakpoint
CREATE TYPE "public"."payment_transaction_status" AS ENUM('pending', 'completed', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."payout_status" AS ENUM('pending', 'processing', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."refund_status" AS ENUM('initiated', 'processing', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."stock_request_status" AS ENUM('pending', 'fulfilled', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('admin', 'agent', 'buyer', 'company');--> statement-breakpoint
CREATE TYPE "public"."wallet_transaction_status" AS ENUM('pending', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."wallet_transaction_type" AS ENUM('deposit', 'withdraw', 'refund');--> statement-breakpoint
CREATE TYPE "public"."withdrawal_status" AS ENUM('pending', 'approved', 'rejected', 'paid');--> statement-breakpoint
CREATE TABLE "buyer_wallets" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"available_balance" bigint DEFAULT 0 NOT NULL,
	"pending_balance" bigint DEFAULT 0 NOT NULL,
	"total_deposited" bigint DEFAULT 0 NOT NULL,
	"updated_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"paystack_customer_code" varchar(100),
	"account_number" varchar(20),
	"bank_name" varchar(100),
	"account_name" varchar(100),
	"payout_bank_code" varchar(10),
	"payout_bank_name" varchar(100),
	"payout_account_number" varchar(20),
	"payout_account_name" varchar(100),
	"paystack_recipient_code" varchar(100),
	CONSTRAINT "buyer_wallets_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "cart_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"product_id" integer NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"updated_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "commissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"agent_id" integer NOT NULL,
	"order_id" integer,
	"type" "commission_type" NOT NULL,
	"amount" numeric(12, 2),
	"status" "commission_status" DEFAULT 'pending' NOT NULL,
	"paid_at" timestamp,
	"updated_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"amount_kobo" integer DEFAULT 0 NOT NULL,
	"period" date
);
--> statement-breakpoint
CREATE TABLE "campaigns" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"subject" text NOT NULL,
	"body" text NOT NULL,
	"target_list" "campaign_target" NOT NULL,
	"mailtrap_campaign_id" text,
	"status" "campaign_status" DEFAULT 'draft' NOT NULL,
	"sent_at" timestamp,
	"sent_by" integer,
	"updated_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "agent_profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"address" text,
	"state" text,
	"lga" text,
	"status" "agent_status" DEFAULT 'pending' NOT NULL,
	"admin_notes" text,
	"referred_by_agent_id" integer,
	"referral_buyer_code" varchar(20),
	"referral_agent_code" varchar(20),
	"is_state_manager" boolean DEFAULT false NOT NULL,
	"managed_state" text,
	"bank_name" text,
	"bank_code" varchar(10),
	"bank_account_number" varchar(20),
	"bank_account_name" text,
	"kyc_status" "kyc_status" DEFAULT 'not_submitted' NOT NULL,
	"kyc_rejection_reason" text,
	"id_type" "agent_id_type",
	"id_front_url" text,
	"id_selfie_url" text,
	"nin" varchar(20),
	"cv_url" text,
	"target" integer DEFAULT 0 NOT NULL,
	"paystack_subaccount_code" varchar(100),
	"mailtrap_contact_id" text,
	"updated_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"paystack_recipient_code" varchar(100),
	CONSTRAINT "uq_agent_user_id" UNIQUE("user_id"),
	CONSTRAINT "uq_referral_buyer_code" UNIQUE("referral_buyer_code"),
	CONSTRAINT "uq_referral_agent_code" UNIQUE("referral_agent_code")
);
--> statement-breakpoint
CREATE TABLE "favorites" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"product_id" integer NOT NULL,
	"updated_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
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
CREATE TABLE "leads" (
	"id" serial PRIMARY KEY NOT NULL,
	"full_name" varchar(200) NOT NULL,
	"email" varchar(255) NOT NULL,
	"message" text NOT NULL,
	"updated_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "outreach_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"shop_name" text NOT NULL,
	"owner_name" text,
	"phone" text,
	"lga" text,
	"area" text,
	"address" text,
	"product_interest" text,
	"quantity" integer,
	"notes" text,
	"collected_by" text,
	"visit_date" text NOT NULL,
	"updated_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
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
	CONSTRAINT "payouts_reference_unique" UNIQUE("reference")
);
--> statement-breakpoint
CREATE TABLE "product_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"parent_id" integer,
	"description" text,
	"image_url" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL,
	"product_id" integer NOT NULL,
	"quantity" integer NOT NULL,
	"unit_price_kobo" integer NOT NULL,
	"updated_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"read" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"type" text DEFAULT 'general' NOT NULL,
	"done" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"buyer_id" integer NOT NULL,
	"agent_id" integer,
	"zone_id" integer NOT NULL,
	"rider_id" integer,
	"quantity" integer NOT NULL,
	"unit_price" integer DEFAULT 140000 NOT NULL,
	"handling_fee" integer DEFAULT 10000 NOT NULL,
	"delivery_fee" integer NOT NULL,
	"total_amount" integer NOT NULL,
	"order_mode" "order_mode" NOT NULL,
	"status" "order_status" DEFAULT 'pending' NOT NULL,
	"delivery_address" text NOT NULL,
	"cancellation_reason" text,
	"notes" text,
	"delivered_at" timestamp,
	"payment_status" "payment_status" DEFAULT 'unpaid' NOT NULL,
	"payment_reference" varchar(100),
	"virtual_account_number" varchar(20),
	"virtual_account_bank" text,
	"virtual_account_account_name" text,
	"virtual_account_expires_at" timestamp,
	"paid_at" timestamp,
	"updated_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"order_reference" varchar(30) NOT NULL,
	"paystack_invoice_code" varchar(100),
	"delivery_verified_at" timestamp,
	"delivery_verified_by_admin_id" integer,
	"delivery_proof_photos" jsonb,
	"delivery_notes" text,
	CONSTRAINT "orders_order_reference_unique" UNIQUE("order_reference")
);
--> statement-breakpoint
CREATE TABLE "riders" (
	"id" serial PRIMARY KEY NOT NULL,
	"full_name" text NOT NULL,
	"phone" varchar(20) NOT NULL,
	"zone_id" integer,
	"is_available" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
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
	CONSTRAINT "refunds_reference_unique" UNIQUE("reference")
);
--> statement-breakpoint
CREATE TABLE "stock_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"agent_id" integer NOT NULL,
	"product_id" integer,
	"quantity" integer NOT NULL,
	"status" "stock_request_status" DEFAULT 'pending' NOT NULL,
	"amount_to_remit" integer NOT NULL,
	"amount_remitted" integer DEFAULT 0 NOT NULL,
	"fulfilled_at" timestamp,
	"updated_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "simple_products" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"unit" text NOT NULL,
	"price_kobo" integer NOT NULL,
	"description" text,
	"image_url" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "product" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"unit" text NOT NULL,
	"price_kobo" integer NOT NULL,
	"measure_value" integer,
	"measure_unit" text,
	"weight_grams" integer,
	"category" text DEFAULT 'Uncategorized' NOT NULL,
	"category_id" integer,
	"description" text,
	"image_url" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"deleted_at" timestamp,
	"updated_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"stock_quantity" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sales_reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"agent_id" integer NOT NULL,
	"pages_sold" integer DEFAULT 0 NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"notes" text,
	"updated_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "system_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"value" text NOT NULL,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "system_settings_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "wallet_transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"wallet_id" integer NOT NULL,
	"type" "wallet_transaction_type" NOT NULL,
	"amount" integer NOT NULL,
	"status" "wallet_transaction_status" NOT NULL,
	"reference" varchar(255),
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "wallet_transactions_reference_unique" UNIQUE("reference")
);
--> statement-breakpoint
CREATE TABLE "wallets" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"available_balance" bigint DEFAULT 0 NOT NULL,
	"pending_balance" bigint DEFAULT 0 NOT NULL,
	"total_earned" bigint DEFAULT 0 NOT NULL,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "uq_wallet_user_id" UNIQUE("user_id")
);
--> statement-breakpoint
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
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "zones" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"delivery_fee" integer NOT NULL,
	"areas" text[] DEFAULT '{""}' NOT NULL,
	"free_delivery" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "withdrawals" (
	"id" serial PRIMARY KEY NOT NULL,
	"agent_id" integer NOT NULL,
	"amount" integer NOT NULL,
	"bank_name" text NOT NULL,
	"bank_code" varchar(10) NOT NULL,
	"bank_account_number" text NOT NULL,
	"bank_account_name" text NOT NULL,
	"payout_reference" varchar(100),
	"status" "withdrawal_status" DEFAULT 'pending' NOT NULL,
	"rejection_reason" text,
	"processed_at" timestamp,
	"processed_by" integer,
	"updated_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL,
	"our_reference" varchar(100),
	"paystack_reference" varchar(100),
	"amount_kobo" integer NOT NULL,
	"status" "payment_transaction_status" DEFAULT 'pending' NOT NULL,
	"payment_method" varchar(50) DEFAULT 'paystack',
	"paid_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"email" text NOT NULL,
	"phone" varchar(20),
	"password" varchar(256),
	"role" "user_role" DEFAULT 'buyer' NOT NULL,
	"is_email_verified" boolean DEFAULT false NOT NULL,
	"is_phone_verified" boolean DEFAULT false NOT NULL,
	"is_blocked" boolean DEFAULT false NOT NULL,
	"is_suspended" boolean DEFAULT false NOT NULL,
	"zone_id" integer,
	"delivery_address" text,
	"referred_by_agent_id" integer,
	"avatar_url" text,
	"mailtrap_contact_id" text,
	"refresh_token" text,
	"email_notifications" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"suspended_at" timestamp,
	"suspended_reason" text,
	"total_deposited" integer DEFAULT 0 NOT NULL,
	"admin_tier" varchar(20),
	"admin_api_key" varchar(255),
	"must_change_password" boolean DEFAULT false NOT NULL,
	"password_changed_at" timestamp,
	CONSTRAINT "users_admin_api_key_unique" UNIQUE("admin_api_key")
);
--> statement-breakpoint
CREATE TABLE "email_verification" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now(),
	"attempts" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "password_resets" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "admin_audit_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"admin_id" integer,
	"action" text NOT NULL,
	"resource_type" text NOT NULL,
	"resource_id" integer,
	"details" jsonb,
	"ip_address" varchar(45),
	"user_agent" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admin_api_keys" (
	"id" serial PRIMARY KEY NOT NULL,
	"admin_id" integer NOT NULL,
	"key_hash" text NOT NULL,
	"name" varchar(255) NOT NULL,
	"last_used_at" timestamp,
	"is_active" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"revoked_at" timestamp
);
--> statement-breakpoint
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
CREATE TABLE "admin_invites" (
	"id" serial PRIMARY KEY NOT NULL,
	"invite_code" varchar(32) NOT NULL,
	"email" varchar(255) NOT NULL,
	"invited_by_admin_id" integer NOT NULL,
	"used_at" timestamp,
	"used_by_admin_id" integer,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "admin_invites_invite_code_unique" UNIQUE("invite_code")
);
--> statement-breakpoint
ALTER TABLE "buyer_wallets" ADD CONSTRAINT "buyer_wallets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_agent_id_users_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_sent_by_users_id_fk" FOREIGN KEY ("sent_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_profiles" ADD CONSTRAINT "agent_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_profiles" ADD CONSTRAINT "agent_profiles_referred_by_agent_id_users_id_fk" FOREIGN KEY ("referred_by_agent_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_records" ADD CONSTRAINT "inventory_records_recorded_by_users_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_agent_id_users_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_categories" ADD CONSTRAINT "product_categories_parent_id_product_categories_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."product_categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_buyer_id_users_id_fk" FOREIGN KEY ("buyer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_agent_id_users_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_zone_id_zones_id_fk" FOREIGN KEY ("zone_id") REFERENCES "public"."zones"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_rider_id_riders_id_fk" FOREIGN KEY ("rider_id") REFERENCES "public"."riders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_delivery_verified_by_admin_id_users_id_fk" FOREIGN KEY ("delivery_verified_by_admin_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "riders" ADD CONSTRAINT "riders_zone_id_zones_id_fk" FOREIGN KEY ("zone_id") REFERENCES "public"."zones"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_initiated_by_users_id_fk" FOREIGN KEY ("initiated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_requests" ADD CONSTRAINT "stock_requests_agent_id_users_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_requests" ADD CONSTRAINT "stock_requests_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product" ADD CONSTRAINT "product_category_id_product_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."product_categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_reports" ADD CONSTRAINT "sales_reports_agent_id_users_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_wallet_id_buyer_wallets_id_fk" FOREIGN KEY ("wallet_id") REFERENCES "public"."buyer_wallets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_resolved_by_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "withdrawals" ADD CONSTRAINT "withdrawals_agent_id_users_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "withdrawals" ADD CONSTRAINT "withdrawals_processed_by_users_id_fk" FOREIGN KEY ("processed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_verification" ADD CONSTRAINT "email_verification_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "password_resets" ADD CONSTRAINT "password_resets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_audit_log" ADD CONSTRAINT "admin_audit_log_admin_id_users_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_api_keys" ADD CONSTRAINT "admin_api_keys_admin_id_users_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_transactions" ADD CONSTRAINT "admin_transactions_admin_account_id_admin_accounts_id_fk" FOREIGN KEY ("admin_account_id") REFERENCES "public"."admin_accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "buyer_admin_logs" ADD CONSTRAINT "buyer_admin_logs_admin_id_users_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "buyer_admin_logs" ADD CONSTRAINT "buyer_admin_logs_buyer_id_users_id_fk" FOREIGN KEY ("buyer_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_records" ADD CONSTRAINT "payment_records_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_records" ADD CONSTRAINT "payment_records_buyer_id_users_id_fk" FOREIGN KEY ("buyer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_invites" ADD CONSTRAINT "admin_invites_invited_by_admin_id_users_id_fk" FOREIGN KEY ("invited_by_admin_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_invites" ADD CONSTRAINT "admin_invites_used_by_admin_id_users_id_fk" FOREIGN KEY ("used_by_admin_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "cart_items_user_product_idx" ON "cart_items" USING btree ("user_id" int4_ops,"product_id" int4_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "favorites_user_product_idx" ON "favorites" USING btree ("user_id" int4_ops,"product_id" int4_ops);--> statement-breakpoint
CREATE INDEX "order_items_order_idx" ON "order_items" USING btree ("order_id" int4_ops);--> statement-breakpoint
CREATE INDEX "order_items_product_idx" ON "order_items" USING btree ("product_id" int4_ops);--> statement-breakpoint
CREATE INDEX "notifications_user_read_idx" ON "notifications" USING btree ("user_id" int4_ops,"read" int4_ops);--> statement-breakpoint
CREATE INDEX "wallet_transactions_created_at_index" ON "wallet_transactions" USING btree ("created_at" timestamp_ops);--> statement-breakpoint
CREATE INDEX "wallet_transactions_status_index" ON "wallet_transactions" USING btree ("status" enum_ops);--> statement-breakpoint
CREATE INDEX "wallet_transactions_wallet_id_index" ON "wallet_transactions" USING btree ("wallet_id" int4_ops);--> statement-breakpoint
CREATE INDEX "payments_order_id_index" ON "payments" USING btree ("order_id" int4_ops);--> statement-breakpoint
CREATE INDEX "payments_our_reference_index" ON "payments" USING btree ("our_reference" text_ops);--> statement-breakpoint
CREATE INDEX "payments_paystack_reference_index" ON "payments" USING btree ("paystack_reference" text_ops);--> statement-breakpoint
CREATE INDEX "payments_status_index" ON "payments" USING btree ("status" enum_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree (lower(email) text_ops);--> statement-breakpoint
CREATE INDEX "admin_audit_log_admin_id_index" ON "admin_audit_log" USING btree ("admin_id" int4_ops);--> statement-breakpoint
CREATE INDEX "admin_audit_log_created_at_index" ON "admin_audit_log" USING btree ("created_at" timestamp_ops);--> statement-breakpoint
CREATE INDEX "admin_audit_log_resource_type_resource_id_index" ON "admin_audit_log" USING btree ("resource_type" text_ops,"resource_id" int4_ops);--> statement-breakpoint
CREATE INDEX "admin_accounts_account_type_index" ON "admin_accounts" USING btree ("account_type" enum_ops);--> statement-breakpoint
CREATE INDEX "admin_accounts_created_at_index" ON "admin_accounts" USING btree ("created_at" timestamp_ops);--> statement-breakpoint
CREATE INDEX "admin_transactions_admin_account_id_index" ON "admin_transactions" USING btree ("admin_account_id" int4_ops);--> statement-breakpoint
CREATE INDEX "admin_transactions_created_at_index" ON "admin_transactions" USING btree ("created_at" timestamp_ops);--> statement-breakpoint
CREATE INDEX "admin_transactions_reference_index" ON "admin_transactions" USING btree ("reference" text_ops);--> statement-breakpoint
CREATE INDEX "admin_transactions_status_index" ON "admin_transactions" USING btree ("status" enum_ops);--> statement-breakpoint
CREATE INDEX "admin_transactions_type_index" ON "admin_transactions" USING btree ("type" enum_ops);--> statement-breakpoint
CREATE INDEX "payment_records_buyer_id_index" ON "payment_records" USING btree ("buyer_id" int4_ops);--> statement-breakpoint
CREATE INDEX "payment_records_created_at_index" ON "payment_records" USING btree ("created_at" timestamp_ops);--> statement-breakpoint
CREATE INDEX "payment_records_order_id_index" ON "payment_records" USING btree ("order_id" int4_ops);--> statement-breakpoint
CREATE INDEX "payment_records_paystack_reference_index" ON "payment_records" USING btree ("paystack_reference" text_ops);--> statement-breakpoint
CREATE INDEX "payment_records_status_index" ON "payment_records" USING btree ("status" enum_ops);
*/