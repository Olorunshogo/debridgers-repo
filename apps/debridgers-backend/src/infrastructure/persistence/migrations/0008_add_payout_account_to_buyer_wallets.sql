ALTER TABLE "buyer_wallets" ADD COLUMN IF NOT EXISTS "payout_bank_code" varchar(10);
ALTER TABLE "buyer_wallets" ADD COLUMN IF NOT EXISTS "payout_bank_name" varchar(100);
ALTER TABLE "buyer_wallets" ADD COLUMN IF NOT EXISTS "payout_account_number" varchar(20);
ALTER TABLE "buyer_wallets" ADD COLUMN IF NOT EXISTS "payout_account_name" varchar(100);
ALTER TABLE "buyer_wallets" ADD COLUMN IF NOT EXISTS "paystack_recipient_code" varchar(100);
