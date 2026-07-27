CREATE TABLE "order_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL,
	"product_id" integer NOT NULL,
	"quantity" integer NOT NULL,
	"unit_price_kobo" integer NOT NULL,
	"updated_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "order_items_order_idx" ON "order_items" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "order_items_product_idx" ON "order_items" USING btree ("product_id");--> statement-breakpoint
/*
  Backfill: every pre-existing order becomes a single line item.

  `orders` never recorded a product, only quantity + unit_price, so the product
  is recovered by matching unit_price against products.price_kobo. Where no
  price matches, it falls back to the beans product the single-product flow was
  built around. Guarded by NOT EXISTS so re-running is harmless.
*/
INSERT INTO "order_items" ("order_id", "product_id", "quantity", "unit_price_kobo")
SELECT
  o."id",
  COALESCE(
    (SELECT p."id" FROM "products" p
      WHERE p."price_kobo" = o."unit_price"
      ORDER BY p."id" LIMIT 1),
    (SELECT p."id" FROM "products" p
      WHERE p."name" ILIKE '%beans%'
      ORDER BY p."id" LIMIT 1)
  ),
  o."quantity",
  o."unit_price"
FROM "orders" o
WHERE NOT EXISTS (
  SELECT 1 FROM "order_items" oi WHERE oi."order_id" = o."id"
);
