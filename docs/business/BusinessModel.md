# Debridgers Business Model Canvas

Compiled from `docs/jottings/COMPANY_PROFILE.md`, `docs/jottings/Company_Diagnosis.md`, and `docs/jottings/debridgers_strategic_investor_partnership_growth_strategy.md`, corrected against founder input on 2026-08-29 and cross-checked against the live catalogue, zone, and fee code in `apps/debridgers-backend`.

**Prepared:** 2026-08-29
**Company:** Debridgers LTD, Kaduna, Nigeria
**Stage:** Early revenue, single city, 10+ orders to 2 B2B customers
**Capital on hand:** ₦300,000

## How to read this document

Every claim carries an evidence tag, because a canvas that does not separate what is true from what is hoped is a wish list:

| Tag         | Meaning                                                 |
| ----------- | ------------------------------------------------------- |
| **PROVEN**  | Has happened in the real world, with money moving       |
| **BUILT**   | Exists in the product and has been technically verified |
| **CLAIMED** | Stated in company documents, not yet evidenced          |
| **ASSUMED** | A hypothesis the business currently rests on, untested  |
| **UNKNOWN** | A number nobody has, and its absence changes decisions  |

The canvas is descriptive. The decisions section is what turns it into a business model, because a model is a set of committed choices, not a set of listed options.

## The most important correction in this revision

The previous version of this analysis reasoned about a ₦1,400 unit price and a ₦100 spread. **That is not what Debridgers sells.**

The live catalogue in `apps/debridgers-backend/src/infrastructure/seeders/catalog.ts` prices packages between ₦12,000 and ₦55,000:

| Product                 | Unit         | Buyer price |
| ----------------------- | ------------ | ----------- |
| Wake Gida (Honey Beans) | 100kg bag    | ₦55,000     |
| Cowpea (White Beans)    | 100kg bag    | ₦52,000     |
| Ofada Rice              | 50kg bag     | ₦48,000     |
| Local White Rice        | 50kg bag     | ₦42,000     |
| Millet                  | 100kg bag    | ₦40,000     |
| Tuwo Rice               | 50kg bag     | ₦38,000     |
| Groundnut Oil           | 25 litre keg | ₦35,000     |
| Yam                     | 100 tubers   | ₦30,000     |
| Palm Oil                | 25 litre keg | ₦28,000     |
| Irish Potato            | 100kg bag    | ₦18,000     |
| Yellow Garri (Toasted)  | 100kg bag    | ₦14,000     |
| White Garri             | 100kg bag    | ₦12,000     |

Median package: **₦35,000**. Mean: **₦33,800**.

Against that, the fee structure in `apps/debridgers-backend/src/api/v1/buyer/delivery-fee.ts` is:

- Handling: **₦100 flat per order**
- Delivery: zone base, **₦500** Kaduna South / **₦700** Kaduna North / **₦800** Chikun, first package included
- Each additional package: **₦500**

**₦100 handling on a ₦42,000 bag of rice is 0.24%.** It does not cover the Paystack fee on that transaction, which is roughly ₦739. The fee structure was designed for a ₦1,400 world and never repriced when the catalogue moved to 50kg bags.

Two live code defects follow from the same drift, and both are money bugs:

1. `apps/debridgers-backend/src/api/v1/catalog/product.service.ts:279` hardcodes `amount_to_remit: dto.quantity * 130000` with the comment "Assuming ₦1,300 per unit". An agent taking 10 bags of ₦42,000 rice on consignment is recorded as owing **₦13,000** instead of roughly ₦390,000.
2. `apps/debridgers-backend/src/infrastructure/persistence/schemas/orders.schema.ts:51` defaults `unit_price` to `140000` kobo, being ₦1,400.

Neither throws an error. Both would look fine on a dashboard. Fix both before an agent ever holds stock.

### A third catalogue defect: the unit sizes are wrong

Founder-confirmed: **apart from rice, the bags are 100kg each, not 50kg.**

Corrected in `catalog.ts`, and in existing rows by migration
`0021_catalogue_and_zone_corrections.sql`:

| Product                       | Was        | Now             | Price              |
| ----------------------------- | ---------- | --------------- | ------------------ |
| Wake Gida (Honey Beans)       | "50kg bag" | **100kg bag**   | ₦55,000            |
| Cowpea (White Beans)          | "50kg bag" | **100kg bag**   | ₦52,000            |
| Irish Potato                  | "50kg bag" | **100kg bag**   | ₦18,000            |
| White Garri                   | "25kg bag" | **100kg bag**   | ₦12,000            |
| Yellow Garri (Toasted)        | "25kg bag" | **100kg bag**   | ₦14,000            |
| Local White Rice, Ofada, Tuwo | "50kg bag" | 50kg, unchanged | ₦38,000 to ₦48,000 |

The risk this closed was customer-facing: a buyer told 50kg who receives 100kg is given away half the goods, and a 100kg price against a 50kg label is a misdescription.

**Millet is now listed** at ₦40,000 per 100kg bag under Grains, having been traded before it existed in the catalogue. The price is the last figure paid rather than a set price, and still wants confirming against a real invoice.

**What the 100kg correction changes in this document, and what it does not.** Prices are unaffected: ₦55,000 is the price whatever the bag weighs. Two things do move:

- **Loading labour rises for 100kg bags.** A 100kg bag is a two-person lift. The assumption becomes ₦500 per 100kg package against ₦300 per 50kg one. On Worked Example E that is ₦200 of extra cost on a ₦20,460 contribution, which is immaterial. On a 35-package institutional order it is worth several thousand naira and should be in the quote.
- **Value density improves, which strengthens the beans case.** ₦55,000 in one vehicle slot at 100kg is the best margin per slot in the catalogue. It also means fewer bags fit a keke, so the vehicle choice changes sooner than the package count suggests. Log the actual vehicle used against package count in the transport log.

## The canvas at a glance

```text
KEY PARTNERS          KEY ACTIVITIES        VALUE PROPS           RELATIONSHIPS        SEGMENTS
Suppliers (now)       Procurement           Market price          Admin-led outreach   B2B food
Farmers (target)      Price setting         at your door          WhatsApp + phone     businesses (NOW)
Paystack              B2B outreach          Fixed weekly price    Personal visits      Institutions (NEXT)
Cooperatives (want)   Order fulfilment      Quality replacement   Wallet + buy-again   Households (LATER)
KADA / NIRSAL (want)  Last-mile delivery    Capital-free agent    Weekly agent payout  --------
Logistics (want)      Reconciliation        income                                     Agents (two-sided)
                                                                                       Farmers (two-sided)
                      KEY RESOURCES                              CHANNELS
                      4 founders wearing every role              Outreach: WhatsApp, phone,
                      Co-founder's house as warehouse            personal visits  <- PROVEN
                      ₦300,000 working capital                   Web app direct
                      The platform                               Agent referral links
                      Supplier relationships                     Outreach field CRM

COST STRUCTURE                                    REVENUE STREAMS
Cost of goods, 90-95% of price (measure it)       Procurement spread on goods  <- the only profit
Delivery per drop, ₦4,000-25,000 (measured)       Cost-to-serve fee, 3% (floor 500, cap 5,000)
Paystack: card 1.5%+₦100 cap ₦2,000               Delivery fee, zone base + taper, capped
         virtual acct ~1% cap ₦300                Future: B2B contract margin
         transfer ₦10-50 flat                     Future: price intelligence and data
Loading labour, ~₦300/package                     Future: financial services via partners
Order admin, UNMEASURED (unpaid founder time)
Warehouse, currently imputed at ₦0
```

## 1. Customer segments

### Where the revenue actually is

**B2B food businesses.** **PROVEN**
All 10+ orders processed to date came from **2 customers, both food businesses**, acquired through admin-led outreach. This is the only segment with revenue behind it, and every strategic recommendation in the source documents pointed here before the evidence did.

**Institutions: universities, large employers, residential communities, associations.** **CLAIMED, and the declared next focus**
The company has decided to focus here next. These answer the question that matters most at this stage: who already has 500 or 5,000 people who need food. Concentrated demand at a single delivery point is the best possible answer to a delivery cost problem.

**Shops and market traders.** **Decided: opportunistic, not a priority**
Founder position, recorded: Debridgers is flexible here. Direct farmer sourcing takes preference where quality can be secured, but working with other middlemen is acceptable. This is the correct and honest posture. It also means the "no middlemen" line in public copy needs to be retired in favour of the transparency thesis below, because the company already works with intermediaries where they add value.

**B2C households.** **Deferred**
Not the focus. The retention machinery is built and can wait. Households are a later, denser-neighbourhood play.

### The two-sided segments

These are not customers, and the model breaks if they are treated as staff. Founder confirmed.

**Field agents.** **NOT YET RECRUITED**
Zero agents exist today. The four founders are performing the agent role themselves. The platform-side agent machinery is fully **BUILT**, which means the company can onboard agents the week it decides to, but the economics must be settled first (Decision 4).

**Farmers and suppliers.** **PROVEN as suppliers, CLAIMED as farmers**
Debridgers currently sources from suppliers, not farmers. Procurement is a real, running activity. The farmer layer is the target, not the present state.

### The segmentation decision, locked

> **Primary: B2B food businesses in Kaduna. Secondary: institutions. Everything else deferred.**

Three roles in the system, and all three are real: **agents, buyers, farmers and suppliers.**

## 2. Value propositions

### To buyers

| Proposition                                  | Status                                               |
| -------------------------------------------- | ---------------------------------------------------- |
| Market price at your door                    | **PROVEN**, already delivered to both customers      |
| Quality guaranteed, no-questions replacement | **PROVEN**, already offered and honoured             |
| Fixed weekly price, no haggling              | **BUILT**, prices set weekly, server-side re-pricing |
| Order however you want: WhatsApp, phone, web | **PROVEN**, outreach produced every order to date    |
| No hidden fees, stated up front              | **BUILT**, quote and checkout calculate identically  |

The strongest differentiator is not price, it is **price certainty plus a guaranteed replacement**. A restaurant that knows what a bag of rice costs on Monday, gets it delivered, and knows a bad bag will be replaced without argument, has been given three things the incumbent market does not offer together.

### To agents

**This is currently a proposition with nobody receiving it.** No agents exist. What is built:

| Proposition                                          | Status                  |
| ---------------------------------------------------- | ----------------------- |
| Stock on consignment, zero capital to start          | **BUILT**               |
| Weekly payouts direct to bank, automated Friday cron | **BUILT**               |
| Serve your own neighbourhood                         | **BUILT**               |
| Growth path: overrides, state manager tier           | **BUILT**, depth 1 only |

**The commission question, answered properly.** The previous framing used ₦1,400 packs and produced a nonsense figure. At real prices:

- 5% of a ₦42,000 bag of rice is **₦2,100 per bag**
- 5% of a ₦55,000 bag of beans is **₦2,750 per bag**

That is real money for an agent. It is also, almost certainly, **more than the entire gross margin on the bag.** If Debridgers buys rice at ₦39,500 and sells at ₦42,000, the spread is ₦2,500. Paying ₦2,100 of that to the agent leaves ₦400 to cover delivery, payment fees, loading, warehouse, and profit. The order loses money.

**A percentage of gross order value is the wrong commission basis at these prices.** See Decision 4.

### To suppliers, and later farmers

| Proposition                                         | Status                        |
| --------------------------------------------------- | ----------------------------- |
| Reliable, repeat off-take rather than one-off sales | **CLAIMED**                   |
| Payment on agreed terms, with records               | **CLAIMED**                   |
| Direct market access without an intermediary spread | **CLAIMED**, farmer-side only |
| Demand visibility to plan against                   | **Not built**                 |

### The thesis, corrected and accepted

Founder-approved wording:

> **Debridgers replaces opaque, uncoordinated intermediation with transparent, measurable, and lower-cost distribution.**

This replaces "we remove middlemen." The company already works with suppliers who are intermediaries, and will continue to where they supply quality. The defensible claim is coordination and transparency, not elimination.

## 3. Channels

