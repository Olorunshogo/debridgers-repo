ALTER TYPE "public"."order_status" ADD VALUE IF NOT EXISTS 'awaiting_quote' BEFORE 'pending';--> statement-breakpoint
ALTER TABLE "zones" ADD COLUMN IF NOT EXISTS "requires_quote" boolean DEFAULT false NOT NULL;
