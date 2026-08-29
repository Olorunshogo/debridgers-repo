# Tasks

The single engineering backlog, in shipping order. This file replaces the old
split between `TASKS.md` (the backlog) and `PLAN.md` (the sequence): they
carried two Done lists and two open lists that had to be hand-synced, and they
had already drifted apart. There is one list now, and its order is the plan.

The scorecard lives in `docs/jottings/KPI.md`. The business decisions that gate
several of these live in `docs/business/BusinessModel.md`.

**Only open work is described here.** Shipped work is one line under Done and
appears nowhere else. When something ships: cut its section, add the line.

**Audited against the code on 2026-08-29.**

---

## Done

- Cart sync on login, server cart, 2s debounce, higher quantity per line on merge
- Favourites, and Buy Again derived separately from order history
- Checkout and payment flow, `order_items` table, multi-product orders
- Product categories: three-level taxonomy with `parent_id`, real `category` column
- Delivery pricing as pure functions shared by the quote and the charge
- Checkout cascade: State to LGA to Zone to address, with a live quote
- Dialog engine, with `REQUEST_PAYOUT`, `AUTH_GATE` and `PAYMENT_METHOD`
- Checkout split into create-order then pay, method chosen in the modal
- Change password
- `system_settings` and the admin settings UI
- Commission rate read from `system_settings`, not the env var
- Agent-requested payouts, debit and pending row in one transaction
- Agent bank details against the live Paystack bank list
- Weekly agent payout cron, Fridays, plus a 15-minute order reconciliation cron
- Buyer wallet: schema, top-up, `wallet_transactions`, withdrawals
- Dedicated virtual account issuance per buyer
- Order lifecycle past confirmed: out for delivery, delivered, `delivered_at`
- Admin orders list and order detail endpoints
- Auth refactor: single-flight refresh, hooks in `ui-web`, 1728 lines to 602
- Shared currency formatting across 15 call sites
- Nigerian states dataset, 37 states and 774 LGAs
- Tables engine, with buyer orders and wallet moved onto it
- Automated tests: money paths, auth and pricing, on an isolated database
- Live Paystack round trip verified for checkout, withdrawals, virtual accounts
- Pricing repricing: 3% cost-to-serve fee with floor and cap, delivery at
  measured trip cost with a taper and per-drop cap, ₦25,000 minimum order
- Agent remit price from product price less banded commission, replacing the
  ₦1,300 flat rate that recorded ten bags of rice as ₦13,000 owed
- Catalogue unit sizes corrected to 100kg, millet listed, Chikun zone repaired
- `ComingSoon` component and the Procurement Targets page
- Backend refactor phases 0 to 3: stray build artefacts removed, payment logic
  consolidated into `api/v1/payment/`, `api/v1/wallet/` created with
  `AgentLedgerService`, DVA creation decoupled from persistence

---

## 1. Ship the repriced zone fees to production

The seeder carries ₦4,000 / ₦4,500 / ₦6,000. The production `zones` rows still
hold ₦500 / ₦700 / ₦800, so the repricing has only half landed: the fee code is
live but the zone bases it multiplies are the old ones.

Update the three rows directly. Nothing else depends on it.

---

## 2. Email notification listener gate

The column, DTO, and profile read/update all exist, but **no listener checks the
flag**, so the toggle is decorative. Gate the sends in `UserListeners` on
`users.email_notifications`.

Low effort, fully contained.

---

## 3. Unpaid order recovery

Splitting checkout into create-then-pay means an order can exist that nobody
paid for. That is a recoverable record of intent, not a leak, provided it is
handled deliberately.

**Do not redirect to payment on next login.** Someone logging in to check a
delivery gets shoved into a checkout they already walked away from, with no
obvious way out. It also breaks the signup path, where the intent was never
payment. Recovery is offered, not forced.

- [ ] Unpaid-order card on the buyer dashboard: amount, age, **Complete payment**
      and **Cancel order**
- [ ] Complete payment action on the orders list row, so a pending entry is not
      a mystery
- [ ] Reuse the `PAYMENT_METHOD` dialog, which already takes an order id and its
      totals
- [ ] Re-price on resume through the same `priceBasket` path. If the total
      moved, show old and new and make the buyer confirm. Silently charging a
      different number than the one shown is the failure to avoid; silently
      honouring a stale one is a slower version of the same problem
- [ ] Return an existing unpaid pending order with the same cart rather than
      inserting a duplicate
- [ ] `@Cron` to expire unpaid orders after 24 hours, `cancelled` with reason
      "not paid in time", in the same shape as the payout cron

---

## 4. Repeat last order, server persistence

