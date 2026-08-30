# Debridgers Executive Diagnosis

**Prepared:** 2026-08-29
**Companion documents:** `COMPANY_PROFILE.md` for facts, `BusinessModel.md` for the canvas, unit economics, and the seven locked decisions, `debridgers_strategic_investor_partnership_growth_strategy.md` for partnership and capital strategy.

---

## The central conclusion

The previous diagnosis said:

> Debridgers does not primarily have a funding problem. It has a commercial-validation and unit-economics problem.

**Half of that has been resolved, and the half that resolved was the dangerous half.**

The unit economics problem was never that the business was structurally unprofitable. It was that the business was **structurally mispriced**, and nobody had done the arithmetic to find out which. Doing it produced a specific, correctable finding rather than an existential one.

The revised conclusion:

> **Debridgers had a pricing problem. It is solved and shipped, in code and in production data, as of 2026-08-29. What remains is a measurement problem and a customer-count problem, in that order.**

That is a much better position than the one this document described in its previous version, and the improvement came from arithmetic rather than from anything that happened in the market.

---

## What changed, and why it matters

### The old analysis was reasoning about the wrong product

Every earlier assessment, including this one, worked from a ₦1,400 unit price and a ₦100 spread. **Debridgers does not sell a ₦1,400 product.** The live catalogue prices packages between ₦12,000 and ₦55,000, with a ₦35,000 median.

The ₦1,400 figure came from a hardcoded placeholder that had leaked into three separate company documents and two code paths. Reasoning from it produced the conclusion that the margin was structurally too thin to work. **That conclusion was wrong.**

### The corrected finding

At real prices, gross margin is **₦2,500 to ₦3,300 per package** at a 6% procurement spread. That is a real and workable margin.

What was thin, and negative, was the fee structure:

- **₦100 flat handling** on a ₦42,000 bag of rice is 0.24%, and does not cover the ₦773 Paystack fee on the transaction
- **₦500 zone delivery** against a **measured** ₦4,000 trip cost recovers one eighth of the vehicle

The consequence, stated as the number that matters:

| Single-package order      | Break-even procurement spread, current live pricing | Under the locked pricing |
| ------------------------- | --------------------------------------------------- | ------------------------ |
| Palm Oil, ₦28,000         | **15.10%**                                          | **1.17%**                |
| Local White Rice, ₦42,000 | **10.57%**                                          | **0.63%**                |
| Wake Gida, ₦55,000        | **8.79%**                                           | **0.73%**                |

Under the pricing running in production today, Debridgers must buy a bag of rice **10.6% below market** merely to break even on selling one. No procurement operation achieves that reliably. **That is the arithmetic proof that the current price list cannot work at any volume, and it is why more orders would have made things worse rather than better.**

Under the locked pricing the same order needs **0.63%**.

> **The repricing does not just improve margin. It removes the requirement to be an exceptional buyer in order to survive, and replaces it with being paid for being a good one.**

---

## What is now true

### Demand is proven, at small scale

Ten-plus orders, two customers, both B2B food businesses, both reordering, all acquired by founder outreach through WhatsApp, phone, and personal visits. **Nothing about that is hypothetical any more.**

It is also two customers. One departure removes half the business.

### Supply is proven at the supplier tier

Procurement is a running activity, not a plan. The chain today is `Supplier -> Debridgers -> Buyer`. The intended chain is `Farmer -> Debridgers -> Buyer`.

The company has stopped claiming it removes middlemen, which was never accurate and would not have survived a sector-literate investor. The current thesis is defensible: **transparent, measurable, lower-cost distribution replacing opaque, uncoordinated intermediation.**

### The working capital structure is genuinely good

Customers pay before delivery. Only confirmed orders are processed. **The buyer finances the trade.**

This is the most attractive structural fact about the business and it was not identified in any previous assessment. Negative working capital means growth does not consume cash at the rate revenue grows. It belongs ahead of the technology in any investor conversation.

The honest caveat: it holds only while suppliers are paid at or after collection. **Supplier payment terms is therefore a first-class fact to record, not an operational detail.**

### The payment layer is verified

