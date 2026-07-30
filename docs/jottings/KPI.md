# CTO KPIs - Debridgers

Finalized internal scorecard, grouped by function. Each KPI is tagged
**Attainable**, **Stretch**, or **Unreasonable** (see definitions at the
bottom), with the reasoning behind that tag so it can be revisited with full
context as the team and platform grow.

This is the detailed, working version of the scorecard. The condensed
version submitted upward lives in `docs/jottings/CTO-KPI-SUMMARY.md`; the
backlog and week-by-week build order backing these numbers live in
`docs/frontend/TASKS.md` and `docs/frontend/PLAN.md`.

Baseline assumption used throughout: small/solo engineering team, pre-launch
or early-beta stage, single-city (Kaduna) footprint, consignment model not yet
fully automated (wallet, referral, 2FA, favorites all still pending per
`docs/frontend/TASKS.md`).

---

## 1. Engineering Delivery

| KPI                                                             | Tag          | Why                                                                                                                        |
| --------------------------------------------------------------- | ------------ | -------------------------------------------------------------------------------------------------------------------------- |
| Ship 1-2 completed backlog items/week from TASKS.md             | Attainable   | Matches solo/small-team velocity; TASKS.md items are already scoped to endpoint + migration + frontend wiring granularity. |
| Zero P0 production incidents/month                              | Attainable   | Pre-launch/early traffic means blast radius is small; achievable with basic testing discipline.                            |
| 100% of new endpoints covered by at least one integration test  | Stretch      | Good target, but retrofitting existing untested endpoints (payment, wallet) will compete with feature work.                |
| Full CI pipeline (lint + typecheck + test) green on every merge | Attainable   | Already scriptable via existing `nx run-many` targets; just needs a GitHub Actions workflow wired up.                      |
| Sub-2-day turnaround from bug report to fix merged              | Stretch      | Feasible for a solo/small team only if bug volume stays low; will slip once user base grows past a few hundred.            |
| 90%+ TypeScript strict-mode coverage, zero `any` in new code    | Attainable   | Already a stated convention in this repo's own style rules - this is enforcement, not new work.                            |
| Weekly deploy cadence to production                             | Attainable   | Standard for a project this size with Nx build targets already in place.                                                   |
| Full test suite (unit + e2e) runtime under 5 minutes            | Unreasonable | Premature to target - there is close to no test suite yet (`test:e2e` exists but coverage is thin). Revisit post-buildout. |

---

## 2. Product / Feature Completion

