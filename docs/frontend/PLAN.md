# CTO Execution Plan - Debridgers

Three things are meant to line up: `docs/jottings/KPI.md` (the scorecard),
`docs/frontend/TASKS.md` (the backlog), and this file (the weekly shipping
order).

**Auth refactor: COMPLETE.** All phases shipped; `AuthPLAN.md` has been
retired and its outcomes folded into `docs/frontend/Context.md`. The
single-flight refresh bug (concurrent 401s silently logging users out) is
fixed.

## Status

Audited against the code on 2026-07-27, not against this document's own claims.
See **Shipped** in Part 2 for what is done and **Remaining** for what is not.
`TASKS.md` is kept in sync with those two lists.

---

## Part 1 - KPI Scorecard (arranged)

### Tier A - Track starting now (Attainable)

| KPI                                                      | Cadence                          |
| -------------------------------------------------------- | -------------------------------- |
| 1-2 completed backlog items/week                         | Weekly                           |
| Zero P0 incidents/month                                  | Monthly                          |
| CI green on every merge (lint + typecheck + test)        | Per-merge                        |
| Zero new `any` in merged code                            | Per-merge                        |
| Weekly deploy cadence                                    | Weekly                           |
| Real product photos for every live catalog variety       | Ongoing                          |
| Automated weekly Paystack payout cron running unattended | Once live, then monthly check    |
| Monthly verified-restorable DB backup                    | Monthly                          |
| 10-20 active verified agents in Kaduna                   | Track monthly, target by month 6 |
| Agents remit >90% of stock value within agreed window    | Monthly                          |
| Order fulfillment time baseline established              | This month                       |

### Tier B - Stretch (pick 1-2 at a time, don't run all in parallel)

| KPI                                               | Depends on                                           |
| ------------------------------------------------- | ---------------------------------------------------- |
| 100% new endpoints covered by an integration test | Test harness time investment                         |
| Sub-2-day bug-to-fix turnaround                   | Bug volume staying low                               |
| First 50 direct-to-buyer platform orders          | **Fixing broken checkout (Week 1)**, then real usage |
| Ship wallet + Paystack top-up end-to-end          | TASKS #9.1                                           |
| Ship agent + buyer referral system                | TASKS #11.2-11.5 (11.1 is done)                      |

### Tier C - Not scorecard material yet (Unreasonable)

99.9% uptime, full DR runbook <1hr RTO, 200+ agents, 10-city presence,
mobile app, weekly public pricing index. Revisit once Tier A is
consistently green for 2-3 months straight.

---

## Part 2 - Shipping Order

Sequencing logic: **fix what's broken first, revenue-blocking work next,
quick wins interleaved to keep weekly cadence visible, security and
nice-to-haves last.**

---

## Shipped

Moved here once verified against the code. Original week numbers kept so the
sequencing reasoning above still reads.

### Week 1 - Buyer checkout (was: repair) - SHIPPED

`POST /buyer/orders/initialize-payment`, the `buyer_order` webhook branch, and
`FRONTEND_URL`. Root cause of the original 404 turned out to be structural:
there was no `order_items` table and no `product_id` on `orders`, so a
multi-product order could not be stored. Table added, existing orders
backfilled. `PAYMENTS_SIMULATED=true` stands in until Paystack credentials
exist. Verified end to end: order created, both line items written, marked
`confirmed/paid`.

### Week 3-4 - Cart continuity - SHIPPED

`GET`/`PUT`/`DELETE /buyer/cart` plus `POST /buyer/cart/merge`. Merge takes the
higher quantity per line, not the sum. Debounced 2s sync while authenticated,
localStorage remains the source of truth. One shared `CartProvider` replaced
three duplicate `CartItem` types and three copies of the cart logic. The
guest-cart idea was dropped deliberately: an anonymous cart has no owner to key
on.

### Week 8-9 - Favourites - SHIPPED, and split in two

