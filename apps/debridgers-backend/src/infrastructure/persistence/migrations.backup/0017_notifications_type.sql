-- Give notifications a kind.
--
-- Every row rendered identically because the table carried only title and
-- description. The dashboards need to tell an order update from a payout at a
-- glance, and the shared notifications component keys its icon and colour off
-- this column.
--
-- Existing rows default to 'general', then the backfill below re-derives the
-- obvious ones from the titles the service has been writing all along. Those
-- titles are generated, not user input, so matching on them is safe.

ALTER TABLE "notifications"
ADD COLUMN IF NOT EXISTS "type" text NOT NULL DEFAULT 'general';

-- Third state, alongside the existing boolean rather than replacing it.
--
-- The list has three states: unread, read, and done ("handled, stop showing it
-- to me"). Collapsing that into one status column would mean rewriting every
-- existing `read` predicate across the services and both dashboards, so `done`
-- rides beside `read` and the API derives the status: done, else read, else
-- unread. Marking done implies read, which the service enforces on write.
ALTER TABLE "notifications"
ADD COLUMN IF NOT EXISTS "done" boolean NOT NULL DEFAULT false;

UPDATE "notifications"
SET "type" = 'payment'
WHERE "type" = 'general'
  AND "title" LIKE 'Payment Confirmed%';

UPDATE "notifications"
SET "type" = 'wallet'
WHERE "type" = 'general'
  AND "title" LIKE 'Wallet %';

UPDATE "notifications"
SET "type" = 'order'
WHERE "type" = 'general'
  AND "title" LIKE 'Order #%';

-- Unread-by-user is the only read path the notification list and the bell
-- badge ever take, and both run on every dashboard page load.
CREATE INDEX IF NOT EXISTS "notifications_user_read_idx"
ON "notifications" ("user_id", "read");
