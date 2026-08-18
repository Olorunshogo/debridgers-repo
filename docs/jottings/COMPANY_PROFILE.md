# Debridgers Company Profile

A single reference for what the company is, how it works, and where it is going. Compiled from `docs/jottings/ONBOARDING.md`, `docs/jottings/KPI.md`, `docs/jottings/CTO-KPI-SUMMARY.md`, `debridgers_features_docs/`, the landing site copy, and the database schema and pricing code.

**How to read this document.** Anything marked `TODO:` is a best-effort inference, a placeholder, or an open question, and is there to be corrected rather than trusted. Grep for `TODO:` to find every one of them in a single pass. Where a figure was inferred rather than supplied, the reasoning is stated next to it so you can see what to overwrite and why the guess landed where it did.

Two rules were applied throughout. Numbers you gave are recorded exactly as given, even where they look surprising, with the surprise flagged rather than silently smoothed over. Numbers nobody gave are marked as inferences, never presented as fact, because a plan built on an invented traction figure is worse than one built on a blank.

Last compiled: 2026-08-18

---

## COMPANY

- **Name:** Debridgers LTD
- **Location:** Kaduna, Nigeria. Operating in Kaduna metropolis, currently focused on Kaduna South
- **Stage:** Pre-launch / early beta. Single city. Consignment model partly automated
- **Founded:** 2025. `TODO:` exact month, and whether this dates from incorporation, from the first line of code, or from the first sale. Those are usually three different dates and investors will ask which one this is
- **Founders:** **Nwankwo Stephanie**, **BAMTEFA Olorunshogo Moses**
- **Current team:** Small. A solo or near-solo engineering team is the stated baseline in `KPI.md`, plus admin and field operations staff. Exact headcount are as follows:
  - **Nwankwo Stephanie**,
  - **BAMTEFA Olorunshogo Moses**,
  - **Ajadi Abdulmalik olayinka**,
  - **Okpere Henry**
- **Current capital:** approximately ₦200,000. `TODO:` confirm whether this is cash on hand today, total founder money put in since 2025, or a working-capital float that recycles through stock. Those read very differently to anyone assessing the business
- **Current runway:** `TODO:` inferred, correct this. Runway is how many months the company can keep operating before the money runs out, calculated as cash on hand divided by net monthly burn, where burn is everything going out (hosting, transport, stipends, data, packaging) minus anything reliably coming in. At ₦200,000 with no salaried headcount and a consignment model that avoids buying inventory outright, the burn is probably small and mostly infrastructure and transport, so this is plausibly several months rather than several weeks. That is a guess: the monthly burn figure has never been written down anywhere in this repo, and without it the runway number is unknowable. **Write down one month of actual outgoings and this fills itself in.**
- **Current legal structure:** `TODO:` is Debridgers registered, and if so as what (business name, limited company), and does it have a CAC number and a corporate bank account? A core team member agreement template exists at `docs/repo/DEBRIDGERS_Core_Team_Member_Agreement_Template.pdf`. `TODO:` confirm whether that template has actually been signed by the four people listed above, since an unsigned template and an executed agreement are very different things when equity or IP is in question

---

## VISION

A Nigeria where every family and business pays the true price of food, with no exploitation, no information gap, and no middlemen tax.

Debridgers envisions a future where the agricultural value chain in Nigeria is transparent, efficient, and fair. A country where farmers earn what their produce is worth, and consumers pay only what it actually costs to get food from farm to table.

---

## MISSION

To eliminate exploitative middlemen from Nigeria's food supply chain by connecting farmers directly to consumers and wholesalers through technology, trusted agents, and transparent pricing.

In practice:

- Source directly from farmers at fair prices
- Use a network of verified field agents to bridge the last mile
- Deliver to homes and shops at the same price the buyer would pay at the market, with no markup and no hidden fees
- Start in Kaduna, scale across Nigeria

---

## WHY WE EXIST

The gap between what a farmer is paid and what a household pays is captured by intermediaries who add cost without adding value. That gap is sustained by an information asymmetry: neither end of the chain knows the real price. Debridgers exists to close that gap and make the true price visible and available to both sides.

Public-facing expression of this: **"Market Prices. Zero Market Stress."**

---

## THE PROBLEM

**For farmers:** No direct access to end markets. They sell to whoever shows up at the farm gate, at whatever price is offered, with no visibility into what the produce fetches downstream. No reliable bulk off-take, no advance payment, no demand signal to plan against.

**For households:** Market prices are opaque and change without explanation. Going to Central Market costs time and transport, and the price paid depends on the buyer's ability to haggle. Buying closer to home means paying a retail markup for the same goods.

**For businesses:** Restaurants, caterers, and market traders need consistent volume at predictable prices. Today that means renegotiating constantly, absorbing price volatility, and having no supply guarantee.