| Channel                                                        | Status        | Notes                                                                   |
| -------------------------------------------------------------- | ------------- | ----------------------------------------------------------------------- |
| **Outreach: WhatsApp, phone calls, personal visits by admins** | **PROVEN**    | **This produced 100% of orders to date.** The only validated channel    |
| Outreach field CRM, shops visited and logged                   | **BUILT**     | Prospect list with product interest and estimated quantity              |
| Direct web app orders                                          | **BUILT**     | Full checkout, server-side re-pricing, never yet the origin of an order |
| Agent referral links                                           | **BUILT**     | No agents, so no traffic                                                |
| Website contact and register-interest forms                    | **BUILT**     | Promises contact within 24 hours                                        |
| Email campaigns                                                | **BUILT**     | Mailtrap, targeting buyers, agents, or all                              |
| Batch SMS                                                      | **Not built** | Specified only                                                          |

**The channel finding is unambiguous.** Debridgers is currently a **field sales business with a platform behind it**, not a platform business. Human outreach by the founders is the engine. The web app is the fulfilment and record layer. That is a legitimate and often superior model at this stage, and the company should stop treating the app as the acquisition channel until outreach has been pushed to its limit.

## 4. Customer relationships

**The relationship today is human and founder-owned.** **PROVEN**
Admins place calls, make personal visits, run outreach, and maintain the relationship directly. Both customers are known personally. This does not scale, and it is exactly right for two customers.

**Buyer-side platform machinery.** **BUILT**
Wallet, favourites, buy-again ranked by frequency, one-tap repeat of last order, cart synced across devices, order notifications, spending dashboard, dedicated virtual account per buyer.

**Agent-side machinery.** **BUILT**
Application, admin approval, KYC, bank details, stock requests, sales reports, commission tracking, weekly automated payout.

### How to measure the agent-versus-platform loyalty risk

The founder asked how to measure whether a buyer is loyal to Debridgers or to their agent. It does not need a feature. It needs **four fields and one weekly query**:

1. **`order_source` on every order.** One of: `agent`, `app_direct`, `whatsapp`, `phone`, `admin_outreach`. Set it manually today, since founders are placing the orders anyway. Without this field, none of the rest can be computed, and it is the single cheapest thing on this list.
2. **`attributed_agent_id` on the buyer**, already stored permanently. Keep it.
3. **`agent_active` state and a churn date.** When an agent leaves, the date is the start of the experiment.

Then the three numbers that answer the question:

| Metric                              | Formula                                                                       | What it tells you                                                              |
| ----------------------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| **Platform-independent order rate** | Orders with `order_source = app_direct` ÷ total orders, per buyer             | A buyer who orders through the app without being called is loyal to Debridgers |
| **Agent-churn survival rate**       | Buyers who placed an order after their agent left ÷ buyers whose agent left   | The direct answer. Below 30% means agents own the customers                    |
| **Time to first self-serve order**  | Days from first agent-mediated order to that buyer's first `app_direct` order | How long it takes to convert a relationship from the agent to the company      |

Run these monthly. They are a SQL query, not a roadmap item. Start collecting `order_source` this week, retroactively for the existing 10 orders, because the data cannot be recovered later.

## 5. Revenue streams

This is the section the founder asked to be settled properly. It is the longest section in this document on purpose, because it is the one that decides whether the company survives.

### What the system charges today

| Line                            | Value                             | Source                                      |
| ------------------------------- | --------------------------------- | ------------------------------------------- |
| Product price                   | ₦12,000 to ₦55,000 per package    | `catalog.ts`                                |
| Handling fee                    | ₦100 flat per order               | `delivery-fee.ts`, `HANDLING_FEE_KOBO`      |
| Delivery, Kaduna South          | ₦500 base, first package included | `seeder.ts`                                 |
| Delivery, Kaduna North          | ₦700 base                         | `seeder.ts`                                 |
| Delivery, Chikun                | ₦800 base                         | `seeder.ts`                                 |
| Each additional package         | ₦500                              | `delivery-fee.ts`, `PER_EXTRA_PACKAGE_KOBO` |
| Buyer referral discount         | ₦500 flat                         | System setting                              |
| Agent buyer-referral commission | ₦20 per order, indefinitely       | Schema                                      |
| Agent commission                | 5% of order value                 | System setting                              |

### Three separate things are being charged for

Conflating them is what produced the current mispricing. They have different purposes, different cost bases, and must be priced by different rules.

| Charge                | What it is for                                                            | Pricing rule                                | Should it profit?                                                 |
| --------------------- | ------------------------------------------------------------------------- | ------------------------------------------- | ----------------------------------------------------------------- |
| **Goods**             | The product                                                               | Market reference price                      | **Yes.** This is the entire profit engine                         |
| **Delivery**          | The vehicle and the trip                                                  | Cost recovery, tapered by package count     | **No.** Break even                                                |
| **Cost-to-serve fee** | Payment rail, order admin, reconciliation, support, replacement provision | Percentage of goods, with a floor and a cap | **No.** It stops the cost of serving from eating the goods margin |

### The cost-to-serve fee, in full

The fee currently called "handling" is misnamed, and the name is doing real damage: it sounds like a charge for lifting a bag, which is why it was set at ₦100. It is not that. It is the **cost-to-serve fee**, and here is exactly what it pays for.

**What it covers:**

| Component                                               | Measurable today? | Notes                                                                      |
| ------------------------------------------------------- | ----------------- | -------------------------------------------------------------------------- |
| **Payment rail: Paystack**                              | **Yes**           | The only component with a published, verifiable rate. This is the anchor   |
| Order admin: taking, confirming, invoicing, receipting  | Not costed yet    | Founder time, currently free, which is why it looks like zero              |
| Reconciliation: matching payment to order, weekly books | Not costed yet    | Same                                                                       |
| Customer support: calls, chasing, rescheduling          | Not costed yet    | Same                                                                       |
| Replacement and bad-debt provision                      | Not costed yet    | The quality guarantee has a price and it has never been paid out or logged |
| Procurement admin allocated per order                   | Not costed yet    | Sourcing calls, quality inspection at collection                           |

Five of six components are unmeasured, and all five are currently absorbed by founders working for nothing. **The fee is therefore sized against the one component that can be verified today, and will be resized once the other five have numbers.**

The critical framing:

> **The cost-to-serve fee does not turn a profit. It stops the cost of serving an order from eating the margin on the goods. The profit comes from procurement, and nowhere else.**

#### Why 3%

A rate anchored to the payment rail alone is too low, because the rail is one of
six cost-to-serve components and the only one that has been measured. The other
five are not free; they are absorbed by unpaid founder time.

The break-even rate, where the fee exactly pays for the card processing on the
whole transaction, solves as:

```text
r ≥ (0.015·I + 0.015·D + 100) / (0.985·I)

  where  I = items subtotal
         D = delivery fee
         r = cost-to-serve rate
```

At the measured ₦4,000 Kaduna South base:

| Single-package order        | Items   | Break-even rate |
| --------------------------- | ------- | --------------- |
| **Palm Oil, 25 litre keg**  | ₦28,000 | **2.103%**      |
| Groundnut Oil, 25 litre keg | ₦35,000 | 1.987%          |
| Tuwo Rice, 50kg bag         | ₦38,000 | 1.950%          |
| Local White Rice, 50kg bag  | ₦42,000 | 1.909%          |
| Wake Gida, 100kg bag        | ₦55,000 | 1.818%          |

**3% sits above that line deliberately, and the gap is the point.** A rate set at
the break-even line pays for the card and nothing else. The surplus is what funds
invoicing, reconciliation, support, and the replacement provision.

#### Where the fee earns

Paystack caps its card fee at **₦2,000**. A 3% fee does not cap until **₦5,000**,
which it reaches at ₦166,667 of goods. Between those points the fee stops being a
pass-through and starts funding real work, which is the correct place for it to
earn: a ₦321,000 restaurant order carries more invoicing, more reconciliation,
more support, and more relationship management than a single bag of rice.

| Order                   | Items    | Fee at 3%      | Paystack card  | **Headroom for admin** |
| ----------------------- | -------- | -------------- | -------------- | ---------------------- |
| 1 keg Palm Oil          | ₦28,000  | ₦840           | ₦593           | **₦247**               |
| 1 bag Local White Rice  | ₦42,000  | ₦1,260         | ₦809           | **₦451**               |
| 1 bag Wake Gida         | ₦55,000  | ₦1,650         | ₦1,010         | **₦640**               |
| 2 bags rice + 1 keg oil | ₦112,000 | ₦3,360         | ₦1,901         | **₦1,459**             |
| Restaurant, 8 packages  | ₦321,000 | ₦5,000, capped | ₦2,000, capped | **₦3,000**             |

The shape of that column is the design working:

> **The floor protects the small order. The cap protects the relationship. The middle is where the fee does real work.**

**A note on the floor.** At 3%, the ₦500 floor no longer binds on a delivery
order, because 3% of the ₦25,000 minimum is ₦750. It stays for the cases exempt
from that minimum: a pickup, or a same-zone add-on to another order.

#### The payment method question

The figures above assume a **local card**. Your two B2B customers may well pay by
transfer, where the real cost is near zero.

Typical published Paystack rates. **Verify these on your own dashboard, by
method, before relying on them**, because they change and vary by account:

| Method                    | Typical rate               | Cost on a ₦47,260 rice order | Cost on a ₦333,600 restaurant order |
| ------------------------- | -------------------------- | ---------------------------- | ----------------------------------- |
| Local card                | 1.5% + ₦100, capped ₦2,000 | ₦809                         | ₦2,000                              |
| Dedicated virtual account | around 1%, capped ₦300     | ₦300                         | ₦300                                |
| Bank transfer             | flat, roughly ₦10 to ₦50   | ₦50                          | ₦50                                 |
| Transfer out, payouts     | ₦10 to ₦50 by band         | n/a                          | n/a                                 |

What that does to the same fee:

| Order                           | Fee at 3% | Card headroom | Virtual account headroom | Transfer headroom |
| ------------------------------- | --------- | ------------- | ------------------------ | ----------------- |
| 1 bag Local White Rice, ₦42,000 | ₦1,260    | ₦451          | ₦960                     | ₦1,210            |
| Restaurant, ₦321,000            | ₦5,000    | ₦3,000        | ₦4,700                   | ₦4,950            |

**Two consequences, both decisions rather than observations:**

1. **Steer B2B customers to bank transfer or their dedicated virtual account.**
   The machinery is already built and issued per buyer. On the restaurant order
   it converts ₦1,700 of pass-through into ₦1,700 of genuine cost-to-serve
   funding, on every order, forever, at no cost to the customer.
2. **If most volume settles by transfer, 3% is close to pure cost-to-serve
   funding rather than a payment pass-through.** That is not a reason to lower
   it. It is the reason the fee can honestly cover invoicing, reconciliation,
   support, and the replacement provision, which is what it is for.

#### When to revisit the rate

Revisit once the missing five components have real numbers, and not before. The
measurement: **log the minutes spent on each order for two weeks**, across taking
the order, confirming payment, invoicing, reconciling, and any support call, then
price those minutes at an imputed founder hourly rate.

The arithmetic to expect: at a market monthly salary of around ₦250,000, an hour
of founder time is roughly **₦1,420**. A 45-minute order is about **₦1,065 of
cost-to-serve labour**.

Against a single bag of rice, 3% yields ₦1,260, of which ₦300 goes to the payment
rail on a virtual account, leaving **₦960 against ₦1,065 of labour**. That is
roughly full recovery on the smallest order the business accepts, and it is the
test the rate was set to pass.

Against the restaurant order the fee yields ₦5,000, of which ₦300 is payment,
leaving ₦4,700 against admin that is unlikely to be five times heavier. **Large
orders still subsidise the admin cost of small ones, which is why the segment
decision is B2B** and why chasing single-bag household orders is the wrong move
at this stage.

### The first real cost datapoint, and what it does to the model

**Founder-supplied and now resolved: ₦4,000 paid to transport one bag of beans and one bag of millet. Two 100kg packages, one trip.**

This is the first measured cost figure the company has produced, and it is worth more than every estimate in this document. It also breaks one of them.

> **The assumption was ₦2,500 per drop for 1 to 3 packages. The measured figure is ₦4,000 for 2 packages. The estimate was 38% too low.**

**Founder-confirmed: the trip was outbound**, warehouse to buyer. It is therefore a **delivery cost**, recovered by the delivery fee, and not a component of landed cost. The 6% procurement spread assumption survives this measurement untouched.

**Inbound haulage is now a separate open question.** Whatever it costs to move goods from the supplier to the warehouse is part of the **landed cost of goods**, not delivery, and it is currently recorded nowhere. If inbound haulage runs anywhere near ₦2,000 per bag, the true procurement spread is materially thinner than the price difference suggests. **Add an inbound haulage column to the supplier register**, so cost of goods means landed cost rather than the number on the supplier's lips.

