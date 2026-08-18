-- Commissions move to integer kobo, matching every other balance in the system.
-- The old numeric naira column is kept for one release so a rollback does not
-- lose data; it is dropped in a later migration once this has run in production.
ALTER TABLE "commissions" ADD COLUMN IF NOT EXISTS "amount_kobo" integer;

UPDATE "commissions"
SET "amount_kobo" = ROUND("amount" * 100)::integer
WHERE "amount_kobo" IS NULL;

ALTER TABLE "commissions" ALTER COLUMN "amount_kobo" SET NOT NULL;
ALTER TABLE "commissions" ALTER COLUMN "amount_kobo" SET DEFAULT 0;

-- The earning month an override was calculated for. Null for commission types
-- that are not produced by the monthly run.
ALTER TABLE "commissions" ADD COLUMN IF NOT EXISTS "period" date;

-- Backfill a period for existing override rows so the unique index below can be
-- created without colliding on legacy data. Uses the month the row was written,
-- which is the month the old run would have been calculating for.
UPDATE "commissions"
SET "period" = date_trunc('month', "created_at")::date
WHERE "period" IS NULL
  AND "type" IN ('agent_override', 'state_manager_override');

-- Idempotency for the monthly cron. A second run in the same period collides
-- here instead of paying an override twice.
CREATE UNIQUE INDEX IF NOT EXISTS "uq_commission_override_period"
ON "commissions" ("agent_id", "type", "period")
WHERE "type" IN ('agent_override', 'state_manager_override');
