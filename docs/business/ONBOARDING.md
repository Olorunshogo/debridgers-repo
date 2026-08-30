# Debridgers - Onboarding Guide

Welcome to Debridgers. This document covers everything you need to understand the company: what it does, why it exists, how it works, who it serves, and where it is going. Read this before touching anything else.

---

## Table of Contents

- [Vision & Mission](#vision--mission)
- [How Debridgers Works](#how-debridgers-works)
- [Who We Serve](#who-we-serve)
- [Core Values](#core-values)
- [Where We Are Going](#where-we-are-going)

---

## What is Debridgers?

Debridgers is a food commodity aggregator and distributor operating in Kaduna metropolis. We buy grain, beans, tubers and oil in bulk and deliver them to food businesses.

**Sourcing.** From farmers directly where quality can be secured, and from suppliers who are themselves intermediaries where they supply quality. Both are normal. See the note on intermediaries below.

**Selling.** The primary segment is **B2B food businesses**: restaurants, caterers and hotels. Institutions are next. Households and market traders are deliberately deferred, and that is a locked decision rather than an oversight, so "we also serve households" is not a thing to build for today.

## Vision & Mission

Start here. Everything else - the product decisions, the tech choices, the commission structure, the agent model - flows from this.

---

**Vision**

A Nigeria where every family and business pays the true price of food, with no information gap and no opaque, uncoordinated links in the chain.

Debridgers envisions a future where the agricultural value chain in Nigeria is transparent, efficient, and fair. A country where farmers earn what their produce is worth, and consumers pay only what it actually costs to get food from farm to table.

---

**Mission**

To make Nigeria's food supply chain transparent and coordinated, connecting farmers, suppliers, consumers and wholesalers through technology, trusted agents and pricing anyone can verify.

**A note on intermediaries, because it is easy to get wrong.** Debridgers is not trying to remove them. The company already buys from suppliers who _are_ intermediaries and will keep doing so wherever they supply quality, because real ones earn their margin: aggregation, transport, storage, financing, grading, risk absorption, market discovery. The problem was never that a link exists in the chain, it is that the chain is opaque and uncoordinated. **The claim is transparency and coordination, not elimination** - and it is the more defensible claim, because Debridgers is itself a link in that chain.

Breaking it down, that translates to:

- Sourcing directly from farmers at fair prices
- Using a network of verified field agents to bridge the last mile
- Delivering to homes and shops at the same price you'd pay at the market. No markup, no hidden fees
- Starting in Kaduna, scaling across Nigeria

---

## How Debridgers Works

Debridgers is a B2B food supply business dealing in Nigerian farm produce: grains, beans, staples, tubers and oils.

1. **Debridgers buys stock** from farmers and suppliers, into a warehouse with inventory tracking
2. **Buyers** order on the platform and **pay before delivery**. That prepayment is the single most important structural fact about the business: the customer finances the trade, so the company does not need capital to grow order volume
3. **Agents** apply, are approved, complete KYC, and sell in the field. **New agents are order-first**: they take a paid order, then stock is released, then they deliver. That carries no exposure. **Consignment is earned, not granted** - eight weeks above 95% remittance - because a consignment package is ₦27,000 to ₦54,000 of company stock in someone else's hands
4. **Commission is a flat naira amount per package**, never a percentage of order value: ₦1,200 a bag of beans, ₦1,000 a bag of rice, ₦700 a keg of oil, ₦400 otherwise. An agent can verify it by counting bags, and 5% of a ₦42,000 bag would pay out 83% of the gross margin
5. **Wallets track** balances and what agents owe, in kobo, settled through Paystack
6. **Admin** manages approvals, KYC, stock fulfilment and payouts

Buyer referral rewards exist in the schema but are not wired up, and the ₦500 discount and ₦20 perpetual commission both need re-costing against real package prices before they are.

**Do not confuse commission with the remittance rate.** Commission is a cost, in naira per package. The remittance rate is a collection measure, a percentage, target above 95%. Mixing them up put a phantom "agent remittance rate: 5%" line into three company documents.

Users: admins, agents, buyers, companies. Nigerian focus (Paystack, kobo, LGAs).

---

## Who We Serve

Every feature you build is built for one of these roles. Know them.

- **Agents** - Field sales reps (Kaduna-focused initially), need LGA/address. The backbone of our distribution. They go door-to-door, carry stock, and remit back to the platform. Their trust is earned by paying commissions on time and giving them tools that actually work.
- **Buyers** - Food businesses placing orders: restaurants, caterers and hotels, with institutions next. They care about price, reliability, and not having to negotiate every time. Households and market traders are deferred, so they are not who a feature is built for today.
- **Admins/Employees** - Platform operations, approve agents/KYC, fulfill stock, payout commissions. Internal team running day-to-day operations from the admin dashboard.
- **Farmers and suppliers** - Upstream, not yet modelled in code. Farmers where quality can be secured, and other suppliers where they supply quality. Reliable repeat off-take and payment on agreed terms with records.
- **Companies** - Likely logistics/suppliers. Supply chain partners, transport providers.
- **Logistics** - Implied for delivery (stock dispatch, future rider app).
- **Investors** - Platform backers (not yet coded).

---

## Core Values

These are not aspirational marketing words. They are constraints on how we build.

**Debridgers as a Whole (Shared Foundation)**

1. **Integrity** - Transparent wallets, verifiable KYC and honest commissions. Build trust in every transaction.
2. **Efficiency** - Automated payouts/crons, streamlined stock flow to minimize friction from farm to buyer.
3. **Empowerment** - Equip agents with stock/tools, enable farmers' direct market access.
4. **Scalability** - Referral systems, state managers to grow network exponentially while maintaining control.
5. **Impact** - Bridge rural farmers to urban markets, boost food security, create rural jobs.
6. Honesty, reliability.

---

**What Each Group of People Needs From Us**

Different stakeholders measure value differently. Build features with these in mind.

- **Investors**:
  1. **Negative working capital** - Buyers prepay, so the customer finances the trade. This is the most attractive structural fact about the business and the real reason it is low-capex
  2. **Risk Mitigation** - KYC and approvals, order-first for new agents, and a cap on how much stock can sit in the field at once
  3. **Data-Driven** - Dashboards and inventory analytics, though contribution margin is not yet measurable because landed cost is unmeasured
  4. **Sustainable unit economics** - Pricing set to recover the real cost to serve, shipped 2026-08-29. Whether an order actually contributes is still unproven until landed cost is counted

- **Agents**:
  1. **Reliability** - Guaranteed stock fulfillment, on-time commissions
  2. **Fairness** - Transparent remittance tracking, and commission in naira per package that an agent can verify by counting
  3. **Support** - Quick approvals, clear targets, referral incentives
  4. **Growth** - Promote-to-manager paths, sales reports for performance

- **Logistics**:
  1. **Precision** - Accurate dispatch/fulfillment tracking
  2. **Speed** - Pending-to-fulfilled workflows minimize delays
  3. **Accountability** - Inventory audits, remittance verification
  4. **Partnership** - Reliable volumes for route optimization

- **Farmers**:
  1. **Fair Trade** - Reliable buyer connections at prices they can verify
  2. **Consistency** - Bulk off-take via warehouse model
  3. **Payment Security** - Automated supplier receipts (future extension)
  4. **Inclusion** - Rural-focused LGAs/states expand reach

- **Employees (Admins)**:
  1. **Efficiency** - Intuitive dashboard, bulk actions
  2. **Authority** - Full control over approvals/payouts
  3. **Insight** - Stats on agents/orders/revenue
  4. **Simplicity** - Minimal clicks for high-impact tasks (KYC/stock)

---

## Where We Are Going

These targets are not abstract. Every product decision should be measured against whether it moves us closer to them.

**By 2031 (5 years)**

Debridgers should be the dominant farm-to-door platform across Northern Nigeria.

Specifically:

- Operating in at least 10 major cities (Kaduna, Kano, Abuja, Zaria, Jos, Sokoto, etc.)
- A network of 200+ verified field agents earning sustainable commissions
- Partnerships with farmer cooperatives and state agricultural boards
- A mobile app with 100,000+ active users (consumers and wholesalers)
- A wholesale arm: small businesses, restaurants, and market traders ordering in bulk at negotiated rates
- Transparent weekly pricing published publicly, becoming a reference point for fair market rates in the region
- Paystack-powered seamless payments with buy-now-pay-later options for bulk buyers

**By 2036 (10 years)**

Debridgers should be the infrastructure layer of Nigeria's food economy.

Specifically:

- Pan-Nigeria presence: all 36 states, with regional hubs managing logistics
- A farmer-facing platform where smallholder farmers list produce, get advance payments, and track demand forecasts
- A data business: selling anonymized supply/demand insights to government, NGOs, and food security organizations
- Cold chain logistics infrastructure (refrigerated storage and transport) owned or partnered
- Expansion into West Africa: Ghana, Senegal, Côte d'Ivoire, where the same opacity and coordination problem exists
- A financial services layer: micro-loans for farmers, crop insurance, and savings products for agents
- Recognized by the Nigerian government and international bodies (FAO, World Bank) as a model for agricultural value chain reform