### The cost assumptions, revised against the measurement

| Cost                                    | Assumption used                                   | Basis                                                                                 |
| --------------------------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Cost of goods, landed                   | 94% of buyer price, being a 6% procurement spread | **Still unmeasured. The largest remaining assumption in the model**                   |
| Inbound haulage, supplier to warehouse  | Not modelled, assumed inside the 6%               | **Unmeasured.** Belongs in landed cost, not delivery. Add it to the supplier register |
| Paystack, card                          | 1.5% + ₦100, capped ₦2,000                        | Published rate, confirmed as the planning basis                                       |
| **Delivery vehicle, 1 to 3 packages**   | **₦4,000 per drop**                               | **MEASURED.** ₦4,000 for a 2-package trip                                             |
| Delivery vehicle, 4 to 10 packages, van | ₦8,000 per drop                                   | Scaled from the measurement. Log the next one                                         |
| Delivery vehicle, 20+ packages, truck   | ₦25,000 per drop                                  | Estimate. Quote individually until measured                                           |
| Loading and offloading                  | ₦300 per 50kg package, ₦500 per 100kg package     | Estimate. A 100kg bag is a two-person lift                                            |
| Packaging                               | ₦0                                                | Confirmed: original sealed supplier packages                                          |
| Warehouse                               | ₦20,000 per month, imputed                        | Booked as a founder in-kind contribution                                              |
| Order admin labour                      | Not modelled                                      | Two weeks of minute-logging                                                           |

### The delivery fee has to move, and the measurement says by how much

The delivery line exists to recover the cost of the trip. The proposed ₦2,000 Kaduna South base was sized against a ₦2,500 guess. Against the measured ₦4,000 it under-recovers by half, and that turns the smallest orders negative again.

At a ₦2,000 base and a ₦4,000 real trip cost:

| Order                           | Contribution     |
| ------------------------------- | ---------------- |
| 1 keg Palm Oil, ₦28,000         | **(₦618)**       |
| 1 bag Local White Rice, ₦42,000 | ₦287, being 0.6% |
| 1 bag Wake Gida, ₦55,000        | ₦928, being 1.6% |

Single-package orders collapse to breakeven or below. The fix is not a higher minimum order, it is to charge what the trip costs:

> **Set the zone base to the measured trip cost. Kaduna South ₦4,000, covering 2 packages.**

That is the whole principle of the delivery line, applied honestly. A buyer comparison still favours Debridgers, because a restaurant sending someone to Central Market for two bags pays transport, time, and a haggled price anyway.

**Revised zone table:**

| Zone         | Base, covers 2 packages   | Packages 3 to 6 | Packages 7+ | Cap per drop |
| ------------ | ------------------------- | --------------- | ----------- | ------------ |
| Kaduna South | **₦4,000**                | ₦700 each       | ₦400 each   | ₦10,000      |
| Kaduna North | **₦4,500**                | ₦800 each       | ₦450 each   | ₦11,000      |
| Chikun       | **₦6,000**, and see below | ₦1,000 each     | ₦600 each   | ₦14,000      |

**A defect in the Chikun zone, worth fixing at the same time.** `seeder.ts` describes Chikun as covering "Kachia, Kafanchan, Kagoro, Jema'a" at a ₦800 base. Those towns are 80 to 120km from Kaduna metropolis and are not in Chikun LGA. At that distance a two-package trip is not ₦4,000, it is several times that. **Either correct the zone to actual Chikun LGA areas, or price it as an inter-city leg and quote it individually.** As it stands, a single order to Kafanchan at ₦800 delivery would lose more than the entire margin on the goods.

### What the measured delivery does to the cost-to-serve rate

Raising the delivery base from ₦2,000 to ₦4,000 raises the Paystack fee too,
because the card rate applies to the whole transaction. The break-even
cost-to-serve rate therefore rises with it, to 2.10% on the cheapest hero order.

**3% clears that on every hero product with headroom to spare**, which is the
whole reason the rate is not pinned to the break-even line. The full table and
the reasoning are above, under "Why 3%".

### Worked examples, at the locked pricing and measured delivery

All Kaduna South. Delivery base ₦4,000 covering 2 packages, then ₦700 for packages 3 to 6 and ₦400 for 7 and above. Cost-to-serve fee 3%, floor ₦500, cap ₦5,000. **Local card assumed, the most expensive rail**, per the locked planning basis.

#### A. One 25 litre keg of Palm Oil, ₦28,000

The thinnest order the minimum-order rule permits, and therefore the one that sets the floor.

| Line                       | Amount                 |
| -------------------------- | ---------------------- |
| Items                      | ₦28,000                |
| Delivery                   | ₦4,000                 |
| Cost-to-serve, 3%          | ₦840                   |
| **Buyer pays**             | **₦32,840**            |
| Cost of goods at 94%       | (₦26,320)              |
| Paystack card              | (₦593)                 |
| Delivery vehicle, measured | (₦4,000)               |
| Loading, 1 package         | (₦300)                 |
| **Contribution margin**    | **₦1,627, being 5.0%** |

#### B. One 50kg bag of Local White Rice, ₦42,000

| Line                    | Amount                 |
| ----------------------- | ---------------------- |
| Items                   | ₦42,000                |
| Delivery                | ₦4,000                 |
| Cost-to-serve, 3%       | ₦1,260                 |
| **Buyer pays**          | **₦47,260**            |
| Cost of goods at 94%    | (₦39,480)              |
| Paystack card           | (₦809)                 |
| Delivery vehicle        | (₦4,000)               |
| Loading, 1 package      | (₦300)                 |
| **Contribution margin** | **₦2,671, being 5.7%** |

Under the **current live** pricing this same order loses **₦1,919** once the measured ₦4,000 trip cost is used. The repricing is worth ₦4,590 on one bag of rice.

#### C. One 100kg bag of Wake Gida (Honey Beans), ₦55,000

| Line                       | Amount                 |
| -------------------------- | ---------------------- |
| Items                      | ₦55,000                |
| Delivery                   | ₦4,000                 |
| Cost-to-serve, 3%          | ₦1,650                 |
| **Buyer pays**             | **₦60,650**            |
| Cost of goods at 94%       | (₦51,700)              |
| Paystack card              | (₦1,010)               |
| Delivery vehicle           | (₦4,000)               |
| Loading, 1 × 100kg package | (₦500)                 |
| **Contribution margin**    | **₦3,440, being 5.7%** |

Beans is the best single-package order in the catalogue: the most value in one vehicle slot, so the fixed trip cost is spread over the most revenue. **This is why value density beats weight, and why beans belongs in the hero set.**

#### D. Mixed mid-size order: 2 bags Local White Rice + 1 keg Palm Oil, 3 packages

| Line                             | Amount                 |
| -------------------------------- | ---------------------- |
| Items, ₦84,000 + ₦28,000         | ₦112,000               |
| Delivery, ₦4,000 base + 1 × ₦700 | ₦4,700                 |
| Cost-to-serve, 3%                | ₦3,360                 |
| **Buyer pays**                   | **₦120,060**           |
| Cost of goods at 94%             | (₦105,280)             |
| Paystack card                    | (₦1,901)               |
| Delivery vehicle                 | (₦4,000)               |
| Loading, 3 × 50kg-class packages | (₦900)                 |
| **Contribution margin**          | **₦7,979, being 6.6%** |

The margin percentage climbs with basket size, because the trip cost is fixed and the fee cap has not yet bitten.

#### E. B2B restaurant order: 5 bags Local White Rice + 2 kegs Palm Oil + 1 bag Wake Gida, 8 packages

| Line                                               | Amount                  |
| -------------------------------------------------- | ----------------------- |
| Items, ₦210,000 + ₦56,000 + ₦55,000                | ₦321,000                |
| Delivery, ₦4,000 + 4 × ₦700 + 2 × ₦400             | ₦7,600                  |
| Cost-to-serve, 3% of ₦321,000 = ₦9,630, **capped** | ₦5,000                  |
| **Buyer pays**                                     | **₦333,600**            |
| Cost of goods at 94%                               | (₦301,740)              |
| Paystack card, capped                              | (₦2,000)                |
| Delivery vehicle, van                              | (₦8,000)                |
| Loading, 7 × ₦300 + 1 × ₦500                       | (₦2,600)                |
| **Contribution margin**                            | **₦19,260, being 5.8%** |

The cost-to-serve cap gives up **₦4,630** on this order. That is deliberate, and it is the cap doing the job it exists for: a fee that scales without limit on your best accounts is the fee most likely to lose them.

#### F. The order the caps break: institutional, 35 packages

20 bags rice, 5 bags beans, 10 kegs palm oil.

| Line                                             | Amount                  |
| ------------------------------------------------ | ----------------------- |
| Items                                            | ₦1,395,000              |
| Delivery, tapered ₦18,400, **capped at ₦10,000** | ₦10,000                 |
| Cost-to-serve, 3% would be ₦41,850, **capped**   | ₦5,000                  |
| **Buyer pays**                                   | **₦1,410,000**          |
| Cost of goods at 94%                             | (₦1,311,300)            |
| Paystack card, capped                            | (₦2,000)                |
| Delivery, truck                                  | (₦25,000)               |
| Loading, 20 × ₦300 + 5 × ₦500 + 10 × ₦300        | (₦11,500)               |
| **Contribution margin**                          | **₦60,200, being 4.3%** |

**Honest finding: the delivery cap still fails here.** A ₦10,000 cap against a ₦25,000 truck means the company absorbs ₦15,000, and the contribution percentage falls back below the mid-size order. The caps are sized correctly for the orders you have and incorrectly for the orders you want.

Recommended rule, unchanged:

> **Above 20 packages or ₦750,000 of goods, the order leaves the standard table and is quoted individually: delivery at actual cost plus 20%, cost-to-serve negotiated as a contract rate.**

Quoted at cost plus 20%, the same order returns **₦80,200, being 5.6%**. This is ordinary B2B procurement practice and no customer will find it surprising.

### What the worked examples prove

1. **Every order above the ₦25,000 minimum is now positive, between 5.0% and 6.6%.** That is a working revenue model, and it is a narrow, consistent band rather than a lottery on basket size.
2. **The margin comes from the goods, and only from the goods.** Across all six examples, delivery roughly breaks even by design and the cost-to-serve fee covers payment and part of the admin. Every naira of profit is procurement spread.
3. **Value density beats weight.** A ₦55,000 bag of beans and a ₦28,000 keg of oil occupy the same slot on the same vehicle and return ₦3,440 against ₦1,627.
4. **The sweet spot is 3 to 20 packages, roughly ₦100,000 to ₦750,000 per order.** That is precisely the restaurant and caterer segment, and it is the arithmetic behind the segment decision rather than a preference.
5. **A single measurement moved every number on this page.** The ₦4,000 datapoint turned a ₦2,000 delivery base into a ₦4,000 one and rescued three worked examples from negative. **Nine cost lines remain unmeasured. Assume they will move things this much too.**

### The number that matters most: break-even procurement spread

Every figure above assumes a 6% procurement spread, which is **the single unmeasured assumption the whole model rests on.** The right way to handle an unknown that important is not to guess harder, but to ask how much of it you actually need.

**Break-even procurement spread**, the minimum discount to market price at which a single-package order returns exactly zero:

Both columns below use the **measured ₦4,000 trip cost**, so this is a like-for-like comparison of the two fee structures.

| Single-package order      | Under current live pricing | Under locked pricing at 3% |
| ------------------------- | -------------------------- | -------------------------- |
| Palm Oil, ₦28,000         | **15.10%**                 | **0.19%**                  |
| Groundnut Oil, ₦35,000    | 12.10%                     | **-0.14%**                 |
| Tuwo Rice, ₦38,000        | 9.90%                      | **-0.24%**                 |
| Local White Rice, ₦42,000 | **10.57%**                 | **-0.36%**                 |
| Ofada Rice, ₦48,000       | 9.36%                      | **-0.50%**                 |
| Cowpea, ₦52,000           | 9.02%                      | **-0.19%**                 |
| Wake Gida, ₦55,000        | **8.79%**                  | **-0.25%**                 |