`repeatLastOrder()` reads `debridgers_last_order` from localStorage, snapshotted
at checkout. Works per device; lost on a browser wipe or a device change.

**Backend.** `GET /buyer/orders/last/items` returns the line items of the most
recent confirmed order: join `orders` to `order_items` and `products`, filter by
`buyer_id`, order by `created_at DESC`, limit 1. Return `[]` when there are no
orders.

**Frontend, `buyer/overview.tsx`.** On mount when authenticated, call it, and if
non-empty write the result to `debridgers_last_order`. The existing
`repeatLastOrder()` needs no change. On failure, skip silently: the localStorage
snapshot still works.

---

## 5. Agent stock request, hierarchical UX

The page lists products flat. The three-level taxonomy now exists in the
database, so this is frontend work against data that is already there.

```
Step 1 - Category buttons:  [ Grains ]  [ Beans ]  [ Oil ]  [ Roots ]
Step 2 - Type pills:        [ Rice ]  [ Maize ]  [ Millet ]
Step 3 - Variety list:      Local White / Ofada / Tuwo
Step 4 - Inline stepper:    Local White  [ - ] [ 3 ] [ + ]  Add to Request
```

```typescript
interface StockSelectionState {
  activeCategoryId: string | null;
  activeTypeId: string | null;
  activeVarietyId: string | null;
  quantity: number;
}
```

UX notes: the category row scrolls horizontally on mobile without wrapping, and
active category and type need clear visual distinction.

**Blocked on a business decision.** Do not build the request flow until the agent
commission level is confirmed against a measured procurement spread. The bands
are locked in structure and provisional in level; see
`docs/business/BusinessModel.md`, Decision 4. Building the UX against a rate that
then drops is worse than waiting.

---

## 6. Commission and referral system

Largest feature left. Do not start before item 5 finishes.

**Re-cost the numbers before building.** The ₦500 flat referral discount and the
₦20 perpetual referral commission were set against a ₦1,400 product. Against a
₦42,000 bag, ₦500 is a 1.2% discount that will not motivate anyone, and ₦20 in
perpetuity is an unbounded liability for a trivial amount. Decide both against
real unit economics first.

**Columns** (`users`, migration needed):

```
referral_code:  varchar UNIQUE   Generated on activation. Format "DBR-<ULID-short>"
referred_by:    integer FK -> users.id, nullable
```

Only an admin-assigned `referred_by_agent_id` exists today.

**Order of work:**

| #   | What                                                  | Complexity |
| --- | ----------------------------------------------------- | ---------- |
| 1   | `referral_code` + `referred_by` columns and migration | Low        |
| 2   | Generate `referral_code` on user activation           | Low        |
| 3   | Capture `?ref=` on signup, persist `referred_by`      | Low        |
| 4   | Agent referral commission on a referred buyer's order | Medium     |
| 5   | `buyer_discounts` table and migration                 | Low        |
| 6   | Referral discount on the referee's first order        | Medium     |
| 7   | Apply the discount at checkout before Paystack init   | Medium     |
| 8   | `GET /buyer/discounts` and the checkout UI            | Low        |
| 9   | `/refer` landing page                                 | Medium     |
| 10  | Referral link in the buyer and agent dashboards       | Low        |

**Backend detail.** On signup, resolve `referred_by_code` to a user id. On
`charge.success` for a buyer order, if the buyer has `referred_by`, write a
`commissions` row with `type: "buyer_referral"`. `GET /agent/profile` must return
`referral_code`. The existing monthly cron only handles agent-recruits-agent
overrides.

**`/refer` page:** hero, how it works for buyers, how it works for agents with
the live rate from `/config/public`, and an FAQ covering limits, timing, and the
buyer versus agent distinction. Entry points in the landing header and both
dashboard sidebars.

---

## 7. Payment links

A shareable link that opens a prefilled checkout, so an order can be taken over
WhatsApp or by phone without the buyer navigating the shop.

**Blocked on guest checkout, which does not exist.** A payment link that forces a
signup is worthless, and the cart has no owner to key on before login. Decide how
a guest order attaches to a person afterwards before anything else here.

Then: a `payment_links` table (reference, cart contents, optional buyer, total,
status, expiry), create/read-by-reference/pay endpoints, a public route that
renders the itemised total through the same pricing path as checkout, and an
admin sidebar entry, which payment links do not currently have.

---

## 8. Product photography

Real photos per variety. Wake Gida looks nothing like cowpea, Ofada nothing like
long grain, and both garri products currently have no image at all because the
only unused bundled photos are of maize cobs.

A content and operations task, not an engineering one, and the last thing
blocking the catalogue from looking finished.

---

## 9. SMS notifications

