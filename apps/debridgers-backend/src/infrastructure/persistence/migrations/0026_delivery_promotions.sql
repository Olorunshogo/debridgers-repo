-- Free delivery an admin can actually run.
--
-- `free_delivery_until` in system_settings was read at checkout but was missing
-- from the admin write allowlist, so nothing could ever turn it on. It also
-- could not express a window with two ends, could not be scoped to a zone or to
-- a buyer's first order, and could not be joined to the orders it discounted.
--
-- `zones.free_delivery` is untouched. That is standing policy for one area and
-- keeps winning independently of any window here, so an area that is
-- permanently free does not start charging when a campaign ends.
--
-- Every statement is idempotent, so re-running changes nothing.

-- === Scope enum

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'delivery_promotion_scope') THEN
    CREATE TYPE "public"."delivery_promotion_scope" AS ENUM('global', 'zone', 'first_order');
  END IF;
END
$$;--> statement-breakpoint

-- === The campaigns themselves

CREATE TABLE IF NOT EXISTS "delivery_promotions" (
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
);--> statement-breakpoint

DO $$
BEGIN
  ALTER TABLE "delivery_promotions"
    ADD CONSTRAINT "delivery_promotions_zone_id_zones_id_fk"
    FOREIGN KEY ("zone_id") REFERENCES "public"."zones"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;--> statement-breakpoint

DO $$
BEGIN
  ALTER TABLE "delivery_promotions"
    ADD CONSTRAINT "delivery_promotions_created_by_admin_id_users_id_fk"
    FOREIGN KEY ("created_by_admin_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "delivery_promotions_is_active_starts_at_index"
  ON "delivery_promotions" USING btree ("is_active", "starts_at");--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "delivery_promotions_zone_id_index"
  ON "delivery_promotions" USING btree ("zone_id");--> statement-breakpoint

-- === What the discount cost
--
-- Recorded on every order rather than only the discounted ones, so a campaign's
-- cost is a single query afterwards instead of a reconstruction.

ALTER TABLE "orders"
  ADD COLUMN IF NOT EXISTS "delivery_fee_before_promo" integer DEFAULT 0 NOT NULL;--> statement-breakpoint

ALTER TABLE "orders"
  ADD COLUMN IF NOT EXISTS "delivery_promotion_id" integer;--> statement-breakpoint

DO $$
BEGIN
  ALTER TABLE "orders"
    ADD CONSTRAINT "orders_delivery_promotion_id_delivery_promotions_id_fk"
    FOREIGN KEY ("delivery_promotion_id") REFERENCES "public"."delivery_promotions"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;--> statement-breakpoint

-- Existing rows were charged the fee they recorded, so the pre-promotion figure
-- for them is that same fee. Left at the 0 default it would read as if every
-- historical order had been given away free.

UPDATE "orders"
  SET "delivery_fee_before_promo" = "delivery_fee"
  WHERE "delivery_fee_before_promo" = 0 AND "delivery_fee" > 0;