`favorites` table, optimistic heart on the product card, hidden for anonymous
visitors. **Buy again** was separated out as its own thing: derived from order
history and ranked by frequency then recency, needing no table and no user
action. A favourite is a stated intention; a frequent purchase is observed
behaviour, and conflating them makes both worse.

### Not on the original plan, also shipped

- **Product categories.** The shop filter keyed off `description`, which is
  unique per product, so every chip matched exactly one item. Real `category`
  column, shared `productCategories`, filter restored.
- **Delivery pricing.** Per-package (`zone base + extra packages x ₦500`) with a
  per-zone `free_delivery` flag and a global time-boxed promo. Pure functions so
  the quote and the charge cannot drift.
- **Checkout cascade.** State -> LGA -> Zone -> address, all required, with a
  live quote showing Subtotal / Delivery / Handling / Total. Replaced a
  hardcoded "Delivery: Free" that would have undercharged visibly.
- **Dialog engine** plus its first two consumers, `REQUEST_PAYOUT` and
  `AUTH_GATE`. `AuthModal` deleted.
- **Agent-requested payouts.** `POST /agent/withdrawals`, debits and creates the
  pending row in one transaction.
- **Auth refactor.** Single-flight refresh (concurrent 401s were silently
  logging users out), hooks moved into `ui-web` behind an adapter, auth pages
  1728 lines down to 602.
- **Shared currency formatting** across 15 call sites, replacing nine
  divergent implementations, two of which passed no locale at all.
- **Nigerian states dataset** - 37 states, 774 LGAs.

---

## Remaining

### Next 1 - Week 2 leftovers (still open)

