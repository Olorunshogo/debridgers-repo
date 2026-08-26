-- Backfill order_reference and close the drift with the Drizzle schema.
--
-- 0011_early_epoch added the column as a nullable varchar(30) with a unique
-- constraint but no backfill, while orders.schema.ts has always declared it
-- .notNull(). Every order created before 0011 therefore carries NULL where the
-- types promise a string, which is what crashed the admin deliveries page when
-- it called .toLowerCase() on the value.
--
-- The backfill derives the reference from the primary key, so it is unique by
-- construction and stays inside the 30 character limit. New orders generate
-- their own ord_<random> reference at insert time.

UPDATE "orders"
SET "order_reference" = 'ord_' || lpad(to_hex("id"), 12, '0')
WHERE "order_reference" IS NULL;
--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "order_reference" SET NOT NULL;
