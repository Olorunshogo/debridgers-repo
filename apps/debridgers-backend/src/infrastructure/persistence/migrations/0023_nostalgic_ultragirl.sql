CREATE TYPE "public"."order_source" AS ENUM('self_serve', 'assisted', 'agent');--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "unit_price" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "handling_fee" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "order_source" "order_source" DEFAULT 'self_serve' NOT NULL;--> statement-breakpoint
ALTER TABLE "zones" ADD COLUMN "tier_one_per_package_kobo" integer DEFAULT 70000 NOT NULL;--> statement-breakpoint
ALTER TABLE "zones" ADD COLUMN "tier_two_per_package_kobo" integer DEFAULT 40000 NOT NULL;--> statement-breakpoint
ALTER TABLE "zones" ADD COLUMN "delivery_cap_kobo" integer DEFAULT 1000000 NOT NULL;