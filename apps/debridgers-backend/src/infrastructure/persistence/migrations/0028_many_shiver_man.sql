-- Newsletter sign-ups from the marketing site.
--
-- This file started life as a drizzle diff that also re-issued the delivery
-- promotion table, the scope enum, and the orders/users column adds that
-- hand-written 0025-0027 had already shipped. On any DB past 0026 that diff
-- aborted at CREATE TABLE "delivery_promotions" before it ever reached the one
-- genuinely new table, so POST /api/v1/newsletter kept 500ing on a missing
-- relation. Reduced to just the new table, made idempotent so it is safe
-- against both the live dev DB (already at 0027) and a fresh replay from 0000.

CREATE TABLE IF NOT EXISTS "newsletter_subscribers" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"updated_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "newsletter_subscribers_email_unique" UNIQUE("email")
);
