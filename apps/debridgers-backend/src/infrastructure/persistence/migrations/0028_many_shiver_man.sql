CREATE TYPE "public"."delivery_promotion_scope" AS ENUM('global', 'zone', 'first_order');--> statement-breakpoint
CREATE TABLE "delivery_promotions" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"scope" "delivery_promotion_scope" DEFAULT 'global' NOT NULL,
	"zone_id" integer,
	"starts_at" timestamp NOT NULL,
	"ends_at" timestamp NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by_admin_id" integer,
	"updated_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "newsletter_subscribers" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"updated_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "newsletter_subscribers_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "delivery_fee_before_promo" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "delivery_promotion_id" integer;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "delivery_recipient_name" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "terms_accepted_at" timestamp;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "terms_document" varchar(64);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "terms_version" varchar(32);--> statement-breakpoint
ALTER TABLE "delivery_promotions" ADD CONSTRAINT "delivery_promotions_zone_id_zones_id_fk" FOREIGN KEY ("zone_id") REFERENCES "public"."zones"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_promotions" ADD CONSTRAINT "delivery_promotions_created_by_admin_id_users_id_fk" FOREIGN KEY ("created_by_admin_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "delivery_promotions_is_active_starts_at_index" ON "delivery_promotions" USING btree ("is_active","starts_at");--> statement-breakpoint
CREATE INDEX "delivery_promotions_zone_id_index" ON "delivery_promotions" USING btree ("zone_id");--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_delivery_promotion_id_delivery_promotions_id_fk" FOREIGN KEY ("delivery_promotion_id") REFERENCES "public"."delivery_promotions"("id") ON DELETE set null ON UPDATE no action;