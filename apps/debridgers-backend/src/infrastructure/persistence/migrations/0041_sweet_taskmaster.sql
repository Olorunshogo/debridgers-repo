ALTER TABLE "zones" ALTER COLUMN "distance_km" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "zones" DROP COLUMN "delivery_fee";--> statement-breakpoint
ALTER TABLE "zones" DROP COLUMN "tier_one_per_package_kobo";--> statement-breakpoint
ALTER TABLE "zones" DROP COLUMN "tier_two_per_package_kobo";--> statement-breakpoint
ALTER TABLE "zones" DROP COLUMN "delivery_cap_kobo";--> statement-breakpoint
ALTER TABLE "zones" DROP COLUMN "requires_quote";