# CTO KPIs - This Quarter

The submitted scorecard. The working version with reasoning is
`docs/jottings/KPI.md`; the backlog is `docs/frontend/TASKS.md`.

**Revised 2026-08-29.**

---

## What closed since the last scorecard

Reported once, then dropped from the scorecard.

Checkout works end to end and is verified against live Paystack. The buyer
wallet, top-up, withdrawals and per-buyer virtual accounts shipped. Weekly agent
payouts run unattended on a cron. Order lifecycle now closes through delivered.
An automated test suite exists over the money paths, auth and pricing. Eight
silent money bugs were found and fixed before launch rather than after an
incident.

---

## 1. Commercial truth

**Every assumption under the business model replaced with a measured figure.**

Landed cost of goods for rice, beans and oil. Delivery cost per drop. Monthly
burn. GMV, AOV and repeat rate. Order channel mix.

This is first on purpose. One measured delivery already invalidated an estimate
by 38% and moved every number in the model; nine cost lines remain unmeasured.
None of this needs capital and only one item needs code. Until it exists, no
growth decision can be made honestly.

## 2. Pricing integrity

**The repriced fee structure live in production, and orders priced above cost.**

The old price list required buying a bag of rice 10.6% below market simply to
break even. The corrected pricing takes that below zero on six of seven hero
products, meaning they clear even at full market price. The code has shipped;
the production zone rows have not.

## 3. Customer growth and concentration

**From 2 repeat B2B accounts to 12 or more, at ₦3,000,000 monthly GMV.**

Two customers is a relationship, not a market, and one departure removes half the
business. This is a risk reduction target as much as a growth one.

## 4. Contribution margin

**Positive contribution at median order size, above 5%, measured rather than
modelled.**

The locked pricing returns 5.0% to 6.6% at an assumed 6% procurement spread.
Whether that spread is real is the single largest open question in the company.

## 5. Operational reliability

**Zero P0 production incidents per month.**

A P0 is anything that stops buyers ordering, agents requesting stock, or
payments processing.

## 6. Financial data integrity

**Every naira through Paystack reconciled and auditable.**

The platform holds and moves buyer and agent money. This is a baseline trust
requirement, not a stretch goal. Reconciliation runs every 15 minutes.

## 7. Security and data safety

**Monthly verified-restorable database backup, and no plaintext credentials
committed.**

The backup discipline has not started. The credentials KPI is **currently not
met**: test account credentials are committed and remain in git history.

## 8. Compliance groundwork

**A payments legal opinion on holding buyer balances, and a NAFDAC opinion
before the first bag is opened.**

Both have external lead times, so both start now rather than when needed. The
buyer wallet is parked as a promoted feature until the first lands.

---

## Deliberately not on this scorecard

- **Feature shipping cadence.** Suspended on purpose. Shipping features is not
  the constraint; measuring the business is
- **Agent network targets.** No agents recruited yet, deliberately. Blocked on
  confirming the commission level against a real procurement spread
- **Uptime SLA language.** Premature without on-call or redundancy. Reported as
  zero P0 incidents instead
- **Multi-year vision targets.** 200+ agents, 10 cities, a mobile app. Company
  direction, not a quarterly grading bar
- **Feature-by-feature backlog detail.** Tracked in `docs/frontend/TASKS.md`