Read that table twice. Under the pricing running in production today, Debridgers must buy a bag of rice **10.6% below market** simply to break even on selling one, and a keg of palm oil **15.1% below market**. No procurement operation achieves that reliably, which is the arithmetic proof that the current price list cannot work at any volume.

**Under the locked pricing at 3%, six of the seven go negative.** A negative break-even spread means the order clears even when Debridgers pays the full market price for the goods and earns no procurement spread at all. A bag of rice bought at exactly market price still returns **₦151**.

Only palm oil, the cheapest hero package, still needs a positive spread, and it needs **0.19%**.

> **At 3% the fee structure alone carries the order. Procurement spread stops being what keeps the company alive and becomes upside. That is a different business: one where buying well makes money, rather than one where buying badly kills you.**

That is the strongest single argument for shipping the pricing change before doing anything else, and it is the number to put in front of an investor who asks why the business was not profitable before.

**The caution that belongs beside it:** this holds only while the delivery and loading assumptions hold, and those rest on a single measured trip. A vehicle cost materially above ₦4,000 pushes the column back toward positive.

Sensitivity, on the single bag of rice at locked pricing:

| Actual procurement spread    | Contribution | As % of order |
| ---------------------------- | ------------ | ------------- |
| 0%, paying full market price | ₦151         | 0.3%          |
| 1%                           | ₦571         | 1.2%          |
| 3%                           | ₦1,411       | 3.0%          |
| 6%, assumed                  | ₦2,671       | 5.7%          |
| 10%                          | ₦4,351       | 9.2%          |

**The supplier register closes this line, and it is the last large unknown in the revenue model.** Three invoices each for rice, beans, and oil.

### How the model actually makes money

The pricing above establishes that an order **clears**. Clearing is not earning.
₦2,671 on a bag of rice is 5.7% of the order, and a business that needs to pay
four people cannot be built on 5.7% at low volume. This section is about the gap
between solvent and profitable, and the three levers that close it.

#### What the fee structure did, and what it did not do

The fees now cover the outbound operation with a small surplus. On a ₦42,000 bag
the buyer pays ₦5,260 in delivery and cost-to-serve, and serving that order costs
₦5,109 in payment, vehicle and loading. The fees over-recover by **₦151**.

That is why the break-even procurement spread is negative: the goods can be sold
at zero margin and the order still does not lose money.

**It also means the fees are not where the profit is.** ₦151 is 0.3% of the
order. The fee structure bought solvency, not earnings. Everything the company
actually earns comes from the three levers below.

#### Lever 1: the trip, which is the largest cost and the most fixed

₦4,000 is 9.5% of a single-bag order and it does not vary with what is on the
vehicle. It varies with **how many drops the vehicle makes**.

| Deliveries per trip, same zone | Vehicle cost per order | Contribution on one bag of rice |
| ------------------------------ | ---------------------- | ------------------------------- |
| 1, dedicated trip              | ₦4,000                 | ₦2,671, being 5.7%              |
| 2                              | ₦2,000                 | ₦4,671, being 9.9%              |
| 3                              | ₦1,333                 | **₦5,338, being 11.3%**         |
| 4                              | ₦1,000                 | ₦5,671, being 12.0%             |

**Batching three deliveries into one trip doubles the contribution on every order
in it.** No fee change comes close to that, and no supplier negotiation does
either: a 6% procurement spread is worth ₦2,520 a bag, and moving from one drop
to three is worth ₦2,667.

This is the operational form of the density principle. It is also why the
minimum order and the zone structure matter beyond their own arithmetic: they
concentrate orders into the same places on the same days, which is what makes a
multi-drop route possible at all.

**What it requires:** delivery days per zone rather than delivery on demand.
Telling a buyer "Kaduna South is Tuesdays and Fridays" is a smaller concession
than it sounds for a restaurant ordering on a cycle, and it is worth roughly
₦2,667 an order.

#### Lever 2: basket size

Contribution in naira climbs steeply with packages, because the trip is already
paid for:

| Order                | Contribution | As % |
| -------------------- | ------------ | ---- |
| 1 package, ₦42,000   | ₦2,671       | 5.7% |
| 3 packages, ₦112,000 | ₦7,979       | 6.6% |
| 8 packages, ₦321,000 | ₦19,260      | 5.8% |

**Note the percentage flattens rather than climbing.** Both caps bite above
₦166,667 of goods, so the rate settles in a 5.7% to 6.6% band while the naira
figure multiplies sevenfold. That is the right trade, and it is worth stating
plainly: **chase order size for the naira, not for the rate.**

#### Lever 3: procurement, which is upside rather than survival

At a 6% spread, a bag of rice carries ₦2,520 of goods margin. That is roughly
what a third drop on the same trip is worth, and it is the one lever that scales
without any operational change once supplier relationships exist.

It is also the only lever that is still entirely unmeasured.

#### The risk that could undo all of it: inbound haulage

Every figure in this document compares against the **supplier's price**, not the
landed cost. Getting the bag from the supplier to the warehouse is recorded
nowhere and has been assumed to sit inside the 6% spread.

If it does not:

| Inbound haulage per bag    | Contribution on one bag of rice | As %     |
| -------------------------- | ------------------------------- | -------- |
| ₦0, the current assumption | ₦2,671                          | 5.7%     |
| ₦500                       | ₦2,171                          | 4.6%     |
| ₦1,000                     | ₦1,671                          | 3.5%     |
| **₦2,000**                 | **₦671**                        | **1.4%** |

At ₦2,000 a bag the negative break-even column disappears entirely and rice needs
a **4.4% procurement spread** just to clear. The honest statement is therefore:

> **The fees cover the outbound operation with a small surplus, provided inbound
> haulage is negligible. That is an assumption, not a measurement, and it is the
> single most important thing the supplier register has to close.**

The mitigations, in order of size:

1. **Buy in fewer, larger hauls.** Inbound cost is a trip cost like any other.
   Twenty bags on one ₦25,000 haul is ₦1,250 a bag; two bags on a ₦4,000 haul is
   ₦2,000 a bag
2. **Route density absorbs it.** Even at ₦2,000 inbound, three drops per trip
   returns **₦3,338 a bag, being 7.1%**, which is better than the current
   dedicated-trip figure
3. **Suppliers who deliver.** A supplier price that includes delivery to the
   warehouse may beat a lower price collected at the farm gate. **Record both
   in the supplier register and compare landed, not quoted**

#### The number that says the company makes money

Contribution per order is a unit economic. Profit is contribution against fixed
costs, and fixed costs are currently understated because nobody is paid.

| Fixed cost, monthly           | Cash today          | Fully loaded           |
| ----------------------------- | ------------------- | ---------------------- |
| Warehouse                     | ₦0, imputed ₦20,000 | ₦20,000                |
| Infrastructure, hosting, data | `TODO:` measure     | roughly ₦30,000        |
| Four salaries at market       | ₦0                  | ₦1,000,000             |
| **Total**                     | **roughly ₦50,000** | **roughly ₦1,050,000** |

What each contribution rate demands in monthly GMV:

| Contribution rate           | GMV to cover cash costs | GMV to cover fully loaded | Weekly B2B accounts needed |
| --------------------------- | ----------------------- | ------------------------- | -------------------------- |
| 5.7%, dedicated trips       | ₦880,000                | ₦18,400,000               | **14**                     |
| 8%, some batching           | ₦625,000                | ₦13,100,000               | **10**                     |
| 11.3%, three drops per trip | ₦440,000                | ₦9,300,000                | **7**                      |

Accounts are counted at Example E size, ₦321,000, ordering weekly.

**Two readings, and both matter:**

1. **Covering cash costs is close.** Three restaurant orders a month clears the
   ₦50,000 of real outgoings. The company is already near that.
2. **Paying four market salaries needs 7 to 14 weekly accounts**, depending
   entirely on route density. That range is the whole argument for Lever 1: the
   difference between 14 accounts and 7 is not better selling, it is batching
   deliveries.

The existing 90-day target of 12 to 15 named accounts sits directly inside that
band. **That is not a coincidence worth ignoring: the growth target and the
profitability target are the same target.**

#### What to change, concretely

1. **Introduce delivery days per zone.** The single highest-value operational
   change available, worth roughly ₦2,667 an order at three drops
2. **Record inbound haulage per bag** in the supplier register, and compare
   suppliers on landed cost
3. **Consolidate purchasing** into fewer, larger hauls
4. **Keep chasing basket size for the naira**, not for the percentage
5. **Track contribution against fixed costs monthly**, not contribution alone.
   A 5.7% order rate is fine or fatal depending only on volume

### Future revenue streams

Named, and deliberately not pursued yet: B2B contract procurement margin, buy-now-pay-later on bulk orders through a licensed partner, market price intelligence sold to government and NGOs, financial services through regulated partners, logistics orchestration on proven routes.

## 6. Key resources

### Physical

**Warehouse: a co-founder's house, currently costing the company nothing.** **PROVEN**

The founder is right that this should cost something. The recommendation:

> **Impute market rent as a founder in-kind contribution. Do not pay cash yet. Book the cost.**

Pick a defensible monthly figure for equivalent storage space in Kaduna, record it as a monthly line in the cost structure, and record the cumulative total as a contribution by that co-founder. Three reasons, all practical:

1. **Contribution margin is a lie without it.** If the model only works because someone is donating a building, that is a hidden subsidy, and the moment you take a second city or that co-founder needs the space back, the economics change without warning.
2. **It documents a real contribution.** An unrecorded in-kind contribution is a future argument. A recorded one is a fact with a date on it.
3. **An investor will ask.** "What does your warehouse cost?" answered with "nothing, it's my house" is a red flag. Answered with "₦X per month, currently contributed in kind by a co-founder and recorded as such" is a sign of a company that knows its own numbers.

#### What to put down for the warehouse, at 10 bags a month

The founders asked for a figure. Here is the reasoning and a number to book.

**Space required.** Ten 100kg bags is one tonne. A 100kg bag occupies roughly 1m by 0.6m on the floor and stacks three or four high on a pallet or dunnage. Ten bags is therefore about **2 square metres of stack**, but usable storage needs walking space, separation from walls for ventilation, and room to load out. Call it **6 to 10 square metres of dry, secure, ventilated space**.

**What that rents for.** A small lock-up store in Kaduna metropolis is the right comparable, not industrial warehousing. **Do not take a figure from this document.** Ask two actual store or warehouse owners in the operating area what a small lock-up rents for annually, and use the lower quote. That conversation takes an afternoon and produces a defensible number instead of an invented one.

**What is booked.** Founder-accepted: **₦20,000 per month**, recorded as an in-kind contribution by the co-founder whose house is being used, dated from the month it starts. Replace it with a real quote when the two conversations happen; until then it is a defensible placeholder and, more importantly, it is no longer zero.

**The finding that matters more than the figure:**

| Monthly throughput | Warehouse cost per bag sold | As % of a ₦3,300 margin on beans |
| ------------------ | --------------------------- | -------------------------------- |
| **10 bags**        | **₦2,000**                  | **61%**                          |
| 30 bags            | ₦667                        | 20%                              |
| 100 bags           | ₦200                        | 6%                               |
| 300 bags           | ₦67                         | 2%                               |

**At ten bags a month, the warehouse consumes roughly 60% of the gross margin on every bag.** That is not a rent problem, it is a throughput problem, and no cheaper building fixes it.

Two consequences:

1. **The lever is dwell time, not rent.** Because customers prepay and only confirmed orders are processed, Debridgers can run close to a cross-dock: buy against a paid order, hold for hours or a day, deliver. Stock that never sits costs nothing to store. **Track days of stock on hand as the metric that controls this cost line**, not the rent figure.
2. **Do not sign a warehouse lease at this volume.** The co-founder's house is the correct answer for now, precisely because it is elastic. A lease converts a variable, throughput-driven cost into a fixed one at the exact stage when throughput is the unknown. Revisit at 100 bags a month, where a real store starts paying for itself.

No owned fleet. No cold chain. Warehouse capacity in packages is **UNKNOWN** and is worth counting once, because it is a hard ceiling on order volume.

### Human

Four people, all doubling as agents and as every other role the company needs.

| Person                        | Primary role                                                        | Also does                                                                  |
| ----------------------------- | ------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| **BAMTEFA Olorunshogo Moses** | CTO. Repository management, infrastructure, main frontend developer | Backend cover, business development                                        |
| **Nwankwo Stephanie**         | Founder. Main backend developer, infrastructure                     | Frontend cover, business development, social media planning, video editing |
| **Okpere Henry**              | Mobile developer                                                    | Backend, sales representative, outreach management                         |
| **Ajadi Abdulmalik Olayinka** | Design: fliers, website, app, social media planning                 | Brand and campaign material                                                |

