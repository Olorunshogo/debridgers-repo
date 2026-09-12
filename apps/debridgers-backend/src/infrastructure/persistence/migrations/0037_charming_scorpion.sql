ALTER TABLE "stock_requests" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "stock_requests" ALTER COLUMN "status" SET DEFAULT 'pending'::text;--> statement-breakpoint
DROP TYPE "public"."stock_request_status";--> statement-breakpoint
CREATE TYPE "public"."stock_request_status" AS ENUM('pending', 'fulfilled');--> statement-breakpoint
ALTER TABLE "stock_requests" ALTER COLUMN "status" SET DEFAULT 'pending'::"public"."stock_request_status";--> statement-breakpoint
ALTER TABLE "stock_requests" ALTER COLUMN "status" SET DATA TYPE "public"."stock_request_status" USING "status"::"public"."stock_request_status";