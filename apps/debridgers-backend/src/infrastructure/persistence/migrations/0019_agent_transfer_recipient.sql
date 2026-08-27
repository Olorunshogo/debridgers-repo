-- Give agents a transfer recipient, which is what paying them actually needs.
--
-- Both agent payout paths - the Friday sweep in payout-scheduler.service and
-- the on-demand withdrawal in payment.service - passed
-- paystack_subaccount_code as the `recipient` on POST /transfer. A subaccount
-- (ACCT_...) is a split-payment destination for money coming IN; /transfer
-- requires a transfer recipient (RCP_...) for money going OUT. The two are not
-- interchangeable and the call could never have succeeded.
--
-- paystack_subaccount_code is deliberately left in place: subaccounts are a
-- real feature for revenue splitting and this column may be wanted for that.
-- It simply is not a payout destination.
--
-- The buyer side already models this correctly on buyer_wallets
-- (paystack_recipient_code, populated via paystack-bank.service createRecipient).
-- This brings agents onto the same footing.

ALTER TABLE "agent_profiles"
ADD COLUMN IF NOT EXISTS "paystack_recipient_code" varchar(100);

-- Widen lifetime money counters before they overflow.
--
-- Balances are kobo in a 4-byte integer, which caps at 2,147,483,647 - about
-- ₦21.4m. A running balance is unlikely to reach that, but total_earned and
-- total_deposited never decrease, so they get there on their own given enough
-- trading. bigint costs 4 more bytes per row and removes the ceiling.
ALTER TABLE "wallets"
  ALTER COLUMN "available_balance" TYPE bigint,
  ALTER COLUMN "pending_balance" TYPE bigint,
  ALTER COLUMN "total_earned" TYPE bigint;

ALTER TABLE "buyer_wallets"
  ALTER COLUMN "available_balance" TYPE bigint,
  ALTER COLUMN "pending_balance" TYPE bigint,
  ALTER COLUMN "total_deposited" TYPE bigint;