**For the agricultural ecosystem:** Value is extracted between farm and table rather than created. There is no public reference price, so no one can tell an exploitative price from a fair one. Rural producers stay poor while urban consumers overpay, and neither has the data to challenge it.

---

## THE DEBRIDGERS THESIS

Our belief is that the middleman layer in Nigerian food distribution is not a service, it is a tax collected on an information gap. Remove the gap and you remove the tax.

We believe this can be done without owning the whole chain. A trusted, verified, well-compensated field agent network delivers the last mile at lower cost than logistics infrastructure, and a consignment model gets stock to market without carrying inventory risk. Technology makes the pricing transparent and the money traceable, which is what makes the whole thing trustworthy enough to scale.

We also believe that whoever publishes the reference price for food in a region ends up owning the standard. That is the long-term position we are building toward.

---

## HOW THE BUSINESS WORKS

1. **Farmer.** Debridgers sources agricultural products directly from smallholder farmers and suppliers into warehouse inventory. Bulk off-take at fair prices, no farmer-facing software yet
2. **Agent.** Field agents apply, are approved by admin, complete KYC, and submit bank details. They request stock packs on consignment, sell locally to households, shops, and caterers, and remit proceeds
3. **Buyer.** Buys through an agent or directly on the platform. Households order online, by WhatsApp, or by phone. Businesses order in volume, often prospected in person by an agent
4. **Logistics.** Stock is dispatched from warehouse to agent, then agent or Debridgers delivers to the buyer. Delivery is organised into named zones with per-zone fees. A rider entity exists in the schema for future assignment
5. **Payment.** Paystack throughout. Buyers pay by card, by wallet balance, or by bank transfer into a dedicated virtual account issued in their own name. All money is tracked in integer kobo
6. **Fulfilment.** Order moves pending, then confirmed on payment, then out for delivery, then delivered. Agents remit stock proceeds, commissions accrue as pending, are confirmed, and are paid out on a weekly cycle

---

## FARMER VALUE PROPOSITION

Direct market access without an intermediary taking the spread. Fair, transparent pricing. Consistent bulk off-take through the warehouse model rather than one-off farm gate sales. Inclusion of rural LGAs that aggregators overlook.

Not yet built: farmer-facing software, advance payments, demand forecasting, automated supplier receipts. These are named as future extensions.

---

## BUYER VALUE PROPOSITION

- **Fixed, fair prices.** Set weekly against real market rates. No haggling, no guessing what rice costs today
- **Market price at your door.** The same price as Central Market, without the trip
- **Quality guaranteed.** Unsatisfactory orders are replaced, no questions asked
- **Order however you want.** WhatsApp, phone call, or web app. No download required to start
- **No hidden fees.** Delivery and handling are stated up front and calculated the same way at quote and at checkout

---

## AGENT VALUE PROPOSITION

- Flexible hours, work when it suits you
- Weekly payouts direct to a bank account
- Free training, no prior experience needed
- Serve your own neighbourhood, no long-distance travel
- Work under a brand buyers already trust
- A growth path: top agents get priority orders and higher targets, can recruit for override earnings, and can be promoted to state manager
- Stock supplied on consignment, so the agent does not need capital to start

---

## B2C MODEL

Households in Kaduna order online, by WhatsApp, or by phone for home delivery. Retention is built on a wallet, favourites, a "buy again" list ranked by order frequency, one-tap repeat of the last order, a cart that syncs across devices, order notifications, and a personal spending dashboard.

---

## B2B MODEL

Shops, restaurants, caterers, market traders, and institutional buyers order in volume at negotiated rates. Acquisition is field-led: agents visit premises and log the shop name, owner, phone, LGA, area, address, product interest, estimated quantity, and notes. That record set is a field CRM and the basis for batch follow-up.

The public interest form promises an agent will make contact within 24 hours, offering market-price sourcing with no markup, bulk and regular-order discounts, and delivery to home or shop.

---

## SUPPLY MODEL

Consignment. Debridgers sources from farmers and suppliers into warehouse inventory, then releases stock packs to approved agents who remit after selling. Low capital expenditure and no inventory risk carried by the agent, which is what allows the network to grow without financing each agent.

Stock requests are tracked from pending to fulfilled, with an amount to remit and an amount remitted recorded per request.

---

## DEMAND MODEL

Four channels:

1. **Field agents** selling door to door and shop to shop
2. **Agent referral links**, where a buyer signs up attributed to an agent
3. **Direct platform orders** from the web app
4. **Inbound**, via the website contact form, the register-interest form, WhatsApp, and phone

Email campaign tooling exists and can target buyers, agents, or everyone. Batch SMS and email reminders to outreach contacts are specified in the outreach system.

---

## LOGISTICS MODEL

Warehouse to agent to buyer, organised by delivery zone. Each zone carries its own base delivery fee, a list of the areas it covers, an active flag, and an optional standing free-delivery policy used for zones near the depot or zones where we are pushing to win share.

