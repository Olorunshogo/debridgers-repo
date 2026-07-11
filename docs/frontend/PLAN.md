# CTO Execution Plan - Debridgers

Three things are meant to line up: `docs/jottings/KPI.md` (the scorecard),
`docs/frontend/TASKS.md` (the backlog), and this file (the weekly shipping
order). This version reflects a full code audit against TASKS.md, not just
the doc's own claims - two things changed as a result:

- **Change password (TASKS #8.4)** and **system_settings/admin settings
  (TASKS #11.1, mostly)** are done and have been removed from TASKS.md.
- **Checkout (TASKS #4) is not "frontend done, backend pending" - it's
  broken.** The frontend calls `POST /buyer/orders/initialize-payment`,
  which does not exist on the backend. The only payment-initialize route
  is built for the agent stock-request flow and can't accept a buyer cart.
  As shipped today, checkout 404s. This is Week 1, full stop - every
  revenue KPI in `KPI.md` depends on it.

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

## Part 2 - Weekly Shipping Order

Sequencing logic: **fix what's broken first, revenue-blocking work next,
quick wins interleaved to keep weekly cadence visible, security/nice-to-haves
last.**

### Week 1 - Fix checkout (not a feature ship, a repair)

- **Fix:** Build `POST /buyer/orders/initialize-payment` (auth: buyer) to match what the frontend already sends - accept `{ delivery_address, delivery_time, notes, cart }`, call Paystack `transaction/initialize`, return `{ authorization_url, reference }`.
- **Fix:** Extend the Paystack webhook handler to branch on `metadata.type === "buyer_order"` (it currently only handles the agent commission path) - create the order + order_items rows on `charge.success`.
- **Fix:** Add `FRONTEND_URL` env var for the correct `callback_url` per environment.
- **Why first, and why not "Week 1 of feature work":** nothing else on the roadmap matters if buyers can't complete an order. This is the single highest-severity item in the whole backlog - it's a 404 in production today, not a missing nice-to-have.
- **KPI it feeds:** Tier B "first 50 direct-to-buyer orders" - currently blocked at zero, this unblocks it entirely.

### Week 2 - Quick win + PaymentService wiring

- **Ship:** Email notification toggle backend (TASKS #8.1) - column, DTO, and profile read/update already exist; only the listener/event gate is missing. Small, contained.
- **Ship:** Wire `PaymentService`'s commission rate to `SystemSettingsService.getSetting("agent_commission_rate")` instead of the `AGENT_COMMISSION_RATE` env var (the one remaining gap in TASKS #11.1). Small, and it means the already-built admin settings UI actually does something.
- **Why paired:** both are cheap, both close out doc debt entirely (nothing left in either item), and both give you a clean two-item week right after a hard Week 1.
- **KPI it feeds:** Tier A "1-2 completed backlog items/week."

### Week 3-4 - Cart continuity

- **Ship:** Backend cart endpoints (TASKS #2: `GET`/`PUT`/`DELETE /cart`) with debounce sync, then cart-merge-on-login (TASKS #1) on top of it.
- **Why this order:** #1's merge logic needs #2's `PUT /cart` to exist first - build the endpoint, then the merge flow, then the debounce layer. One coherent build, not two disconnected sprints.
- **Note:** there is currently _no_ backend cart module at all - this is a bigger lift than the doc's per-item complexity implies, budget the full two weeks.

### Week 5 - Repeat order + wallet groundwork

- **Ship:** Repeat Last Order server persistence (TASKS #12) - one endpoint (`GET /buyer/orders/last/items`), small and self-contained.
- **Start:** Buyer wallet schema (`buyer_wallets` table) + `GET /buyer/wallet` (first half of TASKS #9.1).
- **Why:** #12 keeps cadence visible with a cheap full ship; starting wallet now reuses the Paystack initialize/webhook patterns from Week 1 while they're still fresh.

### Week 6-7 - Wallet completion

- **Ship:** `POST /buyer/wallet/topup/initialize`, webhook credit on `metadata.type === "buyer_topup"`, `wallet_transactions` table, `buyer/wallet.tsx` wired to real data (today it only calls `/buyer/dashboard` and `/buyer/orders` - not a real wallet endpoint at all).
- **KPI it feeds:** Tier B wallet KPI.

### Week 8-9 - Favorites / Wishlist

- **Ship:** TASKS #3 end to end - currently zero code exists (no endpoints, no heart icon, no drawer). Endpoints, heart icon, guest-cart-style merge on login.
- **Why here:** the guest-merge-on-login pattern mirrors the cart-merge pattern from Week 3-4 - reuse it instead of re-deriving it.

### Week 10 - Agent stock request UX

- **Ship:** TASKS #10 - the current page only does a 2-level drill-down (category → product, using the free-text `description` field as a fake category grouping). Note the doc's 3-level category → type → variety vision needs the real product schema from TASKS #7 first; without that, treat this week as improving the 2-level UX, not building the full 3-level version described.
- **Why here:** pure frontend, good change of pace after backend-heavy weeks, and it's the agent side of the marketplace getting attention after several buyer-only weeks.

### Week 11-14 - Commission & referral system

`system_settings` (TASKS #11.1) is already done, so this block starts one
step later than the doc's own numbering suggests:

1. `referral_code` / `referred_by` self-service columns + generation on activation + `?ref=` capture on signup (TASKS #11.2 - note only an admin-assigned `referred_by_agent_id` exists today, no shareable buyer/agent code)
2. Agent referral commission on a referred buyer's order (TASKS #11.3 - note the existing monthly cron only handles agent-recruits-agent overrides, not buyer-referral commissions)
3. `buyer_discounts` table + referral discount on referee's first order + checkout application (TASKS #11.4)
4. `/refer` landing page + dashboard entry points (TASKS #11.5)

- **Why last big block:** largest single feature in the backlog, several Medium-complexity steps genuinely require 3-4 weeks, and every earlier week is either a quick win or more urgent for revenue. Don't start this before Week 10 finishes.

### Ongoing, not scheduled as a discrete week

- **Error handling & edge cases (TASKS #5):** currently just empty `catch {}` blocks in `checkout.tsx`/`shop.tsx` - fold proper handling into whichever week touches that flow (session-expiry during Week 1, cart errors during Week 3-4).
- **Testing scenarios (TASKS #6):** run the manual QA checklist after each week's ship, not as its own week.
- **Agent wallet bank details + payout cron (TASKS #9.2):** `GET /agent/wallet` and manual payout already work; the bank-details form is a "coming soon" placeholder and there's no cron yet. Slot in whenever a light week appears - self-contained, doesn't block anything else.
- **Product catalog structure (TASKS #7):** still a flat `products` table with no Category/Variety model - this is a prerequisite for a _real_ 3-level agent stock request UX (Week 10) and a true favorites-by-variety experience. Worth scheduling deliberately once Week 10 exposes how much the flat model is limiting the UX, rather than guessing now.
- **SMS notifications (TASKS #8.2) and 2FA (TASKS #8.3):** deliberately last - both are zero-code-so-far, SMS needs a vendor decision first, 2FA has real UX complexity and isn't user-requested yet. Revisit after the referral system ships.

---

## How to use this

- Part 1 is what you report upward/to yourself monthly.
- Part 2 is what you execute against weekly. If a week slips, slide the remaining weeks rather than reordering - then recheck whether the Tier B KPI it feeds is still realistic for the quarter.
- TASKS.md, KPI.md, and this file should always agree on what's done. When something ships, cut it from TASKS.md the same way #8.4 and #11.1 were, and check whether it changes a KPI tag here.
