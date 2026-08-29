# Paystack: Source of Truth

The single Paystack reference for Debridgers. Consolidated from `paystack_plan.md`, `PAYSTACK_IMPLEMENTATION_PLAN.md`, and `PAYSTACK_SIMPLE_PLAN.md`, all three of which are superseded by this file.

Those three were written at different times and **contradicted each other** on the central architectural question. Section 8 records what each proposed, what was actually built, and why, so no decision is lost.

Everything in section 1 was verified against the code, not copied forward from a plan.

Last verified: 2026-08-18

---

## 1. What is built

| Capability                          | Status | Where                                            |
| ----------------------------------- | ------ | ------------------------------------------------ |
| Payment initialisation              | Live   | `POST /payment/initialize`                       |
| Buyer order checkout                | Live   | `POST /buyer/orders/:id/pay`                     |
| Card and mobile money               | Live   | Paystack hosted checkout                         |
| Webhook handling, signed            | Live   | `POST /webhook`, `POST /payment/webhook`         |
| Agent subaccount creation           | Live   | `POST /payment/subaccount/:agentId`              |
| Split payment on agent stock orders | Live   | `payment.service.ts:50`                          |
| Dedicated virtual accounts (DVA)    | Live   | `paystack-dva.service.ts`                        |
| Bank list and account resolution    | Live   | `paystack-bank.service.ts`                       |
| Buyer wallet deposits               | Live   | `POST /buyer/wallet/deposit`                     |
| Buyer wallet withdrawals            | Live   | `withdrawal.service.ts`                          |
| Scheduled agent payouts             | Live   | `payout-scheduler.service.ts`, Fridays 10:00 UTC |
| Manual payout trigger               | Live   | `POST /payment/payout/run-weekly`                |
| Refund initiation                   | Live   | `POST /payment/refund`, `refund.service.ts`      |
| Commission ledger                   | Live   | `commissions` table, integer kobo                |
| Money ledger for buyer wallets      | Live   | `ledger.service.ts`                              |

Tables that exist: `payouts`, `refunds`, `disputes`, `withdrawals`, `wallets` (agent balances), `buyer_wallets`, `wallet_transactions`, `commissions`.

### Not built

| Capability                      | Notes                                                     |
| ------------------------------- | --------------------------------------------------------- |
| Dispute and chargeback handling | The `disputes` table exists; no webhook path populates it |
| Reconciliation dashboard        | Matching Paystack against the database                    |
| Direct charge without redirect  | Low effort, no demand yet                                 |
| Payment plans and instalments   | Not wanted at this stage                                  |
| BVN verification                | Optional extra KYC                                        |
| CSV or PDF export               | Part of the admin dashboard work                          |

---

## 2. Architecture as built

```
BUYER CHECKOUT
  Card or mobile money  ->  Paystack hosted checkout
  charge.success webhook -> order marked paid and confirmed
  No subaccount split: a buyer order has no agent attached

BUYER WALLET
  Deposit    -> Paystack transaction/initialize, or a DVA bank transfer
  Settlement -> charge.success webhook credits the wallet, exactly once
  Withdrawal -> Paystack Transfer API to the buyer's nominated bank
  All balances integer kobo, all movement through LedgerService

AGENT STOCK ORDERS
  Carries a subaccount split, so commission settles at Paystack level

AGENT EARNINGS
  Commission rows in `commissions`, integer kobo
  Agent balance in `wallets`
  Weekly sweep, Fridays 10:00 UTC, above MIN_PAYOUT_AMOUNT
  Paystack Transfer API to the agent's registered bank

REFUNDS
  Admin initiates -> Paystack refund API -> back to the original card
  Wallet-paid orders are NOT covered by this path. See section 7
```

---

## 3. What Paystack does and does not do

**Does:** payment initialisation, card and mobile money collection, split payments via subaccounts, transfers to bank accounts, dedicated virtual accounts, bank list and account name resolution, refunds, transaction history, automatic chargeback handling with webhook notification.

**Does not:** KYC. Paystack has a Verification API for BVN and card checks, but agent KYC here is admin manual review: email verification, document upload, admin approval or rejection. BVN lookup could be added as an extra check.

---

## 4. Configuration

```bash
# API keys, from Dashboard -> Settings -> API Keys & Webhooks
PAYSTACK_SECRET_KEY=sk_test_...     # sk_live_... in production
PAYSTACK_PUBLIC_KEY=pk_test_...     # pk_live_... in production

# Webhook signing secret, from Dashboard -> Settings -> Webhooks
PAYSTACK_WEBHOOK_SECRET=whsec_...

# Payouts
MIN_PAYOUT_AMOUNT="50000"           # kobo. See the unit warning below
PAYSTACK_PREFERRED_BANK=wema-bank   # DVA provider bank
```

`main.ts` refuses to boot with `PAYMENTS_SIMULATED=true` or an `sk_test_` key under `NODE_ENV=production`.

**Commission rates are no longer environment variables.** They live in `system_settings` and are admin-editable at runtime: `agent_override_rate_percent` (5) and `state_manager_override_rate_percent` (2), both referral overrides on a recruited agent's earnings, not the agent's own commission. `AGENT_COMMISSION_RATE` survives only as a boot fallback. All three superseded documents hardcoded a much higher fixed rate in the environment; that figure is dead.

> **Correction, 2026-08-29.** Base agent commission is not a percentage rate.
> It is a flat naira amount per package, keyed to product type: beans ₦1,200,
> rice ₦1,000, oil ₦700, everything else ₦400, held as bands in
> `agent-commission.ts`. An `agent_commission_rate` percentage setting
> described here in earlier revisions of this doc does not reflect that.

