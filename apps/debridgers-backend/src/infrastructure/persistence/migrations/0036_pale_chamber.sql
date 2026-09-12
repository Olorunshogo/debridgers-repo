CREATE TYPE "public"."agent_wallet_transaction_status" AS ENUM('pending', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."agent_wallet_transaction_type" AS ENUM('credit', 'confirm', 'debit', 'refund', 'reversal');--> statement-breakpoint
ALTER TYPE "public"."commission_status" ADD VALUE 'reversed';--> statement-breakpoint
ALTER TYPE "public"."order_status" ADD VALUE 'delivery_failed' BEFORE 'delivered';--> statement-breakpoint
ALTER TYPE "public"."withdrawal_status" ADD VALUE 'processing' BEFORE 'rejected';--> statement-breakpoint
ALTER TYPE "public"."withdrawal_status" ADD VALUE 'failed' BEFORE 'paid';--> statement-breakpoint
CREATE TABLE "agent_wallet_transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"wallet_id" integer NOT NULL,
	"type" "agent_wallet_transaction_type" NOT NULL,
	"amount" integer NOT NULL,
	"status" "agent_wallet_transaction_status" DEFAULT 'completed' NOT NULL,
	"reference" varchar(255),
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "agent_wallet_transactions_reference_unique" UNIQUE("reference")
);
--> statement-breakpoint
ALTER TABLE "payouts" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "payouts" CASCADE;--> statement-breakpoint
ALTER TABLE "admin_invites" ADD COLUMN "revoked_at" timestamp;--> statement-breakpoint
ALTER TABLE "admin_invites" ADD COLUMN "revoked_by_admin_id" integer;--> statement-breakpoint
ALTER TABLE "commissions" ADD COLUMN "reversed_at" timestamp;--> statement-breakpoint
ALTER TABLE "commissions" ADD COLUMN "reversed_reason" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "delivery_failure_reason" text;--> statement-breakpoint
ALTER TABLE "withdrawals" ADD COLUMN "error_message" text;--> statement-breakpoint
ALTER TABLE "agent_wallet_transactions" ADD CONSTRAINT "agent_wallet_transactions_wallet_id_wallets_id_fk" FOREIGN KEY ("wallet_id") REFERENCES "public"."wallets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "agent_wallet_transactions_wallet_id_index" ON "agent_wallet_transactions" USING btree ("wallet_id");--> statement-breakpoint
CREATE INDEX "agent_wallet_transactions_status_index" ON "agent_wallet_transactions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "agent_wallet_transactions_created_at_index" ON "agent_wallet_transactions" USING btree ("created_at");--> statement-breakpoint
ALTER TABLE "admin_invites" ADD CONSTRAINT "admin_invites_revoked_by_admin_id_users_id_fk" FOREIGN KEY ("revoked_by_admin_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
DROP TYPE "public"."payout_status";