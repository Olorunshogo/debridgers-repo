CREATE TYPE "public"."agent_id_type" AS ENUM('NIN', 'Passport', 'Drivers License');--> statement-breakpoint
CREATE TYPE "public"."campaign_status" AS ENUM('draft', 'sent');--> statement-breakpoint
CREATE TYPE "public"."campaign_target" AS ENUM('buyers', 'agents', 'all');--> statement-breakpoint
CREATE TYPE "public"."commission_type" AS ENUM('direct', 'buyer_referral', 'agent_override', 'state_manager_override');--> statement-breakpoint
CREATE TYPE "public"."order_mode" AS ENUM('field', 'referral');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('pending', 'confirmed', 'out_for_delivery', 'delivered', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."stock_request_status" AS ENUM('pending', 'fulfilled', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."withdrawal_status" AS ENUM('pending', 'approved', 'rejected', 'paid');--> statement-breakpoint
ALTER TYPE "public"."agent_status" ADD VALUE 'suspended';--> statement-breakpoint
ALTER TYPE "public"."commission_status" ADD VALUE 'confirmed' BEFORE 'paid';--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"admin_id" integer,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" integer,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
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
	"updated_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
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
CREATE TABLE "stock_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"agent_id" integer NOT NULL,
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
CREATE TABLE "wallets" (
	"id" serial PRIMARY KEY NOT NULL,
	"agent_id" integer NOT NULL,
	"available_balance" integer DEFAULT 0 NOT NULL,
	"pending_balance" integer DEFAULT 0 NOT NULL,
	"total_earned" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "uq_wallet_agent_id" UNIQUE("agent_id")
);
--> statement-breakpoint
CREATE TABLE "withdrawals" (
	"id" serial PRIMARY KEY NOT NULL,
	"agent_id" integer NOT NULL,
	"amount" integer NOT NULL,
	"bank_name" text NOT NULL,
	"bank_account_number" text NOT NULL,
	"bank_account_name" text NOT NULL,
	"status" "withdrawal_status" DEFAULT 'pending' NOT NULL,
	"rejection_reason" text,
	"processed_at" timestamp,
	"processed_by" integer,
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
	"areas" text[] DEFAULT '{}' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "commissions" DROP CONSTRAINT "commissions_report_id_sales_reports_id_fk";
--> statement-breakpoint
ALTER TABLE "agent_profiles" ADD COLUMN "state" text;--> statement-breakpoint
ALTER TABLE "agent_profiles" ADD COLUMN "lga" text;--> statement-breakpoint
ALTER TABLE "agent_profiles" ADD COLUMN "referred_by_agent_id" integer;--> statement-breakpoint
ALTER TABLE "agent_profiles" ADD COLUMN "referral_buyer_code" varchar(20);--> statement-breakpoint
ALTER TABLE "agent_profiles" ADD COLUMN "referral_agent_code" varchar(20);--> statement-breakpoint
ALTER TABLE "agent_profiles" ADD COLUMN "is_state_manager" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "agent_profiles" ADD COLUMN "managed_state" text;--> statement-breakpoint
ALTER TABLE "agent_profiles" ADD COLUMN "bank_name" text;--> statement-breakpoint
ALTER TABLE "agent_profiles" ADD COLUMN "bank_account_number" varchar(20);--> statement-breakpoint
ALTER TABLE "agent_profiles" ADD COLUMN "bank_account_name" text;--> statement-breakpoint
ALTER TABLE "agent_profiles" ADD COLUMN "id_type" "agent_id_type";--> statement-breakpoint
ALTER TABLE "agent_profiles" ADD COLUMN "id_front_url" text;--> statement-breakpoint
ALTER TABLE "agent_profiles" ADD COLUMN "id_selfie_url" text;--> statement-breakpoint
ALTER TABLE "agent_profiles" ADD COLUMN "mailtrap_contact_id" text;--> statement-breakpoint
ALTER TABLE "commissions" ADD COLUMN "order_id" integer;--> statement-breakpoint
ALTER TABLE "commissions" ADD COLUMN "type" "commission_type" NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "is_phone_verified" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "is_blocked" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "zone_id" integer;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "referred_by_agent_id" integer;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "mailtrap_contact_id" text;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_admin_id_users_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_sent_by_users_id_fk" FOREIGN KEY ("sent_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_buyer_id_users_id_fk" FOREIGN KEY ("buyer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_agent_id_users_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_zone_id_zones_id_fk" FOREIGN KEY ("zone_id") REFERENCES "public"."zones"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_rider_id_riders_id_fk" FOREIGN KEY ("rider_id") REFERENCES "public"."riders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "riders" ADD CONSTRAINT "riders_zone_id_zones_id_fk" FOREIGN KEY ("zone_id") REFERENCES "public"."zones"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_requests" ADD CONSTRAINT "stock_requests_agent_id_users_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_agent_id_users_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "withdrawals" ADD CONSTRAINT "withdrawals_agent_id_users_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "withdrawals" ADD CONSTRAINT "withdrawals_processed_by_users_id_fk" FOREIGN KEY ("processed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_profiles" ADD CONSTRAINT "agent_profiles_referred_by_agent_id_users_id_fk" FOREIGN KEY ("referred_by_agent_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commissions" DROP COLUMN "report_id";--> statement-breakpoint
ALTER TABLE "commissions" DROP COLUMN "rate";--> statement-breakpoint
ALTER TABLE "agent_profiles" ADD CONSTRAINT "uq_referral_buyer_code" UNIQUE("referral_buyer_code");--> statement-breakpoint
ALTER TABLE "agent_profiles" ADD CONSTRAINT "uq_referral_agent_code" UNIQUE("referral_agent_code");