Delivery is priced **per package, not per kilogram**, because what fills a vehicle is packages: a 50kg bag and a 25 litre keg each occupy one slot. It is also a figure a buyer can verify at a glance.

A rider entity exists in the schema for future dispatch assignment. Cold chain is a 10-year item.

---

## PAYMENT MODEL

Paystack end to end, all amounts in integer kobo.

- **Card checkout** for one-off orders, confirmed by webhook
- **Wallet**, funded by card or by bank transfer into a dedicated virtual account issued per buyer
- **Wallet payment** for orders, debited at checkout
- **Buyer withdrawals** back to a nominated, name-resolved bank account
- **Agent payouts** on a weekly cycle, moving commissions from pending to confirmed to paid

Every transaction is intended to be reconciled and auditable against internal records. That is treated as a baseline trust requirement, not a feature.

---

## PRICING MODEL

- Produce is sold at market reference price with **no markup on the goods**
- Prices are set weekly to track real market rates
- **Handling fee:** flat ₦100 per order
- **Delivery fee:** zone base fee, with one package included, then **₦500 per additional package**
- **Free delivery** applies either as a standing per-zone policy or as a global time-boxed promotion. The full price is still calculated during a promotion so it can be shown struck through next to FREE
- Reference buyer price in the current configuration: **₦1,400 per unit**

Revenue therefore comes from delivery, handling, and volume rather than from marking up produce.

---

## COMMISSION MODEL

Four commission types exist in the system:

| Type                     | Basis                                                           |
| ------------------------ | --------------------------------------------------------------- |
| `direct`                 | The agent's own field or referral sale                          |
| `buyer_referral`         | ₦20 per order from a buyer they referred, on every future order |
| `agent_override`         | 5% of the monthly earnings of an agent they recruited           |
| `state_manager_override` | 2% from agents under a state they manage                        |

Lifecycle: pending, then confirmed, then paid. Weekly payout cadence.

**The agent commission rate is 5%.** It is held as a percentage in the `agent_commission_rate` system setting, with `AGENT_COMMISSION_RATE` as the env fallback, and an admin can change it without a deploy. The setting is the source of truth. Every document and worked example across the repo now states the same figure. Note that the stock model is a separate mechanism: the schema prices packs at ₦1,300 to remit against a ₦1,400 buyer price, which is ₦100 per unit, or roughly 7%, so the two do not yet describe the same margin.

Override depth: single level only today. The recruiter earns on their direct recruit. Payout to depth 2 is not built.

---

## REFERRAL MODEL

- **Agent refers a buyer:** the agent earns ₦20 on every order that buyer places, indefinitely. The buyer's attribution is stored permanently on the user record
- **Buyer referral discount:** ₦500 flat by default, configurable to a percentage instead
- **Agent recruits an agent:** 5% override on the recruit's monthly earnings

Status: the ₦20 buyer referral commission is present in the schema but was recorded as not yet wired up. Verify current state before relying on it.

---

## UNIT ECONOMICS

What is configured today:

| Line                            | Value                   |
| ------------------------------- | ----------------------- |
| Buyer unit price                | ₦1,400                  |
| Agent remit price per pack      | ₦1,300                  |
| Gross spread per unit           | ₦100                    |
| Handling fee per order          | ₦100                    |
| Delivery, first package         | Zone base fee           |
| Delivery, each extra package    | ₦500                    |
| Buyer referral discount         | ₦500 flat, configurable |
| Agent buyer-referral commission | ₦20 per order           |

`TODO:` the figures above are what the code charges. What is missing is what any of it actually costs:

- True cost of goods at the farm gate, per pack
- Gross margin per unit, once that cost is known
- Delivery cost per drop, against the fee actually charged. The fee is currently a zone base plus ₦500 per extra package, and nobody has checked whether that covers the transport
- Warehouse and storage cost per month
- Agent acquisition cost, and buyer acquisition cost split by channel
- Contribution margin per order, which is the number that says whether growth helps or hurts
- Whether "no markup" is literal accounting or a positioning line

**Inferred, correct it:** the visible spread is ₦100 per pack on a ₦1,400 sale, plus a ₦100 handling fee, so roughly ₦200 gross per pack before any delivery or storage cost is deducted. On a 10-pack order that is about ₦2,000 gross against a delivery leg that may well cost more than the zone fee collected. If that holds, small orders lose money and the business only works on order size. **This is the single most important unknown in this document.** Every growth decision depends on it, and right now it cannot be answered.

---

## CURRENT GEOGRAPHY

Kaduna metropolis, focused on Kaduna South. Named coverage areas include Sarbon Tasha, Narayi, and Kakuri, organised into delivery zones.

---

## WHY WE CHOSE THIS GEOGRAPHY

