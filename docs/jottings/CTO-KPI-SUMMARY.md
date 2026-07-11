# CTO KPIs - This Quarter

Submitted scorecard. The detailed engineering backlog and week-by-week
build plan live in `docs/frontend/TASKS.md` and `docs/frontend/PLAN.md` -
this is the outcome-level summary of that work.

---

## 1. Product Reliability

**Buyers can complete a purchase end-to-end, every time.**
Checkout is currently broken in production (payment initialization fails).
Target: fixed and verified within the first two weeks of this quarter, then
zero checkout-blocking incidents for the remainder of it.

## 2. Delivery Predictability

**Engineering ships 1-2 completed features per week, on a published cadence.**
Not "busy" - completed, deployed, and off the backlog. Reviewed monthly
against the shipping plan.

## 3. Operational Reliability

**Zero P0 production incidents per month.**
A P0 is anything that stops buyers from ordering, agents from requesting
stock, or payments from processing.

## 4. Payout Trust

**Agent commission payouts run automatically and on schedule, unattended.**
Currently manual-trigger only. Target: automated weekly payout live this
quarter, with zero missed or late payout cycles once it is.

## 5. Financial Data Integrity

**Every naira that moves through Paystack (payments, payouts, wallet
top-ups) is reconciled and auditable.**
Given the platform now holds and moves buyer/agent money, this is a
baseline trust and compliance requirement, not a stretch goal.

## 6. Security & Data Safety

**Monthly verified-restorable database backup, and no plaintext credentials
or secrets committed to the codebase.**
Baseline hygiene for a platform handling personal data and payment flows.

## 7. Market Growth (Kaduna Phase)

**10-20 active, verified field agents onboarded and remitting reliably
(>90% of stock value within the agreed window).**
This is the phase-1 target from the company's own 5/10-year growth plan
(`docs/jottings/ONBOARDING.md`) - a checkpoint on the way there, not the
destination.