The live Paystack round trip is confirmed. 75 end-to-end tests across 11 suites, on an isolated database rebuilt every run, asserting deposit idempotency, webhook signature authenticity, exact-kobo wallet debits, order lifecycle legality, and cross-account isolation. Eight silent money bugs were found and fixed before launch rather than after an incident.

**This is not decoration.** For a business whose entire promise is that money is traceable, it is the promise being kept.

### The decisions are made

Seven decisions are locked: segment, margin architecture, hero products, pricing, agent commission and exposure, channel focus, and the expansion trigger. **The judgement calls are finished.** What remains is counting and selling.

---

## The bottlenecks, revised

### 1. Unmeasured landed cost. Critical

**The largest remaining unknown in the business.** Every contribution figure assumes a 6% procurement spread. Nobody has established what a bag of rice actually costs landed in the warehouse.

The sensitivity, on one bag of rice at locked pricing:

| Actual spread | Contribution | %    |
| ------------- | ------------ | ---- |
| 1%            | ₦37          | 0.1% |
| 3%            | ₦997         | 2.1% |
| 6%, assumed   | ₦2,257       | 4.8% |
| 10%           | ₦3,937       | 8.4% |

**This also gates the agent commission decision.** The locked bands consume 36% to 42% of gross margin at a 6% spread. At 3% they consume 79% and are unaffordable. The basis is settled; the level is provisional until this number exists.

**Closing it is a morning's work:** three supplier invoices each for rice, beans, and oil, recorded in a supplier register, with an inbound haulage column so cost of goods means landed cost rather than the number on the supplier's lips.

### 2. Everything else is unmeasured too

One cost line in the entire business has been measured: ₦4,000 for a two-package outbound delivery in Kaduna South. **That single measurement moved every number in the model**, invalidating a ₦2,500 estimate and forcing the delivery base from ₦2,000 to ₦4,000, which in turn rescued three worked examples from negative contribution.

Nine cost lines remain unmeasured. **The reasonable expectation is that they will move things by similar amounts.**

Still uncounted: inbound haulage, loading labour, van and truck rates, order admin time, replacement and spoilage, monthly burn, warehouse capacity, GMV, AOV, and the channel mix of the existing orders.

**None of these require capital and only one requires code.**

### 3. The pricing change is shipped

**Closed 2026-08-29.** Production was selling below cost on every small order; the correction is worth roughly **₦4,176 on a single bag of rice**.

It is live in code and in the database: the cost-to-serve fee at 3%, the delivery base at the measured trip cost, a per-zone taper and cap, and the ₦25,000 minimum. The rules moved into `packages/pricing` so the quote, the charge and the buying desk read one source and cannot drift apart again.

### 4. Customer concentration

Two accounts. This is the correct number for a company that has just proven demand exists, and it is a serious fragility. **The 90-day objective of 12 to 15 named accounts is a risk-reduction target as much as a growth one.**

### 5. Commercial capacity is structurally constrained

Four people, three of them engineers or designers. Business development sits with the two people who also own the codebase. Every hour on a customer conversation is an hour not on the platform.

**This is why the feature halt is a genuine decision rather than a preference.** It cannot be solved by working harder, only by choosing.

### 6. Consignment risk, found and designed out

The consignment model was built when a pack was assumed to be ₦1,300. **At real prices a package is ₦27,000 to ₦54,000 of company stock in a stranger's hands.** Five bags of beans with one agent is 90% of the company's cash.

This was a latent existential risk that would have materialised the week the first agent was recruited. It is now addressed by design rather than by monitoring: **order-first for all new agents, consignment earned after eight weeks above 95% remittance, total exposure capped at 30% of cash.**

A live code defect still blocks it: `product.service.ts:279` records an agent taking 10 bags of ₦42,000 rice as owing ₦13,000. **No agent may be recruited until that is fixed.**

### 7. Regulatory position

**The wallet.** The platform holds buyer balances and permits withdrawals. Now parked as a promoted feature, code retained, pending a Nigerian payments lawyer answering what regulated activity Debridgers itself performs when it holds a balance. The safer architecture is likely a licensed partner holding funds while Debridgers remains the commerce layer. B2B customers do not need a wallet, so the commercial cost of parking it is nil.

