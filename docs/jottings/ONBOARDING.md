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

Debridgers is a food commodity aggregator and distributor. We source agricultural products directly from smallholder farmers and deliver them to households, businesses, restaurants, and institutional buyers within Kaduna metropolis. By placing an Order, you agree to be bound by these Terms.

## Vision & Mission

Start here. Everything else - the product decisions, the tech choices, the commission structure, the agent model - flows from this.

---

**Vision**

A Nigeria where every family and business pays the true price of food with no exploitation, no information gap and no middlemen tax.

Debridgers envisions a future where the agricultural value chain in Nigeria is transparent, efficient, and fair. A country where farmers earn what their produce is worth, and consumers pay only what it actually costs to get food from farm to table.

---

**Mission**

To eliminate exploitative middlemen from Nigeria's food supply chain by connecting farmers directly to consumers and wholesalers through technology, trusted agents and transparent pricing.

Breaking it down, that translates to:

- Sourcing directly from farmers at fair prices
- Using a network of verified field agents to bridge the last mile
- Delivering to homes and shops at the same price you'd pay at the market. No markup, no hidden fees
- Starting in Kaduna, scaling across Nigeria

---

## How Debridgers Works

Debridgers is a B2B agricultural supply chain marketplace focused on Nigerian farm produce (grains, beans, staples, tubers, proteins, oils). It operates a consignment model:

1. **Debridgers sources stock** from farmers/suppliers (warehouse inventory tracking)
2. **Agents** (sales distributors) apply, get admin-approved, complete KYC, request stock packs, sell locally (markets/caterers), remit proceeds
3. **Buyers** (businesses/end-users) purchase via agents or platform (direct orders in progress)
4. **Commissions automated**: direct sales (30%), agent overrides (5%, single-level only - recruiter earns on their direct recruit's earnings; multi-level payout to depth 2 is not yet built), state managers (2%). Buyer referral commission (₦20/order) is scaffolded in the schema but not yet wired up - see `docs/frontend/TASKS.md` #11
5. **Wallets track** owes/earnings in kobo (Paystack integration)
6. **Admin dashboard** manages approvals, KYC reviews, stock fulfillment, payouts

Users: admins, agents, buyers, companies. Nigerian focus (Paystack, kobo, LGAs).

---

## Who We Serve

Every feature you build is built for one of these roles. Know them.

- **Agents** - Field sales reps (Kaduna-focused initially), need LGA/address. The backbone of our distribution. They go door-to-door, carry stock, and remit back to the platform. Their trust is earned by paying commissions on time and giving them tools that actually work.
- **Buyers** - Businesses placing orders (with referral codes). Restaurants, market traders, caterers, households buying in volume. They care about price, reliability, and not having to negotiate every time.
- **Admins/Employees** - Platform operations, approve agents/KYC, fulfill stock, payout commissions. Internal team running day-to-day operations from the admin dashboard.
- **Farmers** - Upstream suppliers (not yet coded, implied via mission). The people we are ultimately trying to serve. Direct market access and fair pricing.
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
  1. **Sustainable Growth** - Proven unit economics (commissions/recurring revenue)
  2. **Risk Mitigation** - Rigorous KYC/approvals reduce fraud/defaults
  3. **Data-Driven** - Dashboards/inventory analytics for ROI visibility
  4. **High Margins** - Low-capex consignment model scales without inventory risk

- **Agents**:
  1. **Reliability** - Guaranteed stock fulfillment, on-time commissions
  2. **Fairness** - Transparent remittance tracking, multi-tier earnings
  3. **Support** - Quick approvals, clear targets, referral incentives
  4. **Growth** - Promote-to-manager paths, sales reports for performance

- **Logistics**:
  1. **Precision** - Accurate dispatch/fulfillment tracking
  2. **Speed** - Pending-to-fulfilled workflows minimize delays
  3. **Accountability** - Inventory audits, remittance verification
  4. **Partnership** - Reliable volumes for route optimization

- **Farmers**:
  1. **Fair Trade** - Direct buyer connections, no middlemen exploitation
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
- Expansion into West Africa: Ghana, Senegal, Côte d'Ivoire, where the same middleman exploitation problem exists
- A financial services layer: micro-loans for farmers, crop insurance, and savings products for agents
- Recognized by the Nigerian government and international bodies (FAO, World Bank) as a model for agricultural value chain reform