| KPI                                                               | Tag          | Why                                                                                                                                                |
| ----------------------------------------------------------------- | ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Ship buyer wallet + Paystack top-up end-to-end this quarter       | Attainable   | Scoped fully in TASKS.md #9.1 - schema, 3 endpoints, webhook, frontend wiring. Bounded, known work.                                                |
| Ship agent referral + buyer referral system this quarter          | Stretch      | Larger surface area (TASKS.md #11.2-11.5): 2 referral flows, discount engine, landing page. Doable but tight for one quarter alongside other work. |
| Ship 2FA (TOTP) for buyer accounts this quarter                   | Stretch      | Security-critical, needs careful UX (login step) and isn't revenue-blocking - fine to slip a quarter if wallet/referral take priority.             |
| 100% feature parity between agent and buyer dashboards            | Unreasonable | The two roles have fundamentally different jobs (stock request vs. direct purchase) - parity is not the right goal at all, regardless of timeline. |
| Launch mobile app (iOS + Android) within 12 months                | Unreasonable | No mobile codebase exists today; this is a 5-year vision item (100k+ active users) in ONBOARDING.md, not a near-term KPI.                          |
| Real product photos for every catalog variety before next release | Attainable   | Explicitly flagged as a blocker in TASKS.md #7 notes - a content/ops task, not an engineering one, and fully within reach.                         |

---

## 3. Marketplace / Business Metrics

| KPI                                                                                             | Tag          | Why                                                                                                                                                                                       |
| ----------------------------------------------------------------------------------------------- | ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 10-20 active verified agents in Kaduna within 6 months                                          | Attainable   | Matches "starting in Kaduna" phase-1 scope in ONBOARDING.md; realistic for a manually-onboarded, KYC-gated agent network.                                                                 |
| Agents remit >90% of stock value within agreed window                                           | Attainable   | Operational/trust metric, not a coding one - achievable with the approval + remittance workflow already partly built.                                                                     |
| 200+ verified field agents                                                                      | Unreasonable | This is explicitly the **5-year (2031)** target in ONBOARDING.md. Treating it as a near-term KPI sets up guaranteed failure.                                                              |
| Presence in 10 major Northern Nigerian cities                                                   | Unreasonable | Same - 5-year target, not a current-quarter or current-year KPI.                                                                                                                          |
| Weekly published transparent pricing (public reference rates)                                   | Unreasonable | Depends on the 5-year scale and data pipeline described in ONBOARDING.md; no current infrastructure supports this yet.                                                                    |
| Order fulfillment time (agent stock request to buyer delivery) baseline established and tracked | Attainable   | You can start measuring this today with existing order/stock data - establishing the baseline is realistic even if the target itself isn't set yet.                                       |
| First 50 direct-to-buyer platform orders (non-agent-mediated)                                   | Stretch      | Blocked entirely today - checkout (TASKS.md #4) calls a backend endpoint that doesn't exist and 404s in production. This is a fix-first item, not a feature to schedule alongside others. |

---

## 4. Reliability / Ops

| KPI                                                                       | Tag          | Why                                                                                                                                                                       |
| ------------------------------------------------------------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 99.9% API uptime                                                          | Unreasonable | Standard SaaS SLA language, but disproportionate for current scale/team size - no on-call rotation, no redundancy built. A lower bar (e.g. 99%) is more honest right now. |
| Automated weekly Paystack payout cron running without manual intervention | Attainable   | Explicitly scoped in TASKS.md #9.2 - one cron job, bounded logic.                                                                                                         |
| Database backup verified restorable monthly                               | Attainable   | Low-effort, high-value discipline; no reason this can't start immediately.                                                                                                |
| Full disaster-recovery runbook with <1hr RTO                              | Unreasonable | Requires infra investment (standby DB, automated failover) that doesn't match a single-Postgres-instance early-stage setup.                                               |

---

## 5. Security & Financial Integrity

The platform now moves buyer and agent money through Paystack (payments,
payouts, and soon wallet top-ups), which makes this its own category rather
than a line item under Reliability/Ops.

| KPI                                                                                                    | Tag          | Why                                                                                                                                                                                                      |
| ------------------------------------------------------------------------------------------------------ | ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Every Paystack transaction (payment, payout, top-up) reconciled and auditable against internal records | Attainable   | Baseline trust requirement for handling money, not a stretch feature - achievable with existing webhook + transaction-log patterns.                                                                      |
| No plaintext credentials or secrets committed to the codebase                                          | Attainable   | Basic hygiene; `docs/jottings/CREDENTIALS.md` currently holds a plaintext test password in git history and should move to a secrets manager or `.env` (untracked).                                       |
| Formal security review before wallet top-up and 2FA ship                                               | Stretch      | Both touch money and account takeover risk directly; worth a deliberate review pass rather than shipping on the same cadence as UI features.                                                             |
| SOC2 / formal compliance certification                                                                 | Unreasonable | Requires dedicated compliance tooling, audits, and process maturity far beyond a small pre-launch team - revisit once there's real transaction volume and an investor/enterprise requirement driving it. |

---

## Category definitions

- **Attainable** = achievable within the current team size/stage with only the scoped work already visible in this repo's docs (TASKS.md, ONBOARDING.md).
- **Stretch** = plausible this year/quarter, but depends on prioritization tradeoffs against other Attainable items - can't do all Stretch items at once.
- **Unreasonable** = either a multi-year vision target being mistaken for a near-term KPI, or requires infrastructure/team investment that doesn't exist yet. Not "bad" KPIs - just wrong horizon for a CTO scorecard today.