> **`TODO:` unit warning on MIN_PAYOUT_AMOUNT.** `.env.example:44` reads `"50000" # Minimum payout in kobo (₦5,000 = 50000 kobo)`. That comment is wrong: 50,000 kobo is **₦500**, not ₦5,000. `PAYSTACK_SIMPLE_PLAN.md` carried the same error and it propagated. Either the value should be `500000` for a ₦5,000 floor, or the comment should say ₦500. Decide which, because right now the code pays out at ₦500 while the documentation promises ₦5,000.

---

## 5. Webhook events

Verified by HMAC-SHA512 of the raw request body against `PAYSTACK_SECRET_KEY`, compared with `timingSafeEqual`.

| Event                   | Handled | Effect                                                               |
| ----------------------- | ------- | -------------------------------------------------------------------- |
| `charge.success`        | Yes     | Confirms an order payment, or credits a wallet deposit, exactly once |
| `transfer.success`      | Yes     | Marks a withdrawal or payout completed                               |
| `transfer.failed`       | Yes     | Reverses the debit back to the wallet                                |
| `transfer.reversed`     | Yes     | Reverses the debit back to the wallet                                |
| `refund.processed`      | Partial | Updates the `refunds` row. Does not credit a wallet                  |
| `charge.failed`         | No      | Order is left unpaid and swept by reconciliation                     |
| `charge.dispute.create` | No      | Code exists but is unrouted. See section 7                           |
| `chargeback.resolved`   | No      | Not implemented                                                      |

---

## 6. Operational notes

**Test versus live.** Always test with test keys and Paystack's test cards, which do not move real money. Switch to live keys only after an end-to-end pass; live keys need Paystack business verification.

**Settlement.** Funds land in the Paystack wallet immediately. Paystack settles to your bank usually within 24 hours. Agent and buyer payouts usually reach their banks within 24 hours.

**Subaccounts.** Each agent gets one, created on approval. The split applies to agent stock orders only.

**Agent communication.** Agents should understand that commission accrues to a tracked balance and is swept weekly on Fridays, rather than arriving instantly.

---

## 7. Known gaps in the money paths

1. **Refunds never return money to a buyer wallet.** `RefundService` calls the Paystack refund API against `order.payment_reference`, which only works for card payments. An order paid from wallet balance has no Paystack transaction to reverse, so a wallet-paid order cannot currently be refunded at all.
2. **The wallet-crediting refund handler is unrouted.** `buyer/payment.service.ts` `handlePaystackWebhook` has no caller, so `handleRefund`, `handleDispute`, and `resolveDispute` are dead code. The refund branch also carried a 100x units bug for its entire life, now fixed but still unreachable.
3. **Disputes are unhandled.** The table exists; nothing populates it.

---

## 8. How the three documents disagreed

Recorded so no reasoning is lost.

| Question          | `paystack_plan.md`  | `PAYSTACK_IMPLEMENTATION_PLAN.md`   | `PAYSTACK_SIMPLE_PLAN.md`   | Built                                              |
| ----------------- | ------------------- | ----------------------------------- | --------------------------- | -------------------------------------------------- |
| Subaccount splits | Keep                | **Remove entirely**                 | **Keep**                    | Kept, agent stock orders only                      |
| Agent balances    | Paystack wallet     | New `agent_balances` table          | Paystack subaccount balance | `wallets` table                                    |
| Virtual accounts  | Via SafeHaven       | Removed                             | Removed                     | **Rebuilt on Paystack DVA**                        |
| Bank name enquiry | Via SafeHaven       | Removed                             | Removed                     | **Rebuilt on Paystack**                            |
| Payout cadence    | Unspecified         | Configurable daily, weekly, monthly | Weekly, Friday 10:00        | Weekly, Friday 10:00 UTC                           |
| Payout floor      | Unspecified         | ₦500                                | "₦5,000" (miscalculated)    | 50,000 kobo, see section 4                         |
| Commission rate   | A fixed rate in env | Same fixed rate                     | Same fixed rate             | **Flat naira per package, banded by product type** |
| SafeHaven         | Present             | Remove                              | Remove                      | Removed                                            |

The middle document proposed a full teardown of subaccount splits in favour of a database-tracked balance, and the third proposed keeping splits and adding a weekly sweep. What shipped is closer to the third, plus the virtual account and bank resolution features that both later documents had written off as SafeHaven-only. Those turned out to be available directly from Paystack, so removing SafeHaven did not mean losing them.

Effort estimates from the superseded documents, 17 to 30 hours, are obsolete: most of that work is done.

---

## 9. Remaining work

Ordered by value.

1. **Refunds for wallet-paid orders.** Currently impossible. Section 7, item 1
2. **Dispute and chargeback handling.** Route `charge.dispute.create`, populate `disputes`, notify admin
3. **Admin dashboard.** Transactions, payouts, refunds, disputes, agent balances, CSV export
4. **Reconciliation.** Match Paystack transactions against the database on a schedule
5. **Resolve the `MIN_PAYOUT_AMOUNT` unit question** in section 4
6. Optional: BVN verification, direct charge without redirect

---

## 10. Superseded

This file replaces:

- `docs/backend/paystack_plan.md`
- `docs/backend/PAYSTACK_IMPLEMENTATION_PLAN.md`
- `docs/backend/PAYSTACK_SIMPLE_PLAN.md`

All three remain in git history. Nothing unique to them was dropped: their capability notes, environment variables, webhook lists, operational warnings, and open decisions are carried above, with stale figures corrected and marked.