Not documented explicitly. What the docs support: Kaduna is the declared phase-one market and the base from which Northern Nigeria expansion is planned, with Kano, Abuja, Zaria, Jos, and Sokoto named as the next targets. Agents are described as Kaduna-focused initially and serving their own neighbourhoods, which implies a deliberate density-first strategy over geographic spread.

`TODO:` full rationale. Likely candidates, to confirm or discard: it is where the founders are based and already have relationships, it is close to producing farmland, and it is large enough to matter while being underserved by the national delivery platforms that concentrate on Lagos and Abuja. Being first in a city nobody is fighting over is a real advantage and worth stating explicitly if true.

---

## CURRENT PRODUCTS

Grains and staples, beans, tubers, proteins, and oils. Rice, beans, and palm oil are the headline items in public copy. Products carry a name, unit, price in kobo, description, image, active flag, and sort order, and sit under categories.

Noted content gap: real product photography for every catalog variety is an outstanding blocker.

---

## CURRENT TECHNOLOGY

pnpm and Nx monorepo.

- **Backend:** NestJS 11, Drizzle ORM over PostgreSQL, Zod validation, JWT auth with role guards, Swagger documented
- **Frontend:** React Router 7 with SSR, Tailwind CSS 4, framer-motion, Recharts
- **Shared packages:** API client, web UI, app UI, theme tokens, utilities
- **Integrations:** Paystack for payments, payouts, wallets, and dedicated virtual accounts; Cloudinary for images; Mailtrap for transactional email and campaigns; Redis
- **Roles:** admin, agent, buyer, company

No mobile codebase exists. Mobile is a 5-year item.

---

## CURRENT OPERATIONAL CAPABILITIES

Built and working:

- Buyer registration, catalog browsing, cart with cross-device sync, favourites, buy-again
- Card checkout with server-side re-pricing, so client-supplied prices are ignored
- Wallet funding and paying for an order from wallet balance
- Agent application, admin approval, KYC review, bank details, stock requests, sales reports, commission tracking, payout requests
- Admin dashboards for orders, agents, KYC, products, categories, commissions, payouts
- Outreach record capture and coverage analytics
- Email campaigns targeting buyers, agents, or all
- In-app notifications

In progress or unverified at time of writing:

- Buyer withdrawals, including the missing withdrawal interface
- Order lifecycle past confirmed, meaning out for delivery and delivered
- Dedicated virtual account issuance at signup
- Automated weekly payout cron
- The auth flow after its refactor to hooks

---

## CURRENT TRACTION

As supplied, 2026-08-18:

| Metric                        | Value                                                                                                                |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Orders placed                 | 10                                                                                                                   |
| Agent remittance rate         | 5%                                                                                                                   |
| Farmers / suppliers onboarded | `TODO:`                                                                                                              |
| Buyers registered             | `TODO:`                                                                                                              |
| Active buyers                 | `TODO:`                                                                                                              |
| Revenue                       | `TODO:`                                                                                                              |
| GMV                           | `TODO:` inferable once average order value is known                                                                  |
| Repeat customer rate          | `TODO:` with 10 orders this may be 0, which is normal this early and not a bad sign                                  |
| Average order value           | `TODO:`                                                                                                              |
| Active verified agents        | `TODO:`                                                                                                              |
| Outreach records collected    | `TODO:` the prospect list exists in the outreach system, so this is a count somebody can pull rather than an unknown |

**`TODO:` the remittance rate needs a second look, because as written it is alarming.** Remittance rate normally means the share of stock value agents actually hand back after selling on consignment, and the target on record is above 90%. A literal 5% would mean agents are keeping almost everything they sell, which is an existential problem rather than a metric. Two likelier readings: it was confused with the 5% agent commission rate, which was set today and is a different number entirely, or it means 5% of stock value is currently outstanding, which would actually be a 95% remittance rate and good news. Please correct this line, since a real 5% changes what the company should do next week.

**Context for the 10 orders.** The near-term target on record is a first 50 direct-to-buyer platform orders, and 10 to 20 active verified agents in Kaduna within six months remitting above 90% of stock value. So orders are at roughly a fifth of the first milestone.

`TODO:` confirm whether those 10 orders came through the platform checkout or were taken manually and recorded afterwards. It matters a lot: 10 orders through the real funnel proves the software works commercially, while 10 orders taken by phone proves demand but says nothing about the product.

---

## CURRENT PIPELINE

- **Farmers:** `TODO:` how many suppliers are talking to you but not yet supplying
- **Buyers:** Outreach records exist as a prospect list of shops visited, with product interest and estimated quantity. `TODO:` count. This is a query against the outreach table, not a guess
- **Partners:** `TODO:`
- **Agents:** `TODO:` how many have applied but not yet cleared KYC. This number sets the ceiling on how fast the network can grow next month

---

## CURRENT PARTNERSHIPS

