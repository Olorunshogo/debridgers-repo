# CTO KPIs - Debridgers

The detailed internal scorecard. The condensed version submitted upward is
`CTO-KPI-SUMMARY.md`. The engineering backlog behind these numbers is
`docs/frontend/TASKS.md`. The economics behind the business metrics are in
`docs/business/BusinessModel.md`.

Each KPI is tagged **Attainable**, **Stretch**, or **Unreasonable**, with the
reasoning kept so the tag can be revisited rather than re-argued.

**Baseline:** four people, none salaried, two of whom are also the only
developers. Single city. Early revenue: 10+ orders to 2 B2B customers. Feature
work is deliberately halted in favour of commercial measurement.

**Revised 2026-08-29.**

---

## Already met, no longer scored

Kept as one line each so the scorecard stays short and the history stays
findable.

- Buyers can complete a purchase end to end; checkout works and is verified live
- Buyer wallet and Paystack top-up shipped end to end
- Automated weekly payout cron running unattended
- Commission rate driven by `system_settings`, changeable without a deploy
- Live Paystack round trip verified for checkout, withdrawals, virtual accounts
- Automated test suite exists: money paths, auth and pricing, isolated database
- Order lifecycle closed through delivered, with fulfilment timestamps

---

## 1. Engineering delivery

| KPI                                                       | Tag           | Why                                                                                     |
| --------------------------------------------------------- | ------------- | --------------------------------------------------------------------------------------- |
| Zero P0 production incidents per month                    | Attainable    | Early traffic means a small blast radius                                                |
| Full CI green on every merge, lint and typecheck and test | Attainable    | Scriptable with existing `nx run-many`; needs the workflow wired                        |
| 90%+ strict-mode coverage, zero `any` in new code         | Attainable    | Enforcement of an existing convention, not new work                                     |
| Weekly deploy cadence                                     | Attainable    | Standard at this size                                                                   |
| Every new endpoint covered by at least one test           | Stretch       | Retrofitting the older untested endpoints competes with feature work                    |
| Sub-2-day bug report to merged fix                        | Stretch       | Holds only while bug volume stays low                                                   |
| Ship 1-2 backlog items per week                           | **Suspended** | Deliberately paused. Shipping features is not the constraint; measuring the business is |
| Full suite runtime under 5 minutes                        | Unreasonable  | Premature while coverage is still being built out                                       |

---

## 2. Product

| KPI                                               | Tag          | Why                                                                                    |
| ------------------------------------------------- | ------------ | -------------------------------------------------------------------------------------- |
| Real product photos for every catalogue variety   | Attainable   | A content and operations task, and the last thing making the catalogue look unfinished |
| Ship unpaid-order recovery this quarter           | Attainable   | Bounded: one card, one row action, a re-price, a cron                                  |
| Ship agent and buyer referral this quarter        | Stretch      | Two flows, a discount engine, a landing page. Also needs its numbers re-costed first   |
| Ship 2FA for buyer accounts this quarter          | Stretch      | Security-critical, not revenue-blocking. Fine to slip                                  |
| Feature parity between agent and buyer dashboards | Unreasonable | The roles have different jobs. Parity is the wrong goal, not a distant one             |
| Launch a mobile app within 12 months              | Unreasonable | No mobile codebase. A 5-year item                                                      |

---

## 3. Commercial truth

New category, and currently the most important one. Every figure in the business
model rests on assumptions that only counting can settle. **None of these need
capital and only one needs code.**

| KPI                                                   | Tag        | Why                                                                       |
| ----------------------------------------------------- | ---------- | ------------------------------------------------------------------------- |
| Landed cost of goods measured for rice, beans and oil | Attainable | Three supplier invoices each. One morning                                 |
| Contribution margin per order, computed and tracked   | Attainable | Arithmetic on figures the measurement above produces                      |
| Delivery cost per drop logged on every delivery       | Attainable | A logbook. One measured trip already invalidated a ₦2,500 estimate by 38% |
| Monthly burn recorded, and therefore runway           | Attainable | One month of outgoings                                                    |
| `order_source` recorded on every order, backfilled    | Attainable | One column. The data is unrecoverable later                               |
| GMV, AOV and repeat rate reported monthly             | Attainable | A query against orders that already exist                                 |
| Order admin minutes measured for two weeks            | Stretch    | Needs discipline more than effort. Decides whether the 3% fee holds       |
| Inbound haulage per bag recorded                      | Attainable | A column on the supplier register                                         |

---

## 4. Market growth, Kaduna phase