All four plan together. All four are currently performing the agent function. Nobody is recorded as salaried.

**Both technical founders cover both ends of the stack, and both do business development.** Olorunshogo owns the repository, infrastructure, and the frontend, with backend cover. Stephanie owns the backend and shares infrastructure, with occasional frontend cover. Henry adds mobile and backend on top of sales. That redundancy is a genuine asset for a four-person team and it is why a two-week absence by any one person is survivable, which the earlier profile said it was not.

**Business development sits with Olorunshogo and Stephanie only.** It is a second job held by the two people who are also the two main developers. Henry runs sales representation and outreach, which is the execution layer, not the same thing: outreach works a prospect list, business development decides which lists, segments, partners, and terms are worth pursuing at all.

That split is the correct arrangement at two customers, and it carries the sharpest structural risk in the team. **The two people who own business development are the same two who own the codebase**, so every hour spent on a partnership conversation is an hour not spent on the platform, and vice versa. It is the reason the feature halt is a real decision rather than a preference, and it is the first arrangement that should break when the account count reaches double digits.

**The constraint this creates:** three of four people are engineers or designers, and the validated channel is field sales. The company's proven revenue engine is staffed by whoever has time after building. This is the strongest argument for the founder's own decision to **halt feature development** and is worth stating in the plan explicitly rather than leaving as an intention.

### Financial

**₦300,000 cash on hand.**

At roughly ₦39,500 procurement cost per 50kg bag of rice, that is about **7 to 8 bags** if it were all committed to stock at once.

**But that is not the binding number, because customers pay before delivery.** **PROVEN**

The binding constraint is confirmed as **float, not inventory**. Since there are no agents yet and only confirmed orders are processed, the current exposure is genuinely low, which is the correct posture at ₦300,000. It also means:

### Working capital: the model runs on a negative cycle

Confirmed by the founders: **B2B customers pay before delivery.** Combined with the decision to process only confirmed orders, that produces the most capital-efficient structure a distribution business can have:

```text
Customer pays  ->  Debridgers buys from supplier  ->  Debridgers delivers
     Day 0                    Day 0 to 2                    Day 1 to 3
```

The customer's money funds the procurement. Debridgers is not financing the trade, the buyer is.

**Order size is therefore not limited by cash.** A ₦500,000 institutional order is fundable by the customer's own prepayment. The ₦300,000 is not order-size capital: it is a **buffer**, and its job is to absorb the gaps prepayment does not cover:

| What the ₦300,000 is actually for                                           | Why                                                              |
| --------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Suppliers who want cash on collection before the customer's transfer clears | A settlement timing gap, usually hours, occasionally a day       |
| Transport paid up front, before the order is delivered and settled          | Vehicle hire is cash                                             |
| Honouring a replacement under the quality guarantee                         | You replace first and recover from the supplier later, if at all |
| A customer who cancels after you have bought                                | Rare under prepayment, but not impossible                        |
| Buying ahead of a price move on a hero product                              | Optional, and the only genuinely strategic use of the buffer     |

**Three consequences worth stating plainly:**

1. **This is a strong story, not a weak one.** Negative working capital is the structure Dell and Amazon are famous for. It means growth does not consume cash at the same rate as revenue, and it is the single most attractive structural fact about the business today. It belongs near the front of any investor conversation, ahead of the technology.
2. **It only holds while suppliers are paid at or after collection.** The moment a supplier demands prepayment or a deposit to secure stock, the cycle inverts and cash becomes the constraint after all. **Record supplier payment terms in the supplier register.** It is the column that decides whether this advantage survives.
3. **It is a reason to keep prepayment as the default, not a reason to refuse terms forever.** See below.

### Why prepayment is a reason to raise capital, not a reason not to

Founder position, recorded: **the negative working capital cycle does not mean Debridgers does not want funding.** It means the funding is for a specific, nameable thing rather than for "growth".

**The constraint prepayment creates.** Some buyers, and often the best ones, will not prepay. Institutional buyers, established restaurant groups, and anything with a procurement department pay on delivery or on terms because that is their policy, not because they distrust you. Under prepayment-only, Debridgers cannot serve them at all. **The company is not turning down orders because demand is missing. It is turning them down because the balance sheet cannot carry them.** That is the single clearest use of capital in the business.

**What it costs to say yes**, and this is the number to raise against:

```text
Credit float required  =  monthly GMV on terms  ×  (days of terms ÷ 30)
```

Worked, at Example E order size of ₦321,000 per account per month:

| Accounts on terms | Monthly GMV on terms | Float at 14-day terms | Float at 30-day terms |
| ----------------- | -------------------- | --------------------- | --------------------- |
| 2                 | ₦642,000             | ₦300,000              | ₦642,000              |
| 5                 | ₦1,605,000           | ₦749,000              | ₦1,605,000            |
| 10                | ₦3,210,000           | ₦1,498,000            | ₦3,210,000            |
| 20                | ₦6,420,000           | ₦2,996,000            | ₦6,420,000            |

The float is **permanent working capital, not spend.** It recycles: it is tied up, released on payment, and immediately tied up again by the next order. It does not burn, which is exactly why it suits debt, an overdraft, invoice financing, or a NIRSAL or Bank of Agriculture facility better than it suits equity. **Do not sell equity to fund a revolving float.**

**Three rules that must travel with the decision, or the advantage becomes a liability:**

1. **Price the terms.** A buyer on 30-day terms is borrowing from Debridgers for a month. That should cost them, either as a higher cost-to-serve rate or as a prepayment discount they forgo. Free credit is a discount nobody recorded.
2. **Provision for bad debt.** Prepayment has no credit risk. Terms do. Budget a percentage of terms GMV as a provision from the first account, before the first default rather than after it.
3. **Earn terms, do not grant them.** Recommended policy: **prepayment for the first three orders, terms available afterwards on request, subject to a credit limit set per account.** The order history is the credit file. This is ordinary trade practice and it converts the platform's transaction record into an underwriting asset, which is the same asset NIRSAL and BOA will eventually want to see.

**The resulting story is stronger than the usual one.** Not "we need money to buy stock", which every distribution business says and which invites the question of why the model consumes cash. Instead: **"our model runs on negative working capital and does not need financing to grow. We want a revolving facility to serve the buyers who require terms, sized at a formula we can show you, secured against an order history we can prove."** That is a fundable sentence.

### Intellectual and technical **BUILT**

NestJS 11, Drizzle over PostgreSQL, React Router 7 with SSR, pnpm and Nx monorepo, Paystack, Cloudinary, Mailtrap, Redis. Server-side re-pricing, integer kobo throughout, database-level overdraw checks, 75 end-to-end tests across 11 suites against an isolated migrated database. **Payment paths have completed a live gateway round trip and are verified.**

### Relational, and how to stop it being "claimed"

The founder asked what "local farmer knowledge is claimed" means and what would make it documented. It means: the company says it has supplier and market relationships, and there is no artefact anywhere that a third party could inspect to confirm it. Knowledge in four people's heads is not a company asset. It is a personal one.

**Build a supplier register.** One spreadsheet, one row per supplier, these columns:

| Column                                       | Why                                                                              |
| -------------------------------------------- | -------------------------------------------------------------------------------- |
| Name, phone, location, LGA                   | The relationship exists and is contactable                                       |
| Products supplied                            | Which hero products they cover                                                   |
| Capacity per cycle, in packages              | Whether they can meet a real order                                               |
| Last three prices paid, with dates           | **This is the procurement spread evidence.** Without it, the 6% margin is a hope |
| Lead time from order to collection           | Whether you can promise a delivery date                                          |
| Quality outcome on last three purchases      | Whether the replacement guarantee is affordable                                  |
| Payment terms: cash on collection, or credit | Directly determines working capital need                                         |
| Relationship owner                           | Which of the four founders holds it                                              |

Ten rows in that sheet turns "we know farmers" into a verifiable asset, gives you the real cost of goods that every number in this document is waiting on, and is the exact artefact KADA, NIRSAL, and any investor will ask to see. It is a morning's work and it is the highest-value non-code task in the company.

The same discipline applies to buyers: the outreach CRM already does this, which is why the demand side is in better shape than the supply side.

## 7. Key activities

| Activity                                           | Status                                                        |
| -------------------------------------------------- | ------------------------------------------------------------- |
| **Procurement from suppliers into warehouse**      | **PROVEN**, running today                                     |
| **B2B outreach: calls, WhatsApp, personal visits** | **PROVEN**, produced all revenue                              |
| **Order fulfilment and delivery**                  | **PROVEN** at current volume                                  |
| **Payment processing and reconciliation**          | **PROVEN**, live gateway round trip verified                  |
| Weekly price setting against market rates          | **BUILT**                                                     |
| Weekly commission payout run                       | **BUILT**, Fridays 10:00 UTC, no agents to pay yet            |
| Agent recruitment, KYC, approval                   | **BUILT**, not yet exercised                                  |
| Stock pack allocation on consignment               | **BUILT**, and carrying the ₦1,300 hardcode defect            |
| Platform engineering                               | **Deliberately halted**, founder decision                     |
| **Unit economics measurement**                     | **THE GAP.** Every worked example above runs on assumed costs |

The last row is not a missing feature. It is a missing business function, and closing it is the single highest-value activity available to the company for the next 30 days.

## 8. Key partnerships

**Existing: Paystack.** **PROVEN**, live and verified end to end. Card checkout, wallet funding, dedicated virtual accounts, transfer recipients in kobo, agent payouts.

**Recorded formal partnerships beyond that: none.**

### Wanted, in priority order

| Partner                             | What Debridgers wants                                          | What Debridgers offers                                         |
| ----------------------------------- | -------------------------------------------------------------- | -------------------------------------------------------------- |
| Farmer cooperatives                 | Reliable supply, known quality, predictable price and quantity | Guaranteed off-take, transparent pricing, payment records      |
| KADA                                | Farmer introductions, credibility, cooperative access          | Market linkage, digital records, demand data for state farmers |
| NIRSAL, BOA, NADF                   | Non-dilutive and working capital, risk-sharing                 | Transaction history as underwriting evidence                   |
| Restaurants, caterers, hotels       | Recurring contracted demand                                    | Fixed pricing, scheduled delivery, procurement predictability  |
| Universities and large employers    | Volume access to a concentrated population                     | Staff and student food programmes at market price              |
| Logistics providers                 | Route economics on reliable volumes                            | Consistent, predictable freight volume                         |
| Ventures Platform, Launch Africa    | Institutional equity, later                                    | Regional density with proven economics                         |
| Tony Elumelu, Mastercard Foundation | Grants, non-dilutive                                           | Agent livelihoods, smallholder inclusion                       |

### The discipline point, accepted

> A signed MoU with no transactions is not traction.

Every partnership is measured in one of six units and nothing else: **revenue, orders, supply secured, financing unlocked, customers reached, cost removed.** A partnership that cannot be scored in one of those does not go on the list.

## 9. Cost structure

The founder asked whether a real cost structure can be given now. **Mostly yes.** Here it is, with each line marked by whether it is known, estimated, or still missing.

### Variable costs, per order

| Cost                                                 | Status              | Figure                                            | Note                                                                                                              |
| ---------------------------------------------------- | ------------------- | ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Cost of goods                                        | **ESTIMATED**       | 90% to 95% of buyer price                         | The supplier register closes this in one morning                                                                  |
| Paystack, card in                                    | **KNOWN**           | 1.5% + ₦100, capped ₦2,000                        | Verify on the dashboard. Rate is per method, and this is the expensive one                                        |
| Paystack, virtual account in                         | **KNOWN, verify**   | around 1%, capped ₦300                            | Already built and issued per buyer. Steer B2B here                                                                |
| Paystack, bank transfer in                           | **KNOWN, verify**   | flat, roughly ₦10 to ₦50                          | Cheapest rail. Likely how both current customers already pay                                                      |
| Order admin: taking, invoicing, reconciling, support | **UNMEASURED**      | Currently absorbed by unpaid founder time         | Two weeks of minute-logging at an imputed hourly rate closes this                                                 |
| Delivery vehicle                                     | **ESTIMATED**       | ₦2,500 for 1 to 3 packages, ₦5,000 for a van load | 30 days of logged transport payments closes this                                                                  |
| Loading and offloading                               | **ESTIMATED**       | ₦300 per 50kg package, ₦500 per 100kg package     | Same. 100kg is a two-person lift                                                                                  |
| Agent commission                                     | **DECIDED PENDING** | See Decision 4                                    | Currently 5% of order value, which is unaffordable                                                                |
| Buyer referral commission                            | **KNOWN**           | ₦20 per order, perpetual                          | Trivial at these order sizes, but perpetual, so bound it                                                          |
| Referral discount                                    | **KNOWN**           | ₦500 flat                                         | Also trivial at these order sizes, and therefore probably not motivating anyone. Revisit                          |
| Replacement and spoilage                             | **UNKNOWN**         | Zero recorded                                     | The quality guarantee has a price. Log every replacement                                                          |
| Packaging                                            | **KNOWN, ₦0 today** | ₦0                                                | Confirmed: original sealed supplier packages. Rises to sacks, labour, labels and shrinkage the day bulk is broken |

