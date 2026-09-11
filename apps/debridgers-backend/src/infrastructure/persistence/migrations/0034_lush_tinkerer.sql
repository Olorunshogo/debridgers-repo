ALTER TYPE "public"."order_status" ADD VALUE 'awaiting_quote' BEFORE 'pending';--> statement-breakpoint
ALTER TABLE "zones" ADD COLUMN "requires_quote" boolean DEFAULT false NOT NULL;