| KPI                                                                               | Tag          | Why                                                                                                       |
| --------------------------------------------------------------------------------- | ------------ | --------------------------------------------------------------------------------------------------------- |
| 12+ repeat B2B accounts                                                           | Attainable   | From 2 today. The primary 90-day objective, and a concentration fix as much as growth                     |
| ₦3,000,000 monthly GMV                                                            | Stretch      | Roughly 10 orders at restaurant size. Reachable, not assured                                              |
| Positive contribution margin at median order size, above 5%                       | Attainable   | The locked pricing delivers 5.0% to 6.6% at a 6% spread, and stays positive even at a 0% spread           |
| 3+ reliable suppliers per hero product, documented                                | Attainable   | Removes single-supplier dependence before it matters                                                      |
| 60%+ of B2B accounts reordering within 45 days                                    | Stretch      | B2B repeat should be far higher than B2C. If it is not, the product is wrong                              |
| Monthly contribution profit covers cash costs, imputed rent and a founder stipend | Stretch      | The expansion gate. Full market salaries need ₦9.3m to ₦18.4m GMV and are the separate profitability goal |
| 10-20 active verified agents remitting above 95%                                  | **Deferred** | No agents yet, deliberately. Blocked on the commission level and the remit fix                            |
| First 50 direct platform orders, not admin-mediated                               | Stretch      | Every order to date came from founder outreach. The app has never originated one                          |
| Order fulfilment time baseline established                                        | Attainable   | Measurable today from existing order timestamps                                                           |
| 200+ agents, 10 cities, public weekly reference pricing                           | Unreasonable | 5-year targets. Scoring them now guarantees failure                                                       |

---

## 5. Reliability and ops

| KPI                                           | Tag          | Why                                                                     |
| --------------------------------------------- | ------------ | ----------------------------------------------------------------------- |
| Database backup verified restorable monthly   | Attainable   | Low effort, high value, not started                                     |
| 99% API uptime, reported as zero P0 incidents | Attainable   | Honest at current scale                                                 |
| 99.9% uptime SLA                              | Unreasonable | No on-call, no redundancy. The language would not be backed by anything |
| Disaster recovery runbook with sub-1hr RTO    | Unreasonable | Needs standby infrastructure that does not exist                        |

---

## 6. Security and financial integrity

| KPI                                              | Tag          | Why                                                                         |
| ------------------------------------------------ | ------------ | --------------------------------------------------------------------------- |
| Every Paystack movement reconciled and auditable | Attainable   | Baseline trust requirement. The reconciliation cron runs every 15 minutes   |
| No plaintext credentials committed               | **Not met**  | Test credentials are committed and remain in git history. See `JOTTINGS.md` |
| Security review before 2FA ships                 | Stretch      | Touches account takeover directly                                           |
| Payments legal opinion on holding buyer balances | Attainable   | External lead time, so start now. The wallet is parked until it lands       |
| NDPR obligations mapped                          | Attainable   | Personal data, bank details and KYC documents are already held              |
| SOC 2 or formal certification                    | Unreasonable | Needs process maturity and a customer actually requiring it                 |

---

## Feature horizon

Wanted, unscheduled, and not scored. Kept here so the ideas survive without
implying a commitment. Anything that becomes real moves into
`docs/frontend/TASKS.md` with a spec.

**Partly exists already:** warehouse management (stock requests), outreach
(field CRM), agent network (built, unused), super admin and sub admin, KYC.

**Not started:**

| Feature                                         | Note                                                            |
| ----------------------------------------------- | --------------------------------------------------------------- |
| Customer care surface                           | Currently founders on WhatsApp and phone                        |
| Chatbot                                         | Only worth it once the same questions recur at volume           |
| Transport network                               | A `riders` entity exists in the schema and nothing uses it      |
| Buyer-facing order tracking                     | Package to dispatch to delivery, with the transport contact     |
| Agent leaderboard                               | Watch the incentive: rewarding volume over remittance is a trap |
| Buyer leaderboard, recognition, birthday wishes | Needs an OTP or birthday verification flow                      |
| Social media bot                                |                                                                 |
| Apple Pay and Google Pay                        |                                                                 |
| Mobile money and USSD via the Charge API        |                                                                 |
| Chargeback handling, `charge.dispute.*`         | Unhandled today. Becomes real with card volume                  |
| Refund event handling, `refund.*`               | Same                                                            |

---

## Category definitions

- **Attainable:** achievable at the current team size and stage with work
  already visible in this repo's docs
- **Stretch:** plausible this quarter, but competes with the Attainable items.
  Not all Stretch items at once
- **Unreasonable:** either a multi-year target mistaken for a near-term one, or
  needs infrastructure or team that does not exist. Not bad KPIs, wrong horizon
- **Suspended / Deferred:** a deliberate choice not to pursue this now, with the
  reason stated. Different from failing it