The toggle is pure UI; no SMS service exists anywhere.

1. Choose a provider. Africa's Talking or Termii for Nigeria; Twilio otherwise
2. `SmsService` under `notification/features/sms/`
3. `users.sms_notifications boolean NOT NULL DEFAULT false`, plus migration
4. Wire it into the `updateProfile` DTO, service, and `getProfile`
5. Sends in `UserListeners` for order placed, out for delivery, and delivered.
   Only when `sms_notifications` is true **and** a phone number is on file
6. Frontend helper note: a phone number must be saved to receive SMS

---

## 10. Two-factor authentication

The toggle is pure UI; no TOTP implementation exists.

1. `users.two_factor_enabled boolean NOT NULL DEFAULT false` and
   `two_factor_secret text` nullable, plus migration
2. `otplib`
3. `POST /buyer/2fa/setup` generates the secret and returns a QR URL;
   `POST /buyer/2fa/verify-setup` confirms the first code and persists;
   `DELETE /buyer/2fa` disables, requiring a current code
4. `AuthService.login` returns `{ requires2fa: true, tempToken }` instead of
   tokens when enabled
5. `POST /auth/2fa/login` exchanges `tempToken` plus code for real tokens
6. Settings toggle opens a setup flow rather than flipping a boolean; disabling
   also requires a current code
7. Login page shows a second step when `requires2fa` comes back

Security-critical and not revenue-blocking, which is why it is this far down.

---

## 11. Auth rate limiting: add the email dimension

**Already built, and IP-only.** `@nestjs/throttler` is wired per endpoint through
`api/shared/throttle.config.ts`: 3 per minute on the most sensitive routes, 5 on
login and reset, 20 on referral-code lookup, with `AUTH_THROTTLE_LIMIT` as an
e2e override. There is an e2e spec at
`apps/debridgers-backend-e2e/src/debridgers-backend/rate-limit.spec.ts`.

**The gap is that throttling keys on the address alone.** One address trying
many emails is caught. One email tried from many addresses is not, and
credential stuffing takes exactly that shape.

Add a second counter so both are covered:

```
failed_attempts:<ip>            already covered by the throttler
failed_attempts:<email>:<ip>    missing
```

Redis is already in the stack, so this needs no new infrastructure. Count
failures rather than requests, so a legitimate user who mistypes once is not
treated like an attack.

---

## 12. Backend refactor, remaining phases

Phases 0 to 3 are done and listed under Done. What is left:

- **Move in-app notifications to a shared module.** `notifications.controller.ts`
  and `notifications.service.ts` still sit under `api/v1/buyer/`, with separate
  admin and agent controllers alongside. Relocate to
  `notification/features/in-app/`, drop the `@Roles("buyer")` gate, and serve
  `/notifications` for every role. **Check the frontend for hardcoded
  `buyer/notifications` paths before moving the route**
- **Replace hardcoded role strings with `USER_ROLES` constants.** 22 `@Roles("...")`
  literals remain against 10 uses of the constant
- **Event-driven login consistency.** `posthog.trackLogin` is called directly at
  two points in `auth.service.ts`. Move it into `UserListeners.onUserLoggedIn`
  and emit `USER_LOGGED_IN` from `loginAdmin`, which does not currently emit
- **Agent dedicated virtual accounts.** Needs a design doc: schema migration, the
  trigger point for issuance, and how it integrates with the refactored DVA
  service. Buyers have DVAs; agents do not

---

## Ongoing, not scheduled

- **Error handling.** Several `catch {}` blocks remain. Fold proper handling
  into whichever item touches the flow
- **Test coverage.** Money paths, auth and pricing are covered. The older
  endpoints are not
- **Dialog migrations.** Eight hand-rolled `fixed inset-0` modals remain.
  Migrate each as it is touched; `REQUEST_PAYOUT` is the reference
- **Agent commission to a product column.** Currently a name map in
  `agent-commission.ts`. Move to `products.agent_commission_kobo` once the
  catalogue outgrows a list you can read in one screen
- **Browser verification.** Most work is verified by typecheck, build, SSR HTML
  or API call. Little of it has been exercised visually or at 360px

---

## Copy to fix

Buyer virtual account, on failure to issue:

> We could not set up your account number just now. Use the card option below,
> or try again.

The "this account should exist already" case needs its own message. Retrying
against an account that was issued successfully is a different situation from
one that was never created, and telling both the same thing sends the buyer in
a loop.

---

## How to use this

Work top to bottom. If an item slips, slide the rest rather than reordering,
then check whether it moves a tier in `docs/jottings/KPI.md`. When something
ships, cut its section and add one line to Done.