### Fixed costs, per month

| Cost                            | Status                | Figure                                                                                                                                                                                   |
| ------------------------------- | --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Warehouse                       | **IMPUTED**           | ₦0 cash, co-founder's house. Book **₦20,000 per month** as an in-kind contribution, pending two real quotes. At 10 bags a month this is ₦2,000 per bag, roughly 60% of the margin on one |
| Hosting, domain, infrastructure | **UNKNOWN but small** | One invoice pull closes this                                                                                                                                                             |
| Transport and data for outreach | **UNKNOWN**           | One month of receipts closes this                                                                                                                                                        |
| Team stipends                   | **KNOWN**             | ₦0. Nobody is paid                                                                                                                                                                       |
| Paystack transfer out           | **KNOWN**             | ₦10 to ₦50 per payout, negligible until agents exist                                                                                                                                     |

### The verdict, revised

The verdict:

> **The gross margin per order is not thin. It is roughly ₦2,500 to ₦4,000 per 50kg bag at a 6% to 10% procurement spread, which is a real and workable margin. What is thin, and currently negative, is the fee structure meant to cover delivery and payments. The business is not structurally unprofitable. It is structurally mispriced.**

That is a much better problem to have, because mispricing is fixed by a decision, whereas a structurally negative margin is fixed only by changing the business.

Two further consequences worth stating:

1. **Every order below roughly ₦25,000 destroys value at any sane fee level.** The minimum order rule is not a nice-to-have, it is a solvency rule.
2. **Contribution margin scales with basket size, not order count.** Chasing order count at this AOV is the wrong optimisation. One restaurant ordering ₦321,000 monthly is worth more than thirty households ordering one bag of garri, and costs less to serve.
3. **The largest cost line in the business is currently invisible, because it is unpaid founder labour.** Order admin, reconciliation, support, and procurement calls are real costs recorded at zero. The cost-to-serve fee at 3% is the instrument that will eventually pay for them, and the minute-log is what turns them from invisible into managed. Until that log exists, every contribution figure in this document is flattered by four people working for free.

## The flywheel

### The chain today, and the chain we are building toward

```text
TODAY (PROVEN):

  Supplier  ->  Debridgers  ->  B2B Buyer
                (warehouse +
                 founder-run
                 delivery)

TARGET:

  Farmer  ->  Debridgers  ->  Buyers
              (warehouse +
               thin delivery
               layer)
```

The target chain removes one margin-taker and replaces it with a relationship Debridgers owns. It is worth stating what makes it hard: a supplier is one phone call with known quality and immediate availability; a farmer is a relationship, a season, a quality risk, and a lead time. **Moving from supplier to farmer is not a simplification, it is an operational upgrade that has to be earned**, and the supplier register is the instrument that earns it, because it makes the price and quality comparison visible.

### The two loops

```text
Loop 1, demand and supply density:
More buyers -> more predictable demand -> better supplier commitments ->
better procurement terms -> wider spread -> better prices or better margin ->
more repeat orders -> more transaction data -> better price intelligence ->
more supplier leverage -> more buyers

Loop 2, distribution:
More orders -> more agent earnings -> better agent retention ->
more neighbourhood coverage -> more buyers -> more orders
```

**Loop 1 is live and turning slowly.** Two customers, repeat orders, real procurement. It is small but it is not hypothetical.

**Loop 2 has not started.** There are no agents. It cannot start until Decision 4 settles agent economics, and it should not start before then.

### Where each loop currently breaks

| Break                            | Loop | Status                                                 |
| -------------------------------- | ---- | ------------------------------------------------------ |
| Only 2 buyers                    | 1    | Open, and the primary focus                            |
| Supply is suppliers, not farmers | 1    | Open by design, the target state                       |
| Unknown true cost of goods       | 1    | **Closable in one morning** with the supplier register |
| Unknown delivery cost            | 1    | **Closable in 30 days** by logging transport payments  |
| No agents exist                  | 2    | Blocked on Decision 4                                  |
| Agent economics unproven         | 2    | Blocked on cost of goods                               |

Four of six breaks close with measurement, not with capital or code.

## What this canvas says, in one paragraph

Debridgers is a B2B food procurement and distribution business in Kaduna that earns its margin by buying staples better than its customers can and delivering them at a transparent market price, with a technology layer that handles pricing, payment, reconciliation, and the consignment machinery for a distribution network it has not yet recruited. Demand is proven: two food businesses, ten-plus repeat orders, acquired by founder outreach. Supply is proven at the supplier tier and is the layer the company intends to deepen to farmers. The margin exists in the goods and is real at these prices. The fee structure that is supposed to cover delivery and payments was built for a ₦1,400 product and is below cost. The moat, if it arrives, is dense supply plus dense demand plus trusted agents plus transaction data in one city nobody else is fighting over, and the technology is the enabling layer, not the moat.

## The decisions to lock

### Decision 1: segment and margin architecture **LOCKED**

**1a. Primary segment: B2B food businesses in Kaduna, with institutions as the declared next focus.** Households, shops, and market traders are explicitly deferred. Shops and traders remain opportunistic where sourcing quality permits.

**1b. Margin architecture: procurement spread.**

The evidence decided this. The goods spread is ₦2,500 to ₦4,000 per bag; the fees are ₦600. The business makes its money buying better than the market, and sells at the market reference price. Fees exist to cover delivery and payment processing, not to generate profit.

Buyer-facing wording, which is true under this architecture:

> **We sell at the market price. We make our margin by buying better, not by charging you more.**

**Consequence:** the procurement function is the business. The supplier register is not admin work, it is the core asset.

### Decision 2: hero products **LOCKED**

> **Rice, beans, and oil. Three categories.**

Everything else in the catalogue stays listed and orderable, but unpromoted, unstocked ahead of demand, and absent from the sales sheet.

The SKUs inside each category:

| Category  | SKU                     | Unit         | Price   | Role                                              |
| --------- | ----------------------- | ------------ | ------- | ------------------------------------------------- |
| **Rice**  | Local White Rice        | 50kg bag     | ₦42,000 | Volume driver. Highest frequency staple           |
|           | Tuwo Rice               | 50kg bag     | ₦38,000 | Regional demand, and the cheaper substitute       |
|           | Ofada Rice              | 50kg bag     | ₦48,000 | Premium, stock to order only                      |
| **Beans** | Wake Gida (Honey Beans) | 100kg bag    | ₦55,000 | **Best margin per vehicle slot in the catalogue** |
|           | Cowpea (White Beans)    | 100kg bag    | ₦52,000 | Substitute, same economics                        |
| **Oil**   | Palm Oil                | 25 litre keg | ₦28,000 | Attaches to almost every restaurant basket        |
|           | Groundnut Oil           | 25 litre keg | ₦35,000 | Higher value, same slot                           |

**Why these three carry the model:**

- **They are what a food business buys every week.** A restaurant reorders rice, beans, and oil on a cycle. Yam and potato are occasional; garri is a household product.
- **Value density.** Every hero SKU is ₦28,000 or above in one vehicle slot. The dropped products, garri at ₦12,000 to ₦14,000 and Irish Potato at ₦18,000, occupy the same slot for a third of the revenue and are the products most likely to trip the ₦25,000 minimum.
- **Non-perishable.** All three store without cold chain, which the company does not have.
- **A single supplier conversation covers a category.** Three categories is three procurement relationships to deepen, not eleven.

**Two loose ends this creates:**

1. **Millet has been purchased but is not in the catalogue and is not a hero product.** Either list it properly with a unit and price, or stop buying it. An unlisted product cannot be ordered, priced, costed, or reported on, and it will quietly corrupt every margin figure it touches.
2. **Garri, yam, and Irish Potato are the natural first candidates if you ever break bulk**, because smaller units are exactly what would make them viable. That is a decision to make after the NAFDAC opinion, not before.

### Decision 3: pricing **LOCKED, pending shipping**

Lock all four together, because each one alone leaves a hole:

| Element                                              | Current                           | Locked                                                                                                                                                                                                                                                                  |
| ---------------------------------------------------- | --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Goods**                                            | Market reference price            | Unchanged. Target procurement spread 6% to 10%                                                                                                                                                                                                                          |
| **Cost-to-serve fee**, currently misnamed "handling" | ₦100 flat                         | **3% of items subtotal, floor ₦500, cap ₦5,000**                                                                                                                                                                                                                        |
| **Delivery**                                         | ₦500 base, ₦500 per extra package | **Zone base covering 2 packages, set to the measured trip cost, then a taper.** Kaduna South ₦4,000 / ₦700 / ₦400, capped ₦10,000. North ₦4,500 / ₦800 / ₦450, capped ₦11,000. Chikun ₦6,000 / ₦1,000 / ₦600, capped ₦14,000, and the Chikun zone areas need correcting |
| **Minimum order**                                    | None                              | **₦25,000 or 2 packages** for delivery. Below that, pickup or same-zone add-on                                                                                                                                                                                          |

Rationale in one line each: the 3% cost-to-serve fee sits deliberately above the 2.10% rate at which the cheapest hero order merely pays for its own card processing, and the surplus funds the order admin nobody is currently costing; the delivery base is set to the **measured** ₦4,000 trip cost rather than an estimate, and the taper prices the trip rather than the bag, which is what the cost actually is; both caps protect the large accounts the segment decision depends on; the minimum stops the company selling below cost.

**Rename `handling_fee` to `service_fee` or `cost_to_serve_fee` in the schema, the DTOs, and the buyer-facing copy.** The name "handling" is why it was set at ₦100. Fixing the number without fixing the name invites the same mistake again the next time someone asks what it is for.

**Above 20 packages or ₦750,000 of goods, quote individually:** delivery at actual cost plus 20%, cost-to-serve negotiated as a contract rate. The standard table breaks at that size, as Worked Example F shows.

**Code changes this implied**, all shipped:

- `HANDLING_FEE_KOBO` is now `computeServiceFee`, 3% of subtotal with a ₦500 floor and ₦5,000 cap, in `apps/debridgers-backend/src/api/v1/buyer/delivery-fee.ts`, renamed to the cost-to-serve fee it actually is
- `PER_EXTRA_PACKAGE_KOBO` is a taper in the same file
- `PACKAGES_INCLUDED_IN_BASE` moved from 1 to 2
- Zone `delivery_fee` rows updated in `seeder.ts` and in the database to ₦4,000 / ₦4,500 / ₦6,000, and the Chikun zone's areas corrected, by migration `0021_catalogue_and_zone_corrections.sql`
- The taper and the ceiling moved onto the zone table as `tier_one_per_package_kobo`, `tier_two_per_package_kobo` and `delivery_cap_kobo`, by migration `0022_zone_taper_order_source_millet.sql`. One shared taper under-charged the far zones on every package past the second, because distance changes what a marginal package costs and not only what the trip costs
- Product `unit` strings corrected where bags are 100kg, and millet either listed or dropped
- A minimum-order check in the quote and checkout paths
- The hardcoded `130000` in `product.service.ts:279` replaced with the real product price
- The `140000` default on `orders.unit_price` removed

That is a half-day of work and it is the only engineering the halt should permit, because it is a pricing decision, not a feature.

### Decision 4: agent commission and consignment exposure **LOCKED**

Agents do not exist yet. That is not a reason to defer this. **A commission rate written into an agent agreement cannot be lowered afterwards without destroying the distribution layer, so it has to be right before the first recruit, not after.** Planning is precisely what this is for.