None recorded. `TODO:` confirm none exist, rather than none being written down. Informal arrangements with a market association, a transport owner, or a cooperative would all count and are easy to forget to record.

---

## PARTNERS WE WANT

Named as targets in the growth plan:

- Farmer cooperatives
- State agricultural boards
- Logistics and transport providers, toward route optimisation on reliable volumes
- Payments, already Paystack, with buy-now-pay-later for bulk buyers named as a future need

Implied by the 10-year plan: cold chain operators, government and NGO food security programmes, FAO and World Bank as recognition bodies, and financial services partners for farmer micro-loans, crop insurance, and agent savings products.

---

## COMPETITORS / ALTERNATIVES

`TODO:` not documented. Worth naming even roughly, because "we have no competitors" is never true and reads as inattention. Candidates to assess: open-air markets and the existing middleman chain, which are the real incumbents; general-purpose delivery and errand services operating in Kaduna; national grocery and foodstuff platforms if any deliver this far north; and neighbourhood shops with informal delivery by phone.

---

## WHAT CUSTOMERS CURRENTLY DO INSTEAD

Households travel to Central Market and haggle, or buy locally at a retail markup. Businesses negotiate directly with traders and absorb price volatility. Farmers sell at the farm gate to whoever arrives.

---

## WHAT WE BELIEVE WE CAN DO BETTER

- Publish a fixed, weekly, transparent price instead of a negotiated one
- Deliver at market price so the buyer's trip and markup both disappear
- Guarantee quality with a no-questions replacement, which traders do not offer
- Pay agents reliably and on time, which makes the distribution layer durable
- Make the money traceable end to end, which is what earns trust from buyers, agents, and eventually farmers and investors

---

## CURRENT BOTTLENECKS

Updated 2026-08-18 after a fix pass. Items marked resolved are fixed in code but not yet released.

- Real product photography missing for the catalog
- Engineering capacity is solo or near-solo, so feature work and reliability work compete directly
- Thin automated test coverage, especially over payment and wallet paths. Improving: the e2e suite now runs against an isolated, migrated, truncated database, so runs are reproducible
- Live payment behaviour is still unverified against Paystack. Card checkout, withdrawals, and virtual account issuance have never completed a real gateway round trip
- The direct commission rate is 5%, held in the `agent_commission_rate` system setting, against roughly 7% implied by the ₦1,300 to ₦1,400 stock spread. The two mechanisms still describe different margins

Recently resolved:

- Payout automation: a weekly cron already runs, Fridays 10:00 UTC. The KPI note describing it as manual-trigger only predates the implementation
- Buyer withdrawals: the wallet was never debited and the transfer amount was sent 100x too small. Both fixed, with the failed-transfer webhook now refunding
- Order delivery tracking: nothing moved an order past confirmed, which pinned lifetime spend and the spending chart at zero for every buyer. Admin and agent transition endpoints now exist
- Virtual account issuance: was calling an asynchronous Paystack endpoint that returns no account data, so no buyer ever received one. Now uses the synchronous endpoint
- Agent bank lookup: returned 503 unless a simulation flag was on, so agents could not add bank details and therefore could not be paid. Now uses the live Paystack bank list
- Migration journal: two migrations were on disk but never journaled, so a fresh database was missing the wallet columns entirely

---

## CURRENT RISKS

Recorded in the agent network documentation and KPI notes:

- Agent default on remittance
- Agent account compromise leading to stolen commission balance
- Webhook replay causing double commission or double payout
- Bulk commission adjustment creating data inconsistency
- Plaintext credentials committed to the repository
- No verified-restorable backup discipline yet
- No on-call rotation or redundancy, so a formal uptime SLA cannot be honoured
- **Single-city concentration.** Every order, agent, and naira of revenue comes from one city. There is no second market to fall back on, so anything that shuts Kaduna down shuts the whole company down for the duration: civil unrest or a curfew, a fuel scarcity that makes delivery uneconomic, a flood or a bad rainy season closing roads, a market association dispute, or a single large competitor moving in locally. Concentration is the correct choice this early, because focus is how a small team wins a market at all, so this is a risk to be aware of rather than a mistake to fix now. It stops being acceptable at the point where the business has enough revenue to lose. `TODO:` decide what triggers the second city, whether that is an order volume, a monthly revenue figure, or a date
- The 5% commission rate has not been tested against real agent unit economics. The stock model implies roughly 7% on the ₦1,300 to ₦1,400 spread, so the two mechanisms still describe different margins

---

## WHAT HAS ALREADY BEEN TESTED

There are two separate questions here and only one of them has an answer today.

### Tested technically, with evidence

All of this was verified against a running system, not reviewed on paper:

- **The full buyer money path.** 75 end-to-end tests across 11 suites, all passing, run against an isolated database that is created, migrated, truncated and seeded from scratch on every run, so a green result means the same thing twice
- **Deposit idempotency.** Confirming the same deposit reference twice, by both the webhook and the confirm endpoint, moves the balance exactly once. This is the test that matters most, because the failure mode is free money
- **Webhook authenticity.** A forged or missing signature is rejected, a correctly computed HMAC is accepted
- **Wallet order payment.** The balance debits by exactly the order total, the order becomes paid and confirmed, a second payment attempt on the same order is refused, and insufficient balance is refused without moving the balance
- **Order lifecycle.** The legal path from pending to delivered works, `delivered_at` is stamped, illegal transitions are refused, and an unpaid order cannot be marked out for delivery
- **Cross-account safety.** One buyer cannot confirm another buyer's deposit reference, nor read or pay another buyer's order
- **The auth flow end to end, against a live server.** Registration, email verification by OTP, login with the correct role claim in the JWT, forgot and reset password, and the old password being properly rejected afterwards
- **Checkout.** Confirmed working. It re-prices server-side and refuses a client-supplied total

Every money figure in those tests is asserted in exact kobo. A test that only checked a status code would prove very little here.

### Tested commercially

`TODO:` this is the half that is missing, and it is the half the business actually turns on. The meeting note in `JOTTINGS.md` asks exactly this and appears never to have been answered in writing:

> What we did that worked, what we did that did not work and how to improve our sales?

Questions worth answering while the answers are still fresh, given 10 orders have now been placed: which channel produced them, what the shops said no to and why, whether anyone ordered a second time, what the delivery actually cost against what was charged, and whether agents found the remittance terms fair enough to keep going.

---

## WHAT WORKED

**Technically, and proven:**

- The consignment model is fully represented in software: stock requests, agent wallets, commission records, and a weekly automated payout run
- Server-side re-pricing. The client cannot dictate a total, which closes the most obvious way to get robbed
- Putting the overdraw check inside the database update rather than reading the balance first, then writing it back. This is now the single implementation for buyer wallets and it makes double-spend structurally impossible rather than unlikely
- The isolated test database. Two identical back-to-back runs are what proved the isolation is real

**Commercially:** `TODO:` 10 orders happened, so something worked. Write down what it was, because it is the thing to do more of.

---

## WHAT FAILED

**Technically, all found and fixed, and worth recording because the pattern matters more than the individual bugs:**

- Buyer withdrawals never debited the wallet, and sent Paystack an amount 100 times too small
- Virtual account issuance called an asynchronous Paystack endpoint that returns no account data, so no buyer ever actually received an account
- Agent bank lookup returned 503 unless a simulation flag was on, so agents could not add bank details and therefore could not be paid at all. This was silently blocking every payout
- Two migrations existed on disk but were never journaled, so any fresh database was missing the wallet columns entirely
- Nothing could move an order past confirmed, which pinned lifetime spend and the spending chart at zero for every buyer
- The commission rate was stored as a percentage but read as a fraction on one path, which would have paid 100 times the intended commission on a fresh install
- A refund credited one naira for every hundred owed, in a code path that turned out never to have been wired to a route at all
- Agent wallet balances were read, adjusted in memory, then written back, so two concurrent withdrawals could pay twice and debit once

**The pattern:** every one of these is a money bug, none of them threw an error, and all of them would have looked fine on a dashboard. Several had been present for a long time. This is the argument for the test suite existing at all.

**Commercially:** `TODO:` what was tried that did not sell. Shops approached that said no, a price point that got refused, a product nobody wanted, an agent who quit. These are the most useful entries in this whole document and the easiest to forget.

---

## WHAT WE LEARNED

`TODO:` this section is deliberately left for you, because it is the one part of this document that cannot be inferred from a repository. It is the difference between what happened and what it means.

Prompts, to be deleted once replaced with the real thing:

- What surprised you most in the first 10 orders?
- What did you assume about buyers that turned out to be wrong?
- What do agents actually care about, as opposed to what the commission model assumes they care about?
- If you had to start Debridgers again next month, what would you not repeat?
- What is the one thing that, if it stays true, makes this work?

---

## CAPITAL CONSTRAINTS

Capital on hand is approximately ₦200,000.

What that figure implies, inferred and open to correction:

- **It buys focus, not scale.** At roughly ₦1,300 per pack remitted, ₦200,000 is on the order of 150 packs if it were all spent on stock at once. It is a pilot budget, and the consignment model is the correct response to it, because stock sits with agents rather than being bought outright
- **The consignment model was almost certainly chosen for this reason.** It is low capital expenditure and pushes inventory risk off the balance sheet. That is consistent with operating under real constraint rather than by preference
- **The binding constraint is probably not stock, it is float.** If an agent is slow to remit, that money is unavailable for the next cycle. With a small base, one or two defaults could stall operations entirely, which is what makes the remittance rate above the most important number in this document
- **Cash cannot absorb a mistake.** There is no margin for a failed batch, a spoiled delivery, or a Paystack settlement delay

