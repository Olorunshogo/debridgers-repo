CREATE TYPE "public"."payment_transaction_status" AS ENUM('pending', 'completed', 'failed', 'cancelled');--> statement-breakpoint
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
ALTER TABLE "payments" ADD CONSTRAINT "payments_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "payments_order_id_index" ON "payments" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "payments_paystack_reference_index" ON "payments" USING btree ("paystack_reference");--> statement-breakpoint
CREATE INDEX "payments_our_reference_index" ON "payments" USING btree ("our_reference");--> statement-breakpoint
CREATE INDEX "payments_status_index" ON "payments" USING btree ("status");