#### The commission basis

**A percentage of gross order value cannot work.** 5% of a ₦42,000 bag is ₦2,100 against a gross spread of roughly ₦2,520. It pays out 83% of the margin and leaves nothing for anything else.

| Basis                                 | On a ₦42,000 bag       | Verdict                                                                                  |
| ------------------------------------- | ---------------------- | ---------------------------------------------------------------------------------------- |
| % of order value, the current setting | 5% = ₦2,100            | **Unaffordable.** Consumes the margin                                                    |
| % of gross margin                     | 40% of ₦2,520 = ₦1,008 | Correct economically, but an agent cannot verify it, and unverifiable pay destroys trust |
| **Flat naira per package, banded**    | **₦1,000**             | **Locked.** Affordable, understandable, verifiable by counting                           |

**Locked bands, mapped to the hero products:**

| Band      | Products                 | Unit         | Commission per package |
| --------- | ------------------------ | ------------ | ---------------------- |
| **Beans** | Wake Gida, Cowpea        | 100kg bag    | **₦1,200**             |
| **Rice**  | Local White, Tuwo, Ofada | 50kg bag     | **₦1,000**             |
| **Oil**   | Palm Oil, Groundnut Oil  | 25 litre keg | **₦700**               |
| Non-hero  | Garri, Yam, Irish Potato | Various      | **₦400**               |

#### The sanity check that keeps this honest

The right way to test a flat commission is to express it as a share of gross margin, because that is what it actually consumes:

| Product          | Price   | Gross margin at 6% | Commission | **As % of margin** |
| ---------------- | ------- | ------------------ | ---------- | ------------------ |
| Wake Gida        | ₦55,000 | ₦3,300             | ₦1,200     | **36%**            |
| Local White Rice | ₦42,000 | ₦2,520             | ₦1,000     | **40%**            |
| Palm Oil         | ₦28,000 | ₦1,680             | ₦700       | **42%**            |

> **Rule: agent commission stays between 30% and 45% of gross margin. Below 30% the agent will not bother; above 45% the company is working for the agent.**

**The caveat that must travel with this decision.** Every figure above assumes a 6% procurement spread. **If the real spread turns out to be 3%, ₦1,000 on a bag of rice is 79% of gross margin and the whole band structure is unaffordable.** The bands are locked in structure and provisional in level. Confirm them against the supplier register before the first agent agreement is signed, and adjust the level, never the basis.

#### What an agent order actually earns Debridgers

An agent sells locally and handles their own last mile, so the company gives up the delivery fee and the cost-to-serve fee but also avoids the vehicle and the loading:

| Line, one 50kg bag of Local White Rice    | Direct, delivered | Through an agent   |
| ----------------------------------------- | ----------------- | ------------------ |
| Goods margin at 6%                        | ₦2,520            | ₦2,520             |
| Delivery fee collected, less vehicle paid | roughly nil       | not applicable     |
| Cost-to-serve collected, less Paystack    | +₦451             | not applicable     |
| Loading                                   | (₦300)            | borne by the agent |
| Agent commission                          | none              | (₦1,000)           |
| **Contribution**                          | **₦2,671**        | **₦1,520**         |

**An agent order is worth roughly ₦1,151 less than a direct one, and costs no founder time and no vehicle.** The gap widened when the fee went to 3%, because an agent sale collects no cost-to-serve fee at all. That is the trade, stated plainly. It is a good trade once founder hours are the binding constraint, and a poor one while there are two customers and four people with time.

#### Consignment exposure, which is the part the old numbers hid

The consignment model was designed when a "pack" was assumed to be ₦1,300. **At real prices a consignment package is ₦27,000 to ₦54,000 of company stock in a stranger's hands.** That changes the risk by a factor of forty, and nothing in the current design reflects it.

| Stock held by one agent | Value at remit price | As % of ₦300,000 cash |
| ----------------------- | -------------------- | --------------------- |
| 1 bag of beans          | ₦53,800              | **18%**               |
| 2 bags of rice          | ₦82,000              | **27%**               |
| 5 bags of rice          | ₦205,000             | **68%**               |
| 5 bags of beans         | ₦269,000             | **90%**               |

**One agent absconding with five bags of beans takes 90% of the company's cash.** That is not a risk to monitor, it is a risk to design out.

**Locked exposure limits, to be enforced in the stock request flow:**

| Limit                                                 | Value                                          | Why                                                      |
| ----------------------------------------------------- | ---------------------------------------------- | -------------------------------------------------------- |
| Total consignment outstanding, all agents             | **≤ 30% of cash on hand**, being ₦90,000 today | The company must survive a total loss of consigned stock |
| Per-agent ceiling, first 8 weeks                      | **₦50,000**, roughly one bag of beans          | A new agent is an unknown                                |
| Per-agent ceiling, after 8 weeks above 95% remittance | **₦150,000**, reviewed monthly                 | Track record earns capacity                              |
| Maximum days outstanding                              | **7 days**                                     | Stock that sits is float that is not working             |

At ₦300,000 of cash those limits permit roughly **two agents on consignment at a time.** That is the honest capacity, and it is the strongest argument for the model below.

#### Order-first, not stock-first: apply the buyer discipline to agents

The buyer side already runs on prepayment, and it is the most attractive structural fact about the business. **The same logic applies to agents and eliminates consignment risk entirely:**

```text
Stock-first, the current design:
  Debridgers releases stock  ->  agent sells  ->  agent remits
  Exposure: full stock value, for as long as it takes

Order-first, recommended for new agents:
  Agent takes a paid order  ->  Debridgers releases stock  ->  agent delivers
  Exposure: none
```

**Recommended policy: every new agent starts order-first. Consignment is earned**, unlocked after eight weeks and above 95% remittance on order-first volume, then capped per the table above. This costs the agent nothing, since they never needed capital under either model, and it costs Debridgers nothing except the ability to say "here, take stock" to someone with no record.

#### The remittance metric, defined properly

The recorded "agent remittance rate: 5%" that the diagnosis called an emergency was a confusion between two unrelated numbers. **It is not retired, it is rebuilt**, because the metric matters enormously the moment agents exist. The confusion is fixed by never letting the two share a page without labels:

| Metric                      | Definition                                                    | Target                        | Nature                                                       |
| --------------------------- | ------------------------------------------------------------- | ----------------------------- | ------------------------------------------------------------ |
| **Remittance rate**         | Stock value remitted ÷ stock value due, over a period         | **> 95%**                     | A **revenue collection** measure. High is good               |
| **Commission rate**         | What Debridgers pays an agent per package sold                | ₦1,200 / ₦1,000 / ₦700 / ₦400 | A **cost** measure. It is a naira figure, never a percentage |
| **Outstanding stock value** | Issued, minus sold-and-remitted, at a point in time           | ≤ ₦90,000 total               | An **exposure** measure                                      |
| **Days outstanding**        | Mean age of unremitted stock value                            | **< 7 days**                  | The early warning. It moves before the rate does             |
| **Default rate**            | Stock value written off ÷ stock value issued                  | **< 2%**                      | The loss measure                                             |
| **Recovery rate**           | Value recovered after default ÷ value defaulted               | Track, no target yet          | Whether chasing is worth the effort                          |
| **Agent activation rate**   | Agents with a completed order this period ÷ registered agents | **> 70%**                     | Twenty inactive agents are worse than five productive ones   |

**Why the original number was meaningless, and why that is worth writing down.** There are no agents, so no stock has been issued, so nothing is due, so the remittance rate is undefined rather than 5%. A 5% figure most likely leaked across from the commission setting. **The lesson is structural, not clerical: a collection percentage and a cost percentage were allowed to look alike.** The locked design prevents a recurrence by making commission a naira amount per package, so the two can never again be mistaken for each other.

**Watch days outstanding, not the rate.** Remittance rate is a lagging indicator that looks perfect right up to the moment it collapses, because unremitted stock is not yet a default. Days outstanding moves first.

### Decision 5: channel focus **LOCKED**

The founder is right that Decision 3 in the previous version assumed agents that do not exist. Revised for the actual team:

> **All four founders run B2B outreach. Named account ownership. No agent recruitment for 90 days. No feature work beyond the pricing changes in Decision 3.**

Concretely:

- **Henry** owns outreach and sales execution as his primary role, since it is already partly his. Business development, meaning which segments and terms to pursue, stays with Olorunshogo and Stephanie
- **Each of the four owns named accounts by name**, not a shared pipeline. Two customers today, target 10 to 15
- **Stephanie and Olorunshogo protect one day per week** for the pricing fix, the supplier register, and the weekly numbers, and spend the rest on outreach
- **Malik's design output redirects** from app and website surfaces to the sales artefacts: a one-page price list for restaurants, a delivery-terms sheet, a WhatsApp-ready product card set

The reasoning: the only proven channel is human outreach, the app is a fulfilment layer that already works, and three of four people building software while two customers exist is the imbalance both source documents identified. Agents are a scaling mechanism, and there is nothing to scale yet.

### Decision 6: the wallet **LOCKED**

**Park it as a promoted feature. Keep the code.**

The platform holds customer balances and permits withdrawals, which may attract regulatory treatment beyond ordinary merchant processing under CBN rules. B2B customers pay by transfer and do not need a wallet. There is no commercial reason to promote it and there is a real regulatory reason not to.

Get a Nigerian payments lawyer to answer one question before it becomes a headline feature: **what regulated activity is Debridgers itself performing when it holds a buyer balance?** The safer architecture is likely that a licensed partner holds the funds and Debridgers stays the commerce layer.

Cheap decision now. Expensive one later.

### Decision 7: the expansion trigger **LOCKED**

The trigger inherited from the strategy document, 1,000 monthly orders, was scaled for a ₦1,400 basket. At a ₦35,000 median package it would imply roughly ₦40m of monthly GMV, which is the wrong target and the wrong unit. **At this AOV, order count is a vanity metric.** Trigger on money and repeatability instead.

Founder-accepted. **These are the criteria. Expand to a second city only when Kaduna sustains all of the following for three consecutive months:**

| Criterion                           | Threshold                                                                      | Why this one                                                                   |
| ----------------------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------ |
| Monthly GMV                         | ₦3,000,000+                                                                    | Roughly 10 B2B orders at Example E size. Real, and reachable from 2 customers  |
| Contribution margin at median order | Positive, and above 5%                                                         | The solvency test                                                              |
| Monthly contribution profit         | Covers cash fixed costs, imputed warehouse rent, and an agreed founder stipend | **The real test.** Kaduna must pay for itself before it pays for anywhere else |
| Repeat rate                         | 60%+ of B2B accounts reordering within 45 days                                 | B2B repeat should be far higher than B2C. If it is not, the product is wrong   |
| Active repeat B2B accounts          | 12+                                                                            | Two customers is a relationship. Twelve is a market                            |
| Supplier depth                      | 3+ reliable suppliers per hero product, documented in the register             | Single-supplier dependence does not survive a second city                      |
| Agent remittance                    | Above 90%, over at least 8 weeks with real agents                              | Only applies once Loop 2 has started                                           |
| Management capacity                 | One person who can run Kaduna without a founder present                        | Otherwise expansion means abandoning the first market                          |

The third row matters most. Everything else can be gamed. A city that pays its own fixed costs cannot be.

**Two thresholds, deliberately separated.** An earlier version of this trigger
asked for full market salaries before expanding, which at a 5.7% contribution
rate implies roughly ₦18,400,000 of monthly GMV. That is the right target for
_profitability_ and the wrong one for _expansion_: waiting for it would hold the
company in one city long past the point where the model is proven.

| Threshold          | Meaning                                                 | Monthly GMV needed                                    |
| ------------------ | ------------------------------------------------------- | ----------------------------------------------------- |
| **Expansion gate** | Cash costs, imputed rent, and a founder stipend covered | ₦3,000,000                                            |
| **Profitability**  | Four market salaries covered as well                    | ₦9,300,000 to ₦18,400,000, depending on route density |

The second is the company's actual goal. The first is the point at which a
second city stops being a distraction. See "How the model actually makes money"
for the arithmetic behind both.

**Note on the agent rows.** Two of these criteria depend on an agent network that does not exist yet. They are not placeholders: they are the reason to recruit agents on a schedule that leaves eight weeks of remittance history before the trigger is assessed. Working backwards from the trigger is how the agent recruitment date gets set, rather than recruiting when it feels overdue.