`TODO:` confirm:

- Is ₦200,000 cash on hand today, or cumulative founder investment since 2025?
- What is the actual monthly outgoing? Hosting, domain, transport, data, packaging, any stipends. One month of real numbers unlocks the runway figure above
- Is a raise planned, or is this bootstrapped to profitability?
- Is any of it borrowed, and if so on what terms?
- What is the minimum cash level at which operations would have to pause?

---

## TEAM CONSTRAINTS

Four people, listed in the COMPANY section, none recorded as full-time salaried.

- Engineering is solo or near-solo, which is the stated planning baseline in `KPI.md`. One to two shipped features per week is the realistic cadence
- There is no on-call rotation, which is why a formal uptime SLA cannot honestly be offered yet
- Feature work and reliability work compete for the same person, so every week is a direct trade between the two

`TODO:` confirm:

- Who does what? The four names are recorded but not their roles. An investor, a new hire, and a court would all want this written down
- Is anyone full-time, or is everyone splitting attention with a job or studies?
- Is anyone paid, and if so how much, since that feeds the burn figure and therefore the runway
- Who handles field operations, agent onboarding, and KYC approval day to day?
- What happens operationally if the one engineer is unavailable for two weeks? Right now the honest answer is probably that everything stops
- Have the four signed the core team agreement at `docs/repo/DEBRIDGERS_Core_Team_Member_Agreement_Template.pdf`, and is equity split agreed and documented?

---

## OPERATIONAL CONSTRAINTS

- Agent onboarding is manual and KYC-gated, which caps network growth rate
- Stock fulfilment and payout still need admin intervention
- Delivery capacity is tied to agent availability and has no owned fleet
- Single warehouse, single city
- No cold chain, which constrains the product range to non-perishables

`TODO:` how many deliveries can actually be completed in a day at current agent availability? That number is the real ceiling on order volume, and nothing in this repo records it.

---

## REGULATORY CONSTRAINTS

`TODO:` none of this is confirmed. Areas to check, roughly in order of how much trouble they cause if ignored:

1. **Holding buyer wallet balances.** This is the one that deserves specific attention. Taking customer money and holding it as a balance can attract regulatory treatment well beyond ordinary merchant payment processing, potentially touching CBN licensing. The platform already holds balances today. Worth a conversation with someone who knows Nigerian payments law before this scales
2. **NAFDAC obligations** for repackaged foodstuff, which is exactly what the pack model is
3. **Food handling and safety licensing** for storage and repackaging
4. **Business registration and tax status**, which overlaps with the legal structure question in the COMPANY section
5. **NDPR data protection.** The platform holds personal data and KYC documents including bank details, so obligations already apply regardless of stage

---

## FOUNDER STRENGTHS

`TODO:` this needs to come from you, but two things are visible from the repository and worth keeping if accurate:

- Technical depth sufficient to build and operate the entire platform in-house, which for a logistics business is a structural cost advantage rather than a convenience
- A willingness to look for problems rather than away from them. The money-path audit that found eight silent bugs was commissioned deliberately, before launch rather than after an incident

Worth adding: local knowledge of Kaduna and its markets, existing relationships with farmers, agents or shops, and any prior experience in agriculture, logistics, or sales.

---

## FOUNDER WEAKNESSES

`TODO:` this needs to come from you. Stated honestly it is one of the more useful sections in a company profile, and stated dishonestly it is the least.

Visible from the repository, offered as a starting point rather than a verdict:

- Commercial validation lags technical build significantly. The software is considerably further along than the evidence that people will buy through it. 10 orders against a platform this complete suggests effort has gone into building more than selling
- No written record of customer learning. The same question in `JOTTINGS.md` has gone unanswered long enough to survive into this document
- Unit economics were never established. The business has been built without knowing whether an individual order makes or loses money

Worth adding candidly: whichever of sales, fundraising, hiring, operations, or finance is genuinely least comfortable.

---

## 12-MONTH OBJECTIVES

Assembled from the current KPI scorecard and phase-one targets:

1. Buyers can complete a purchase end to end, every time, with zero checkout-blocking incidents
2. 10 to 20 active verified field agents in Kaduna, remitting more than 90% of stock value within the agreed window
3. First 50 direct-to-buyer platform orders that are not agent-mediated
4. Automated weekly commission payouts running unattended, with zero missed or late cycles
5. Every naira through Paystack reconciled and auditable
6. Zero P0 production incidents per month
7. Engineering shipping one to two completed features per week on a published cadence
8. Monthly verified-restorable database backup and no secrets in the codebase
9. Order fulfilment time baseline established and tracked

---

## 3-YEAR VISION

Not stated as a distinct horizon in the source documents, which jump from the current phase to 2031. Reasonable interpolation toward the 5-year target, to be confirmed:

- Beyond Kaduna into two or three more Northern cities
- Agent network in the high tens, with the state manager tier actually operating
- The wholesale arm live, with businesses ordering in bulk at negotiated rates
- Mobile app shipped
- First formal cooperative or state agricultural board partnership signed

`TODO:` confirm or replace. This is interpolation, not a plan you stated.

---

## LONG-TERM VISION

**By 2031, five years.** The dominant farm-to-door platform across Northern Nigeria:

- At least 10 major cities: Kaduna, Kano, Abuja, Zaria, Jos, Sokoto and others
- 200+ verified field agents earning sustainable commissions
- Partnerships with farmer cooperatives and state agricultural boards
- A mobile app with 100,000+ active users
- A wholesale arm serving small businesses, restaurants, and market traders
- Transparent weekly pricing published publicly, becoming the regional reference for fair market rates
- Buy-now-pay-later for bulk buyers

**By 2036, ten years.** The infrastructure layer of Nigeria's food economy:

- All 36 states, with regional hubs managing logistics
- A farmer-facing platform for listing produce, advance payments, and demand forecasts
- A data business selling anonymised supply and demand insight to government, NGOs, and food security organisations
- Cold chain storage and transport, owned or partnered
- West Africa expansion into Ghana, Senegal, and Côte d'Ivoire
- A financial services layer: farmer micro-loans, crop insurance, agent savings products
- Recognition by the Nigerian government and international bodies as a model for agricultural value chain reform

---

## WHAT SUCCESS LOOKS LIKE

Farmers earn what their produce is worth. Households and businesses pay only what it actually costs to move food from farm to table. The weekly Debridgers price becomes the number people quote when they want to know what food should cost in the region.

Commercially, success is a self-funding agent network, repeat buyers who order from the wallet without thinking about it, and unit economics that hold as the model is copied into the next city.

---

## WHAT WE REFUSE TO BECOME

Framed from the stated values, to be confirmed:

- Another middleman. If we ever capture value by widening the gap between farm gate and table rather than closing it, we have become the thing we exist to remove
- Opaque on price. Fixed, published, verifiable pricing is the product, not a marketing device
- Unreliable to agents. Late or disputed commission payments destroy the distribution layer permanently
- Careless with money. Every naira through the platform stays reconciled and auditable
- A platform that extracts from farmers to subsidise consumer growth

---

## CURRENT TOP PRIORITIES

1. Make checkout and payment work reliably end to end, then keep it that way
2. Finish the money paths: buyer withdrawals, dedicated virtual account issuance, automated weekly payouts, full reconciliation
3. Close the order lifecycle so orders reach out for delivery and delivered, which unblocks buyer spend history, delivery notifications, and fulfilment time measurement
4. Onboard the first 10 to 20 verified agents and keep remittance above 90%
5. Land the first 50 direct platform orders
6. Confirm 5% clears agent unit economics before it reaches an agent contract, since the rate was set to resolve a contradiction rather than from a margin model

---

## CURRENTLY DEPRIORITISED

Explicitly deferred in the KPI notes and roadmap:

- Mobile app, no codebase exists, treated as a 5-year item
- Two-factor authentication for buyers, security-critical but not revenue-blocking
- Formal uptime SLA language, premature without on-call and redundancy
- SOC 2 and formal compliance certification
- Full disaster recovery runbook with a sub-one-hour recovery time objective
- Feature parity between agent and buyer dashboards, rejected as the wrong goal entirely
- Publicly published weekly reference pricing, dependent on scale and a data pipeline that does not exist yet
- Multi-level override payout beyond depth one
- Apple Pay and Google Pay, mobile money and USSD, chargeback and refund event handling
- Farmer-facing software
- Social media bot, chatbot, birthday and loyalty programmes, buyer leaderboard

---

## Open questions this document could not answer

Ordered by how much damage the missing answer does. Every one has a matching `TODO:` in the body.

1. **Real cost of goods and true gross margin per order.** Nothing else on this list can be reasoned about until this is known, because it decides whether growth helps or hurts
2. **The 5% agent remittance rate.** If that figure is literal it is an emergency, and if it is a mix-up with the commission rate it is nothing. It cannot stay ambiguous
3. **Monthly burn**, which is the missing half of the runway calculation
4. **Regulatory status of holding buyer wallet balances.** The platform is already doing this
5. Whether the 10 orders came through the platform checkout or were taken manually
6. What has already been tried commercially, what worked, what did not, and what was learned
7. Legal entity, registration status, and whether the core team agreement is signed
8. Who on the team does what, and who is full-time
9. Customer acquisition cost by channel
10. Who the competitors actually are in Kaduna
11. Whether 5% is the right long-term commission rate, given the stock model implies roughly 7% on the ₦1,300 to ₦1,400 spread
12. What triggers expansion to a second city