- Email-notification listener gate (TASKS #8.1). The column, DTO and profile
  read/update all exist, but **no listener checks the flag**, so the toggle is
  decorative. Small and contained.
- Wire `PaymentService`'s commission rate to
  `SystemSettingsService.getSetting("agent_commission_rate")` instead of the
  env var, so the already-built admin settings UI actually does something.

### Next 2 - Admin orders list

Not in the original plan, and now the biggest gap: orders are being created and
**admin has no way to see them**. Ahead of payment links, which depend on the
same groundwork.

### Next 3 - Repeat order + wallet groundwork (was Week 5)

- Repeat Last Order server persistence (TASKS #12), one endpoint.
- Buyer wallet schema + `GET /buyer/wallet` (first half of TASKS #9.1).
- Note: the client-side "repeat last order" already works off a localStorage
  snapshot, so this is about surviving a device change, not new behaviour.

### Next 4 - Wallet completion (was Weeks 6-7)

`POST /buyer/wallet/topup/initialize`, webhook credit on
`metadata.type === "buyer_topup"`, `wallet_transactions`, and `buyer/wallet.tsx`
wired to a real wallet endpoint rather than `/buyer/dashboard` + `/buyer/orders`.

### Next 5 - Payment links

Fully specced at the end of this file. Depends on guest checkout, which does not
exist yet.

### Next 6 - Agent stock request UX (was Week 10)

TASKS #10. The "fake category grouping off `description`" problem noted
originally is now **fixed** - there is a real `category` column. What remains is
the 3-level category -> type -> variety vision, which still needs the deeper
product model in TASKS #7.

### Next 7 - Commission and referral system (was Weeks 11-14)

`system_settings` (#11.1) is done, so this starts one step in:

1. `referral_code` / `referred_by` self-service columns, generation on
   activation, `?ref=` capture on signup (#11.2). Only an admin-assigned
   `referred_by_agent_id` exists today.
2. Agent referral commission on a referred buyer's order (#11.3). The existing
   monthly cron only handles agent-recruits-agent overrides.
3. `buyer_discounts` + referral discount on the referee's first order (#11.4).
4. `/refer` landing page and dashboard entry points (#11.5).

Largest single feature left. Do not start before Next 6 finishes.

### Ongoing, not scheduled as a discrete week

- **Error handling (TASKS #5):** improved but not finished - several
  `catch {}` blocks remain. Fold proper handling into whichever week touches
  the flow.
- **Testing (TASKS #6):** there is still **no automated test** for any of the
  new endpoints. Everything shipped above was verified by hand. This is the
  largest quality gap in the repo.
- **Agent wallet bank details + payout cron (TASKS #9.2):** the payout _request_
  now exists; the bank-details form and the cron do not.
- **Product catalog structure (TASKS #7):** partially addressed - `category`,
  `measure_value` and `measure_unit` now exist. A full Category/Variety model is
  still needed for a real 3-level stock request UX.
- **Dialog migrations:** eight hand-rolled `fixed inset-0` modals remain.
  Migrate each as it is touched; `REQUEST_PAYOUT` is the reference.
- **SMS (TASKS #8.2) and 2FA (TASKS #8.3):** deliberately last.
- **Browser verification:** everything above is verified by typecheck, build,
  SSR HTML or API call. None of it has been exercised visually or at 360px.

---

## How to use this

- Part 1 is what you report upward/to yourself monthly.
- Part 2 is what you execute against weekly. If a week slips, slide the remaining weeks rather than reordering - then recheck whether the Tier B KPI it feeds is still realistic for the quarter.
- TASKS.md, KPI.md, and this file should always agree on what's done. When something ships, cut it from TASKS.md the same way #8.4 and #11.1 were, and check whether it changes a KPI tag here.

---

## Planned: Payment Links

Specced 2026-07-27 from `docs/Screens/Admin/Admin.png` (a reference screenshot
from a different product, Oron Admin - treat it as the interaction model, not
as branding to copy).

### What it is

A shareable URL carrying a **preset basket**, payable by someone with **no
account**. Admin creates a link for one or more products with default
quantities, shares the URL, and watches payments land against it.

`https://debridgers.../pay/<slug>`

This is a different sales motion from the buyer dashboard: no signup, no cart
building, no browsing. Useful for WhatsApp selling, a single negotiated order,
or a bulk buyer who should not have to register.

### What the reference screen shows

- Title is the link's name, breadcrumb `/ PAYMENT LINK`, a `Back to links` action
- **Shareable link** with a copy button, plus `Created <date> - N product(s)`
- **Status**: an `ACTIVE` badge with `Deactivate` and `Delete link` actions
- **Products on this link**: each row shows price and `default qty N`
- **Sessions (N)**: a table of `TXN ID | DATE | CUSTOMER | NGN TOTAL`

### Schema

- `payment_links` - `id`, `slug` (unique, URL-safe, unguessable), `title`,
  `created_by` (admin user), `is_active`, `created_at`
- `payment_link_items` - `payment_link_id`, `product_id`, `default_quantity`,
  unique on `(payment_link_id, product_id)`

**Sessions reuse `orders`.** Add a nullable `payment_link_id` FK to `orders`
rather than building a parallel table. A payment-link purchase IS an order: it
needs the same fulfilment, delivery zone, status transitions and admin
visibility. A second order-like table would fork every one of those. The
"Sessions" list is then just orders filtered by `payment_link_id`.

### The blocker to solve first: guest checkout

`POST /buyer/orders/initialize-payment` is guarded by `AuthGuard` + `Roles("buyer")`
and keys everything off `user.sub`. Payment links are explicitly for people
without accounts, so this needs a **public** sibling that takes contact details
in the body instead of a session:

`POST /pay/:slug/initialize` with `{ name, email, phone, delivery_address,
zone_id, items: [{ product_id, qty }] }`

It must reuse `priceBasket()` and `computeDeliveryFee()` unchanged - the whole
point of those being pure and shared. Do NOT let a second pricing path appear.

Open question to settle before building: does a guest purchase create a
`users` row (role `buyer`, no password, unverified) so orders always have an
owner, or does `orders.buyer_id` become nullable with contact details stored on
the order? **Recommendation: create the user row.** Every downstream query -
order history, buyer counts, notifications - already assumes an owner, and a
nullable FK would mean auditing all of them. It also gives the buyer a real
account to claim later by setting a password.

### Endpoints

Admin (`AuthGuard` + `Roles("admin")`):

- `POST /admin/payment-links` - create with items
- `GET /admin/payment-links` - list with product count and session count
- `GET /admin/payment-links/:id` - detail plus its sessions
- `PATCH /admin/payment-links/:id` - activate / deactivate
- `DELETE /admin/payment-links/:id`

Public:

- `GET /pay/:slug` - link plus its products; 404 when inactive or missing
- `POST /pay/:slug/initialize` - as above

### Frontend

- `admin-dashboard/payment-links` - list
- `admin-dashboard/payment-links/:id` - detail, matching the reference layout
- `/pay/:slug` - public payment page, outside the dashboard layout

Reuse: `formatFromKobo`, the dialog engine for create/deactivate/delete
confirmations, `ProductCard` or a compact row for the product list, and the
existing State -> LGA -> Zone cascade for the delivery address.

### Admin nav gap

The reference nav has Dashboard, Products, **Categories**, **Orders**, Payment
Links, **Customers**, Reviews, Disputes, Notifications, Support, Settings.

Debridgers admin currently has only: Overview, Agents, Buyers, Products,
Outreach, Settings. So alongside Payment Links, these are genuinely missing and
worth sequencing:

- **Orders** - admin has no order list at all, which is a real gap now that
  buyer checkout works and orders are being created
- **Categories** - the data exists (`products.category`) but is only editable
  through the product form
- Reviews / Disputes / Support - product decisions, not yet needed

### Sequencing

1. Guest checkout foundation (the public initialize path + the user-row
   decision above). Nothing else works without it.
2. Schema, admin CRUD, admin list and detail.
3. Public `/pay/:slug` page.
4. Admin **Orders** list - arguably ahead of payment links, since orders exist
   today with no admin view.

Depends on: real Paystack credentials, since `PAYMENTS_SIMULATED` currently
short-circuits the gateway.

## Addendum

### Accepted Payment Mthods

- Paystack (debit card or bank transfer)
- Cash on delivery (pickup orders only)
- Bank transfer (institutional and bulk orders by prior written agreement)

## Payment Timing

- Online/WhatsApp Orders: Full payment via Paystack must be completed before Order processing begins
- Pickup Orders: Full payment due upon pickup
- Institutional/Bulk Orders: Terms to be documented in a separate written agreement

## Currency: All prices are written in Nigerian Naira (NGN) unless otherwise specified

## Planned: Checkout payment method selection

Decided 2026-08-09. The checkout button says "Pay with Paystack", which names an
implementation instead of an intent and hardcodes one of the two methods the
backend already supports.

**Shape: a modal, not a page.** The choice is two options and no input of its
own. A page costs a route, a back-button story, and a way to arrive at it with a
stale order. The dialog engine already carries `AUTH_GATE` on this same screen,
so a `PAYMENT_METHOD` dialog is the consistent move. Revisit only if a method
arrives that needs real form fields, for example card capture on our own domain
or a bank-transfer reference upload.

**The flow has to change, not just the label.** Today the shop calls
`POST /buyer/orders/initialize-payment`, which creates the order **and** starts
Paystack in one request. That leaves no point at which a buyer could choose the
wallet. Splitting it:

1. `POST /buyer/orders` creates the pending order and returns `total_kobo`.
2. The modal opens showing that total, the wallet balance, and the two methods.
3. `POST /buyer/orders/:id/pay` with `payment_method: "wallet" | "paystack"`.
   Wallet settles immediately; Paystack returns an `authorization_url` to
   redirect to.

All three endpoints exist. Step 3 is already built for both methods.

**What the modal must show, since this is money:**

- The amount, itemised: items, delivery fee, handling fee. `POST /buyer/cart/quote`
  returns exactly this breakdown and is the same pricing path the charge uses,
  so what is shown is what is charged.
- Wallet balance, and whether it covers the total. If it does not, the wallet
  option is disabled with the shortfall named rather than hidden, so the buyer
  learns why.
- One in-flight request at a time. Double submission on a payment screen is the
  expensive kind of bug, and `checkPaymentAttempt` already rate limits server
  side; the button must reflect that rather than rely on it.

**Do not add a "cash on delivery" option to this modal yet.** The Addendum above
allows it for pickup orders only, and the backend `payment_method` enum has no
such value. It needs a backend change and a pickup flow first.

- [x] `PAYMENT_METHOD` dialog in the dialog registry
- [x] Split shop checkout into create-order then pay
- [x] Wallet balance and sufficiency check in the modal
- [x] Rename the button to "Pay" and move method naming inside the modal
- [ ] Reuse the same modal on the buyer dashboard, where an unpaid order also
      needs a pay action

### Abandoned orders: what happens when someone does not pay

Decided 2026-08-09. Splitting checkout into create-then-pay means an order can
now exist that nobody paid for. That is a feature, not a leak: it is a record of
intent we can recover, provided it is handled deliberately.

**Two cases, and only one of them creates anything.**

| Case                                                       | What exists afterwards                                                                                                                                                                                                                                                      |
| ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Guest hits checkout, gets `AUTH_GATE`, logs in or signs up | Nothing orphaned. No order is created until the delivery form is submitted, and the cart lives in localStorage and merges server-side on login through `POST /buyer/cart/merge`. They land back on checkout with their cart intact. This already works and needs no change. |
| Signed-in buyer creates the order, then closes the modal   | A real order, `status: pending`, `payment_status: unpaid`. This is the case to design for.                                                                                                                                                                                  |

**Do not redirect them to payment on next login.** It is tempting and it is the
wrong call. Someone logging in to check a delivery, or six days later for
something unrelated, gets shoved into a checkout they already walked away from,
with no obvious way out. Hijacking the post-login destination also breaks the
signup path, where the intent was never payment at all. Recovery should be
offered, not forced.

**Surface it instead, in the two places they will already be looking:**

- A persistent card at the top of the buyer dashboard: "You have an unpaid
  order, ₦X, placed 2 days ago", with **Complete payment** and **Cancel order**.
- The same action on the row in the orders list, so the list is self-explanatory
  rather than showing a mystery pending entry.

Both reopen the same `PAYMENT_METHOD` dialog. It already takes an order id and
its totals, so nothing new is needed beyond fetching them.

**Re-price at the moment of resume, and say so if it changed.** The order stores
the total from when it was created. If an admin has since changed a price, paying
the stale total charges the wrong amount. On resume, re-run the same
`priceBasket` path, and if the total moved, show the old and new figures and make
the buyer confirm. Silently charging a different number than the one shown is the
failure mode to avoid; silently honouring a stale one is a slower version of the
same problem.

**Do not accumulate duplicates.** A buyer who abandons three times should not
have three pending orders. On create, if an unpaid pending order already exists
for that buyer with the same cart contents, return it rather than inserting
another.

**Expire them.** An unpaid order older than 24 hours moves to `cancelled` with a
cancellation reason of "not paid in time". Without this the orders table fills
with rows that are neither live nor closed, and the admin orders page becomes
unreadable. 24 hours is long enough to cover "I will pay when I get home" and
short enough that the list stays meaningful. This is a scheduled job in the same
shape as `PayoutService`'s weekly `@Cron`.

- [ ] Unpaid-order card on the buyer dashboard
- [ ] Complete payment action on the orders list row
- [ ] Re-price on resume, confirm if the total changed
- [ ] Reuse an existing pending order instead of creating a duplicate
- [ ] `@Cron` to expire unpaid orders after 24 hours
