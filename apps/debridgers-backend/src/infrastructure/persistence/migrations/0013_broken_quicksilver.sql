ALTER TABLE "products" ADD COLUMN "category" text;--> statement-breakpoint
/* Categorise the launch catalogue, and give each product its photo. */
UPDATE "products" SET "category" = 'Rice',   "image_url" = COALESCE("image_url", '/images/products/rice-white.jpg')  WHERE "name" = 'Local White Rice';
--> statement-breakpoint
UPDATE "products" SET "category" = 'Rice',   "image_url" = COALESCE("image_url", '/images/products/rice-grains.jpg') WHERE "name" = 'Ofada Rice';
--> statement-breakpoint
UPDATE "products" SET "category" = 'Rice',   "image_url" = COALESCE("image_url", '/images/products/rice-bowl.jpg')   WHERE "name" = 'Tuwo Rice';
--> statement-breakpoint
UPDATE "products" SET "category" = 'Beans',  "image_url" = COALESCE("image_url", '/images/products/sweet-beans.jpg') WHERE "name" IN ('Wake Gida (Honey Beans)', 'Cowpea (White Beans)', 'Beans Ameria');
--> statement-breakpoint
UPDATE "products" SET "category" = 'Garri'  WHERE "name" ILIKE '%garri%';
--> statement-breakpoint
UPDATE "products" SET "category" = 'Oil',    "image_url" = COALESCE("image_url", '/images/products/pouring-oil.jpg') WHERE "name" IN ('Palm Oil', 'Groundnut Oil');
--> statement-breakpoint
UPDATE "products" SET "category" = 'Tubers', "image_url" = COALESCE("image_url", '/images/products/yams.jpg')        WHERE "name" = 'Yam';
--> statement-breakpoint
UPDATE "products" SET "category" = 'Tubers', "image_url" = COALESCE("image_url", '/images/products/potatoes.jpg')    WHERE "name" = 'Irish Potato';