**NAFDAC.** Debridgers is a **distributor**: it sells packages exactly as received, seals intact. That keeps packaging cost at zero, keeps it on the distributor side of the line, and keeps the quality guarantee cheap, because an unopened seal is evidence. **The company intends to become a packager**, which changes all three. Get the compliance opinion before the first bag is opened, not after.

**NDPR.** Personal data, bank details, and KYC documents are already held. Obligations already apply.

### 8. The "5% remittance rate" alarm, resolved

Three company documents recorded an agent remittance rate of 5% and called it potentially catastrophic. **It was neither catastrophic nor a metric: no agents exist, so no stock was issued, nothing was due, and the rate was undefined.** The figure most likely leaked from the commission setting.

The lesson is structural rather than clerical. **A collection percentage and a cost percentage were allowed to look alike.** The locked design makes commission a naira amount per package, so the two can never be confused again.

---

## What investors will like

1. **A real problem in a large market.** Food distribution in Nigeria is not an invented pain point.
2. **Negative working capital.** The buyer finances the trade. Growth does not consume cash proportionally. This is the strongest structural fact and it should lead.
3. **Genuine capital efficiency.** No owned fleet, no leased warehouse, no inventory bought ahead of demand, consignment risk designed out rather than accepted.
4. **Technology that supports the operating model rather than decorating it.** Stock tracking, KYC, remittance, commissions, referral attribution, payment reconciliation, server-side pricing, delivery zones, field CRM. And a verified money path, which for a business promising traceability is the product working.
5. **Kaduna.** Not entering Lagos to outspend incumbents. Regional density in an under-served market.
6. **A distribution network that could become infrastructure.** An effective agent acquires buyers, sells B2B, distributes, collects demand data, and creates neighbourhood density. Harder to copy than delivery riders.
7. **Unusual analytical honesty.** The company found that its own price list required a 10.6% procurement advantage to break even, wrote it down, and repriced. Most companies discover that from a bank statement two years later.

---

## What investors will dislike

1. **Two customers.** The first question will be "how many customers", and the answer is two.
2. **Unmeasured cost of goods.** An investor will ask what a bag of rice costs. Not having the answer at this stage is worse than any particular answer would be.
3. **Unmeasured contribution margin.** The pricing fix shipped on 2026-08-29, so production now runs the corrected economics, but what an order actually contributes still rests on an unmeasured cost of goods.
4. **No revenue history to show.** GMV and AOV exist in the database and have never been queried.
5. **Team capacity.** Four people cannot simultaneously build software, procure, warehouse, recruit agents, sell B2B, and run logistics at scale.
6. **Product built well ahead of commercial proof.** The platform is considerably more complete than the evidence that people will buy through it. Ten orders came through founder outreach, not the funnel.
7. **Regulatory questions open**, though now scoped and scheduled rather than unrecognised.
8. **Equity split and the meaning of "founded 2025" undocumented**, which is governance hygiene rather than substance, and cheap to fix.

---

## What must be proved next

**Now, in the next 30 days.** All measurement, none requiring capital:

1. Landed cost of goods for rice, beans, and oil
2. Inbound haulage per bag
3. GMV, AOV, and channel mix on the existing orders
4. Monthly burn
5. Order admin minutes
6. Ship the pricing change and the five open defects

**Before institutional fundraising:**

1. 12+ repeat B2B accounts
2. Positive contribution margin at median order size, measured rather than modelled
3. Predictable month-on-month order growth
4. CAC by channel
5. Supplier depth: 3+ per hero product with recorded prices
6. Agent economics validated on real agents, order-first
7. Reconciliation accuracy demonstrated over a full quarter
8. Clean cap table, documented equity, signed governance
9. A data room

**Deliberately not now:** mobile app, advanced loyalty, chatbots, multi-level agent overrides, Apple Pay and Google Pay, cold chain, a public price index, data products, and any geographic expansion.

---

## What capital is actually for

The previous diagnosis correctly noted that the consignment model reduces inventory financing needs. Prepayment removes even more of it. **This has to be stated carefully, because it is easy to draw the wrong conclusion.**

