CREATE TYPE "public"."measure_unit" AS ENUM('kg', 'litre', 'piece');--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "measure_value" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "measure_unit" "measure_unit" DEFAULT 'kg' NOT NULL;--> statement-breakpoint
/* Structured measures for the launch catalogue, from the display labels. */
UPDATE "products" SET "measure_value" = 50,  "measure_unit" = 'kg'    WHERE "unit" = '50kg bag';
--> statement-breakpoint
UPDATE "products" SET "measure_value" = 25,  "measure_unit" = 'kg'    WHERE "unit" = '25kg bag';
--> statement-breakpoint
UPDATE "products" SET "measure_value" = 25,  "measure_unit" = 'litre' WHERE "unit" = '25 litre keg';
--> statement-breakpoint
UPDATE "products" SET "measure_value" = 100, "measure_unit" = 'piece' WHERE "unit" = '100 tubers';
--> statement-breakpoint
UPDATE "products" SET "measure_value" = 1,   "measure_unit" = 'piece' WHERE "unit" = 'Full Jumbo Bag';
