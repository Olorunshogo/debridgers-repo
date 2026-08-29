-- Add the three users columns the schema declares but no migration ever created.
--
-- users.schema.ts has had suspended_at, suspended_reason and total_deposited
-- since the 0011 snapshot, and the snapshot records them as present - so
-- drizzle-kit compares schema against snapshot, sees no difference, and reports
-- "nothing to migrate" while the real table lacks all three.
--
-- The effect was a hard 500 on every login: the users select lists every column
-- in the schema, so Postgres rejected the whole query with
-- `column "suspended_at" does not exist`.
--
-- IF NOT EXISTS so this is safe on any database that already picked them up.

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "suspended_at" timestamp;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "suspended_reason" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "total_deposited" integer DEFAULT 0 NOT NULL;