**Debridgers does not need capital to buy stock.** Customers pay first, and the ₦300,000 buffer covers settlement gaps, transport, and replacements.

**Debridgers does need capital to serve buyers who will not prepay.** Institutional buyers, established restaurant groups, and anything with a procurement department pay on delivery or on terms as policy. Under prepayment-only they cannot be served at all. **The company is not turning down orders for lack of demand. It is turning them down because the balance sheet cannot carry them.**

```text
Credit float required = monthly GMV on terms × (days of terms ÷ 30)
```

| Accounts on terms | Monthly GMV | Float at 14 days | Float at 30 days |
| ----------------- | ----------- | ---------------- | ---------------- |
| 5                 | ₦1,605,000  | ₦749,000         | ₦1,605,000       |
| 10                | ₦3,210,000  | ₦1,498,000       | ₦3,210,000       |
| 20                | ₦6,420,000  | ₦2,996,000       | ₦6,420,000       |

**The float revolves, it does not burn.** It suits debt, an overdraft, invoice financing, or a NIRSAL or Bank of Agriculture facility. **Do not sell equity to fund a revolving float.**

The resulting pitch is stronger than the usual one. Not "we need money to buy stock", which invites the question of why the model consumes cash. Instead: _our model runs on negative working capital and does not need financing to grow; we want a revolving facility to serve buyers who require terms, sized by a formula we can show you, secured against an order history we can prove._

---

## The flywheel

```text
Loop 1, density:
More buyers -> more predictable demand -> better supplier commitments ->
better procurement terms -> wider spread -> better prices or better margin ->
more repeat orders -> more transaction data -> better price intelligence ->
more supplier leverage -> more buyers

Loop 2, distribution:
More orders -> more agent earnings -> better agent retention ->
more neighbourhood coverage -> more buyers -> more orders
```

**Loop 1 is live and turning slowly.** Two customers, repeat orders, real procurement. Small, but no longer hypothetical, which is a change from the previous assessment.

**Loop 2 has not started.** The pricing shipped on 2026-08-29 and the ₦1,300 remittance defect was fixed the same day, so the remaining blocker is a real landed cost to validate the commission bands against.

Where each loop breaks today:

| Break                                    | Loop | Status                                         |
| ---------------------------------------- | ---- | ---------------------------------------------- |
| Only 2 buyers                            | 1    | Open, the primary focus                        |
| Supply is suppliers, not farmers         | 1    | Open by design, the target state               |
| Unmeasured landed cost                   | 1    | **Closable in one morning**                    |
| Unmeasured delivery beyond one datapoint | 1    | **Closable in 30 days**                        |
| No agents exist                          | 2    | Blocked on the pricing ship and the defect fix |
| Agent economics unvalidated              | 2    | Blocked on landed cost                         |

**Four of six close with measurement, not with capital or code.**

---

## Where to focus, in order

1. **Measure.** Landed cost, inbound haulage, burn, admin minutes, GMV and AOV. One morning plus 30 days of logging
2. **Ship the pricing change and the five defects.** Half a day and change
3. **Sell.** 12 to 15 named B2B accounts, four owners, one weekly numbers review
4. **Deepen supply.** 3+ suppliers per hero product, recorded
5. **Get the two legal opinions.** Payments and NAFDAC, both with external lead times
6. **Then agents**, order-first, once the economics validate the bands
7. **Then capital**, as a revolving facility sized to the terms formula
8. **Then, and only then, a second city**, against the written trigger

---

## The one-paragraph assessment

Debridgers is a B2B food procurement and distribution business in Kaduna with two proven customers, a proven procurement operation, a verified payment layer, and a working capital structure that most distribution companies would envy. Its central problem was never a thin margin; it was a price list built for a product it does not sell, which required a 10.6% procurement advantage to break even and was corrected in code and in production on 2026-08-29. Demand is real and tiny, supply is real and shallow, and one cost line in the entire business has been measured. The judgement calls are finished and locked. **What separates this company from an investable one is not a strategy, a feature, or a round. It is roughly two days of counting and ninety days of selling.**
