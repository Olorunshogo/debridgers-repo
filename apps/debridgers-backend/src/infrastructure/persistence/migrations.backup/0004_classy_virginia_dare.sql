--> USING added by hand: drizzle-kit omits it and Postgres will not cast text to integer without one.
ALTER TABLE "product" ALTER COLUMN "measure_value" SET DATA TYPE integer USING NULLIF(trim("measure_value"), '')::integer;--> statement-breakpoint
ALTER TABLE "product" ADD CONSTRAINT "product_category_id_product_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."product_categories"("id") ON DELETE restrict ON UPDATE no action;
