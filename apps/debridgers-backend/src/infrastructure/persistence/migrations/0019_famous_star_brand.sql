CREATE TYPE "public"."wallet_transaction_status" AS ENUM('pending', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."wallet_transaction_type" AS ENUM('deposit', 'withdraw', 'refund');--> statement-breakpoint
CREATE TABLE "buyer_wallets" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"available_balance" integer DEFAULT 0 NOT NULL,
	"pending_balance" integer DEFAULT 0 NOT NULL,
	"total_deposited" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "buyer_wallets_user_id_unique" UNIQUE("user_id")
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
ALTER TABLE "users" ADD COLUMN "is_suspended" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "buyer_wallets" ADD CONSTRAINT "buyer_wallets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_wallet_id_buyer_wallets_id_fk" FOREIGN KEY ("wallet_id") REFERENCES "public"."buyer_wallets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "wallet_transactions_wallet_id_index" ON "wallet_transactions" USING btree ("wallet_id");--> statement-breakpoint
CREATE INDEX "wallet_transactions_status_index" ON "wallet_transactions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "wallet_transactions_created_at_index" ON "wallet_transactions" USING btree ("created_at");