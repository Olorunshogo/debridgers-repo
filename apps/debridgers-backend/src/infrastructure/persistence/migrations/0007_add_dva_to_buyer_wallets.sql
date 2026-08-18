ALTER TABLE "buyer_wallets" ADD COLUMN IF NOT EXISTS "paystack_customer_code" varchar(100);
ALTER TABLE "buyer_wallets" ADD COLUMN IF NOT EXISTS "account_number" varchar(20);
ALTER TABLE "buyer_wallets" ADD COLUMN IF NOT EXISTS "bank_name" varchar(100);
ALTER TABLE "buyer_wallets" ADD COLUMN IF NOT EXISTS "account_name" varchar(100);
