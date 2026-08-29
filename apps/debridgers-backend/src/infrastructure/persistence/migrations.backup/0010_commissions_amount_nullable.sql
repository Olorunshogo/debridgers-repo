-- The legacy naira column is kept for one release as a rollback safety net, but
-- nothing writes it any more. It has to stop being NOT NULL or every insert
-- that supplies only amount_kobo fails.
ALTER TABLE "commissions" ALTER COLUMN "amount" DROP NOT NULL;