### What still cannot be locked, and must not be pretended

These are measurements, not decisions. Any commitment built on top of them today is a guess wearing a suit.

| Unknown                                     | How to close it                                           | By when           |
| ------------------------------------------- | --------------------------------------------------------- | ----------------- |
| **True cost of goods per hero product**     | The supplier register: last three prices paid, with dates | **One morning**   |
| **Delivery cost per drop**                  | Log every transport payment, with package count and zone  | **30 days**       |
| **Loading and handling labour per package** | Same log                                                  | **30 days**       |
| **Monthly burn**                            | One month of every outgoing, including imputed rent       | **30 days**       |
| **Order channel mix**                       | Add `order_source`, backfill the existing 10 orders       | **This week**     |
| **AOV and GMV to date**                     | Query the 10 orders. This is a report, not a mystery      | **This week**     |
| **Replacement and spoilage rate**           | Log every replacement honoured                            | Ongoing           |
| **Warehouse capacity in packages**          | Count it once                                             | **One afternoon** |
| Real agent productivity and remittance      | Requires agents, which requires Decision 4                | After 90 days     |

Note how short the timescales are. **Nothing on this list needs capital, and only one item needs code.** Every worked example in this document becomes a fact rather than an estimate within 30 days of someone deciding to write things down.

## What "we have the business model" means

The business model is settled when all seven of these are true, written down, and dated:

- [x] **Primary segment named, others deferred.** B2B food businesses, institutions next, households and traders deferred
- [x] **Margin architecture chosen.** Procurement spread, goods at market reference price, fees at cost recovery
- [x] **Hero products locked.** Rice, beans, and oil. Everything else listed but unpromoted
- [x] **Pricing locked.** Cost-to-serve fee 3%, floor ₦500, cap ₦5,000; delivery base at the measured ₦4,000 with a taper and per-drop caps; ₦25,000 minimum order; individual quoting above 20 packages. **Shipped**, including the per-zone taper and ceiling, which live on the zone table rather than as one shared constant
- [x] **Agent commission and exposure locked.** Flat per package: ₦1,200 beans, ₦1,000 rice, ₦700 oil, ₦400 other. Order-first for new agents, consignment earned, exposure capped at 30% of cash
- [x] **Channel focus decided.** Founder-run B2B outreach, named account ownership, no agent recruitment for 90 days
- [x] **Expansion trigger written.** Keyed on Kaduna paying its own fixed costs, sustained three months

**All seven are decided. Debridgers has a business model.**

What remains is not decision-making, it is measurement and execution:

| Still open                         | Nature      | Effect if it moves                                                                                                             |
| ---------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------ |
| **True landed cost of goods**      | Measurement | Sets the real procurement spread. If it is 3% rather than 6%, the agent commission **level** must drop, though the basis stays |
| Inbound haulage per bag            | Measurement | Part of landed cost. Currently recorded nowhere                                                                                |
| Monthly burn, and therefore runway | Measurement | Cannot be inferred, only counted                                                                                               |
| Order admin minutes                | Measurement | Decides whether 3% holds, or moves                                                                                             |
| Founded date meaning, equity split | Fact        | Investor and governance hygiene                                                                                                |

**Every one of those is a counting exercise, not a judgement call.** The judgement calls are finished.

## The first 30 days, in order

| #   | Task                                                                                                          | Effort                  | What it unblocks                                                   |
| --- | ------------------------------------------------------------------------------------------------------------- | ----------------------- | ------------------------------------------------------------------ |
| 1   | **Write the supplier register.** Ten rows, including the last three prices paid per hero product              | One morning             | Cost of goods, and therefore every number in this document         |
| 2   | **Say whether the ₦4,000 trip was inbound or outbound.** Inbound belongs in landed cost, outbound in delivery | One sentence            | Whether the 6% procurement spread is thinner than assumed          |
| 3   | **Correct the catalogue units.** 100kg bags labelled 50kg, plus add millet                                    | An hour                 | Stops a customer dispute, and makes every report truthful          |
| 4   | **Add `order_source` and backfill the 10 orders**                                                             | One hour                | Channel mix. The data is unrecoverable later                       |
| 5   | **Pull real AOV and GMV** from the existing orders                                                            | A query                 | Your first honest traction slide                                   |
| 6   | **Ship the pricing change**, including the rename from `handling_fee`                                         | Half a day              | Stops the company selling below cost                               |
| 7   | **Fix the ₦1,300 and ₦1,400 hardcodes**                                                                       | An hour                 | Agent recruitment, which is blocked until this is right            |
| 8   | **Get two real quotes** for a small lock-up store, then book the warehouse figure                             | An afternoon            | An honest fixed-cost line and a recorded founder contribution      |
| 9   | **Start the transport log.** Every vehicle payment, with zone, package count, and vehicle type                | Ongoing                 | Real delivery cost, the second-largest assumption                  |
| 10  | **Start the order minute-log** for two weeks                                                                  | Ongoing                 | The true cost-to-serve, and whether 3% is right                    |
| 11  | **Get a NAFDAC compliance opinion** on the packager transition, before the first bag is opened                | Ongoing                 | Whether breaking bulk is weeks or quarters away, and what it costs |
| 12  | **Then, and only then, sell.** Ten to fifteen named B2B accounts, four owners, one weekly review              | The rest of the 90 days | Everything                                                         |

The order matters. Selling harder on a price list that loses money on small orders makes the problem bigger, not smaller. Items 1 through 10 total roughly two days of work spread across two people, and they convert this entire document from an argument into a set of facts. Item 11 is the only one with an external dependency, which is why it starts early rather than when it is needed.

## Glossary

Terms as Debridgers uses them. Several of these were confused with each other at some point in this document's history, and each confusion cost real analysis time. Where two terms are easy to mix up, the entry says so explicitly.

### Money in an order

**Items subtotal.** The value of the goods alone, before any fee. The base the cost-to-serve fee is calculated on.

**Package.** One unit as the supplier sealed it: a 50kg bag of rice, a 100kg bag of beans, a 25 litre keg of oil. **Not a weight.** Delivery is priced per package because what fills a vehicle is packages, and because a buyer can verify a package count by looking.

**Delivery fee.** What the buyer is charged to move the order. **Priced to recover the trip cost, not to profit.** Zone base covering two packages, then a taper for additional ones, with a per-drop cap.

**Cost-to-serve fee.** 3% of items subtotal, minimum ₦500, maximum ₦5,000. Covers the payment rail plus order admin, reconciliation, support, and the replacement provision. **Formerly called the "handling fee", which is why it was once ₦100.** It does not profit; it stops the cost of serving an order from eating the goods margin.

> **Do not confuse:** _delivery fee_ recovers the vehicle. _Cost-to-serve fee_ recovers everything else about serving the order. Both are cost recovery. Neither is profit.

**Order total.** Items subtotal + delivery fee + cost-to-serve fee. What the buyer pays.

### Margin

**Market reference price.** What the buyer would pay for the same goods at Central Market. Debridgers sells at this price. It is the promise, not a marketing device.

**Procurement spread.** The gap between the market reference price and what Debridgers actually pays a supplier. **This is the entire profit engine of the business.** Assumed at 6%, unmeasured.

**Landed cost of goods.** What a package actually costs Debridgers by the time it is in the warehouse: the supplier price **plus inbound haulage**, plus any handling to get it there. **Not the same as the supplier's price**, and using the supplier's price instead overstates the procurement spread.

> **Do not confuse:** _inbound haulage_ is supplier to warehouse and belongs in landed cost. _Delivery_ is warehouse to buyer and is recovered by the delivery fee. A trip costs the same in either direction, but they land in different lines and only one of them is charged to the customer.

**Gross margin.** Items subtotal minus landed cost of goods. Roughly ₦2,500 to ₦3,300 per hero package at a 6% spread.

**Contribution margin.** What is left after every variable cost of that specific order: landed goods, payment fees, delivery vehicle, loading, agent commission, replacements, discounts. **The number that says whether one more order helps or hurts.** Currently 5.0% to 6.6% across the worked examples.

**Break-even procurement spread.** The minimum discount to market price at which an order returns exactly zero. Under the locked pricing it is negative on every hero product except palm oil, which needs 0.19%. A negative figure means the order clears even at full market price. **The lower this is, the less the business depends on being an exceptional buyer.**

**Take rate.** Revenue captured as a share of GMV. For Debridgers this is the procurement spread plus fees, not a platform commission.

### Working capital

**Negative working capital cycle.** The customer pays before Debridgers pays the supplier, so the buyer finances the trade. **The current structure, and the most attractive structural fact about the business.**

**Credit float.** Cash permanently tied up serving customers who pay on terms rather than in advance. `monthly GMV on terms × (days of terms ÷ 30)`. **It revolves, it does not burn**, which is why it suits debt rather than equity.

**Buffer.** The ₦300,000 on hand. Not order-size capital under prepayment; it absorbs settlement gaps, up-front transport, and replacements.

**Equity.** Ownership of the company, as a percentage split between founders. Distinct from _funding_: equity is who owns the business, funding is what the business runs on. **Selling equity to cover a revolving credit float is the classic error here** - the float returns, so it suits debt, and only permanent costs justify giving away ownership permanently.

**Dwell time, or days of stock on hand.** How long a package sits in the warehouse before it is delivered. **The lever that controls warehouse cost per unit.** Rent is not the lever; throughput is.

### Agents

**Consignment.** Debridgers releases stock to an agent who sells it and remits afterwards. **At real prices this places ₦27,000 to ₦54,000 of company stock per package in a stranger's hands.**

**Order-first.** The alternative: the agent takes a paid order, then Debridgers releases the stock, then the agent delivers. **Zero exposure.** The policy for every new agent; consignment is earned.

**Remittance rate.** Stock value remitted ÷ stock value due. Target above 95%. **A revenue collection measure. High is good.**

**Commission rate.** What Debridgers pays an agent per package sold. **A cost. Expressed in naira per package, never as a percentage.**

> **Do not confuse:** these two are the origin of the "agent remittance rate: 5%" alarm that survived into three separate company documents. One is money coming in, the other is money going out. **Keeping commission as a naira figure rather than a percentage makes the mistake impossible to repeat.**

**Outstanding stock value.** Stock issued and not yet remitted, at a point in time. The live exposure. Capped at 30% of cash on hand.

**Days outstanding.** Mean age of unremitted stock value. **The early warning.** It moves before the remittance rate does, because unremitted stock is not yet a default.

**Agent activation rate.** Agents with a completed order this period ÷ registered agents. **Twenty inactive agents are worse than five productive ones**, which is why agent count is not a target.

### Trading position

**Distributor.** Sells packages exactly as received, supplier's seal intact. **What Debridgers is today.** Packaging cost is zero, NAFDAC exposure is a distributor's, and the unopened seal is evidence that keeps the replacement guarantee cheap.

**Packager.** Opens the supplier's package and re-portions the contents into units of its own. **What Debridgers intends to become.** Adds sacks, scale, fill labour, labels, and grain shrinkage as costs, moves the NAFDAC obligation, and transfers quality risk from the supplier to Debridgers.

**Hero product.** A deliberately short list carrying the commercial focus: **rice, beans, and oil.** Everything else stays listed and orderable but unstocked ahead of demand and absent from the sales sheet.

### Demand

**Order source.** Who raised an order: `self_serve`, `assisted`, `agent`. **Shipped**, on `orders.order_source`, and backfilled. Deliberately coarse: it records who _created_ the order, which is the distinction that changes attribution and audit. The finer channel breakdown once planned here - app, WhatsApp, phone, outreach - is a separate field and still worth adding, because that data is unrecoverable later.

**Platform-independent order rate.** Share of a buyer's orders placed through the app without being called. **Whether the customer belongs to Debridgers or to their agent.**

**Agent-churn survival rate.** Buyers who ordered again after their agent left ÷ buyers whose agent left. Below 30% means agents own the customers.

**GMV.** Total value of goods sold, before costs, fees, refunds, or discounts. **Not revenue.**

**AOV.** GMV ÷ number of orders. At a ₦35,000 median package, **order count is a vanity metric and AOV is where the business actually moves.**

**Repeat rate.** Customers who purchased more than once ÷ total customers. For B2B this should be far higher than for B2C; if it is not, the product is wrong.

**Minimum order.** ₦25,000 or 2 packages for delivery. **A solvency rule, not a policy preference:** below it, no fee structure covers the trip.
