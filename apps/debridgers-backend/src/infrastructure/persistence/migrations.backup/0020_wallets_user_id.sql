-- Name the wallet owner the same thing in both wallet tables.
--
-- buyer_wallets keyed its owner as user_id; wallets keyed the identical
-- relationship - a row in users - as agent_id. Same concept, same foreign key,
-- two names, which is what made the two tables look like different things and
-- kept any shared wallet code from being written.
--
-- This is the expand half of merging them. After it, both tables have user_id
-- and the same balance columns, so a shared accessor can read either and the
-- eventual physical merge is a data copy rather than a rewrite. Nothing is
-- dropped here: the contract half belongs in its own deploy.

ALTER TABLE "wallets" RENAME COLUMN "agent_id" TO "user_id";

-- The constraint name outlives the column it was built on, so it is renamed
-- too rather than left describing a column that no longer exists.
ALTER TABLE "wallets" RENAME CONSTRAINT "uq_wallet_agent_id" TO "uq_wallet_user_id";
