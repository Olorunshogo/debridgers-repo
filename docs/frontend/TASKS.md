# Core Development Tasks

Kept in sync with `docs/frontend/PLAN.md`. Anything here is either **open** or
**partially done with the gap named**. Completed items move to the Done list
below rather than being deleted, so the reasoning stays findable.

---

## Done

Verified against the code on 2026-07-27.

- **#1 Cart sync on login** - `POST /buyer/cart/merge`, higher quantity per line
  rather than the sum.
- **#2 Shopping cart backend sync** - `GET`/`PUT`/`DELETE /buyer/cart`, 2s
  debounce while authenticated, localStorage stays authoritative. No guest cart
  by design: an anonymous cart has no owner to key on.
- **#3 Favourites / wishlist** - `favorites` table, endpoints, optimistic heart,
  hidden for anonymous visitors. **Buy again** was split out separately as an
  order-history-derived rail.
- **#4 Checkout and payment flow** - `POST /buyer/orders/initialize-payment`,
  `order_items` table (it did not exist, which is why this was broken), the
  `buyer_order` webhook branch, and `FRONTEND_URL`. `PAYMENTS_SIMULATED=true`
  stands in until Paystack credentials exist.
- **#8.4 Change password** - shipped earlier.
- **#11.1 system_settings / admin settings** - shipped earlier; the
  commission-rate wiring was closed on 2026-07-30.

Also shipped and not originally in this file: product categories, per-package
delivery pricing with a per-zone free-delivery flag, the State to LGA to Zone
checkout cascade, the dialog engine with two consumers, agent-requested payouts,
the auth refactor with single-flight refresh, shared currency formatting, and a
Nigerian states dataset.

---

## Partially done - gap named

Nothing outstanding from the previous list. All five items below were closed on
2026-07-30; see the Done section for what each turned out to involve.

---

## Closed 2026-07-30

Each of these was flagged partial. Working through them surfaced four separate
dead links where a feature existed on both sides but nothing joined them.

- **#5 Error handling** - the description was stale: no truly empty `catch {}`
  blocks remained. What did remain were five catches whose body was
  `// silently fail` (admin products x2, admin outreach, agent settings, buyer
  settings). All now surface a message. Two admin list loads were also swallowing
  failures and rendering an empty table, which reads as "no records" rather than
  "load failed". Two catches that are empty on purpose were left alone with their
  reasons documented.

- **#7 Product catalog** - replaced the flat `category` text with a
  `product_categories` tree (migration `0015_product_taxonomy`). Self-referencing
  rather than three fixed tables, because the catalogue is not uniformly three
  deep: Grains reaches Grains > Rice > Ofada, Oil stops at Oil > Palm Oil. The
  agent stock page now drills to whatever depth a branch has instead of grouping
  products by their **description** text, which is what it was actually doing.
  `products.category` is retained and derived from the root ancestor so the shop
  filter keeps working.
  - Found on the way: `createProduct` and `updateProduct` never persisted
    `category`, `measure_value` or `measure_unit`. The DTO accepted them and the
    form sent them; the insert dropped them. So "category exists" was only ever
    half true.
  - Also fixed: `updateProduct`'s `image_url` used `z.string().url()`, rejecting
    bundled `/images/...` paths. A product with a bundled image could be created
    but never edited. The create DTO already documented this exact fix.

- **#8.1 Email notification toggle** - `UserListeners` now checks the flag before
  optional mail. Account and security mail (welcome, verification, password
  reset, agent application outcomes) always sends. Worth stating plainly: there
  are still **no order or delivery emails anywhere**, so the toggle governs only
  sign-in notices and contact confirmations. It is honest now rather than
  decorative, but it stays thin until order-lifecycle email exists.

- **#9.2 Agent wallet** - the payout request was not merely incomplete, it was
  **impossible to use**. `agent_profiles.bank_code` had no write path anywhere in
  the codebase, and `requestWithdrawal` requires it to be non-null, so every
  agent got "Add your bank details in settings" against a settings page with no
  such field. Added `GET /agent/banks`, `POST /agent/bank-details/resolve`,
  `PATCH /agent/bank-details`, a bank picker on the wallet page, `bank_code` in
  the KYC flow, and `POST /admin/agents/backfill-bank-codes` for existing agents.
  Account names come from the provider's name-enquiry, never from the client.
  - The provider is **SafeHaven, not Paystack** - this file previously said
    Paystack. `getBanks()` and `nameEnquiry()` already existed and were unused.
  - Second dead link: nothing could approve a withdrawal. `POST /payment/payout/:id`
    requires status `approved`, but no endpoint moved a row off `pending`. Added
    `GET /admin/withdrawals` and approve/reject, where reject returns the balance
    the request had debited up front.

- **#11.1 commission rate** - `SystemSettingsService` now exists (this file
  previously referred to it as though it did; settings were actually read by
  inline queries in four places). `PaymentService` reads the rate at call time
  instead of caching it in its constructor.
  - Unit mismatch worth knowing: the setting is stored as a **percentage**
    (1-100, validated in `updateSetting`) while payment code needs a
    **fraction**. Wiring them naively would have multiplied every commission by
    a hundred. The conversion lives in one place, `getAgentCommissionRate()`.
  - `createSubaccount` was posting a hardcoded `settlement_bank: "058"` and
    `account_number: "0000000000"`, creating subaccounts that could never settle.
    It now uses the agent's real details and refuses if they are absent.

### Also added

- **Admin payouts page** (`/admin-dashboard/payouts`). The approve/reject
  endpoints existed with no interface behind them, so the queue still had no
  exit in practice. Lists requests by status, approves, rejects with a reason
  (stating that the amount goes back to the agent), and can trigger the weekly
  sweep on demand rather than waiting for Friday.
- **`PlatformConfigContext`** - one fetch of `/config/public`, shared. It exposes
  the commission as **both** `commissionPercent` (5, for display) and
  `commissionRate` (0.05, for maths), because the percentage/fraction ambiguity
  already caused one real bug server-side.
  - `landing/agents.tsx` previously defaulted to a hardcoded rate while its own
    fetch was in flight, overstating the earnings table on the page whose whole
    purpose is stating what agents earn. It now shows a skeleton until the live
    figure arrives.
  - That page's SEO metadata also hardcoded a commission figure in its title,
    description, keywords and social cards. `meta()` is static and the rate is an
    admin setting, so the figure was removed rather than left to go stale again.
- **Migration `0016`** pushes products from their type node down onto their
  variety leaf, so the grains branch actually drills three levels. `0015` could
  only match on the old flat text and stopped at the type. Deliberately skips
  ambiguous names: "Wake Gida (Honey Beans)" names two varieties and stays on
  Beans rather than being guessed at. Verified idempotent.

- Weekly payout cron (`PayoutService`, Friday 09:00 `Africa/Lagos`), which the
  wallet page had always advertised but nothing performed. It pays only
  already-approved withdrawals; approval stays human. `processWithdrawal` gained
  an atomic claim so an admin clicking payout during the sweep cannot double-pay,
  and the transfer reference is now deterministic so a retry cannot pay twice.
- `DashSelectInput` rebuilt with `AnimatePresence`, keyboard navigation and an
  `isBank` mode that adds search, for bank lists that run to hundreds of entries.

---

## Open

## 1. Cart Sync on Login

> **DONE.** Kept for the merge-logic reasoning. See the Done list above.

Cart browsing works (localStorage). The missing piece is merging the guest cart into the user's backend cart when they log in.

### What's missing

- On login success, fetch `GET /cart` from backend, merge with current localStorage cart (take max qty per item), then `PUT /cart` with merged result, then clear localStorage cart.
- On app init for authenticated users, load cart from `GET /cart` instead of localStorage.
- On logout, persist the current cart to localStorage so it survives.

### Merge logic

```
localStorage cart: [itemA x2, itemB x1]
backend cart on login: [itemA x1, itemC x3]
merged: [itemA x2, itemB x1, itemC x3]   ← take max qty
PUT /cart with merged result
Clear localStorage cart
```

### Backend endpoints needed

- `GET /cart` - fetch user's saved cart
- `PUT /cart` - replace full cart (idempotent)
- `DELETE /cart` - clear cart on order completion

---

## 2. Shopping Cart Backend Sync (Authenticated Users)

> **DONE.** Kept for the strategy notes. See the Done list above.

For logged-in users, cart changes should sync to the backend so the cart survives across devices and browser clears.

### Strategy

- Debounce 3 seconds: every cart mutation resets a timer; after 3s of no changes, `PUT /cart` fires with the full current cart.
- On page unload (`beforeunload`), flush immediately without waiting for debounce.
- On error, retry once then fall back to localStorage.
- Show a subtle "saving..." indicator while sync is in flight.

---

## 3. Favorites / Wishlist

> **DONE**, and split into favourites plus a separate buy-again rail.

Not started. No backend endpoints, no UI, no heart icon on product cards.

### What's needed

**Backend:**

- `GET /favorites` - list all favorites
- `POST /favorites/:productId` - add
- `DELETE /favorites/:productId` - remove
- `POST /favorites/batch` - bulk add on login (for guest merge)

**Frontend:**

- Heart/bookmark icon on each product card (optimistic toggle)
- Guest favorites stored as product ID array in localStorage
- On login: batch merge localStorage favorites with backend, then clear localStorage
- "My Favorites" page or drawer in dashboard

---

## 4. Checkout and Payment Flow

> **DONE.** The status below is superseded - checkout is built and the
> root cause was a missing `order_items` table, not just a missing route.

### Status: RESOLVED (was: BROKEN - frontend/backend contract mismatch)

`buyer/checkout.tsx` calls `POST /buyer/orders/initialize-payment` with `{ delivery_address, delivery_time, notes, cart: [{ product_id, name, price_kobo, unit, qty }] }`, expects `authorization_url` back, redirects to it, then on Paystack callback (`?trxref=...`) clears cart, snapshots to `debridgers_last_order`, and shows the confirmed screen.

That endpoint did not exist. `buyer.controller.ts` had only `POST orders` / `GET orders`, and the sole payment-initialize route was `payment.controller.ts > POST payment/initialize`, built for the agent stock-request flow (requires `agent_id`, validated against an approved agent) and unable to accept a buyer cart payload. Checkout 404'd.

**Why it had never been built:** there was no `order_items` table and no `product_id` on `orders`. The orders table stored `quantity`, `unit_price` and a total but never recorded _what_ was bought, because the schema was shaped for the single-product field flow. A multi-product buyer cart was unrepresentable, so the route could not be written against that schema. `order_items` was added and existing orders backfilled by matching `unit_price` to a product price.

### Backend needed

```
Buyer places order
→ POST /buyer/orders/initialize-payment
→ Backend calls Paystack initialize → returns authorization_url + reference
→ Frontend redirects buyer to Paystack
→ Paystack webhook: charge.success → create order with status "confirmed"
→ Buyer redirected back → confirmed screen already handled on frontend
```

1. New endpoint `POST /buyer/orders/initialize-payment` (auth: buyer) - accept `{ delivery_address, delivery_time, notes, cart }`, look up buyer email from JWT, call Paystack `transaction/initialize` with `{ email, amount, callback_url: FRONTEND_URL + "/buyer-dashboard/checkout", metadata: { type: "buyer_order", cart, delivery_address, delivery_time, notes } }`, return `{ data: { authorization_url, reference } }`.
2. Paystack webhook (`payment.service.ts > handleWebhook`): on `charge.success` where `metadata.type === "buyer_order"`, create the order row + order_items rows, notify buyer via email.
3. Set `FRONTEND_URL` env var on backend so the callback URL is correct per environment.

### Option A - Pay from wallet (later, after buyer wallet exists)

```
Buyer tops up wallet → balance stored in DB
At checkout → deduct balance → create order as "confirmed"
If balance insufficient → prompt top-up
```

---

## 5. Error Handling & Edge Cases

- **Session expiry during checkout** - detect expired token, show re-auth modal, preserve cart and checkout progress.
- **Network errors** - user-friendly messages on API failure, allow retry, keep modal open.
- **Cart limits** - max quantity per item, out-of-stock handling, price change detection.
- **localStorage unavailable** - fall back to in-memory cart, warn on incognito mode.

---

## 6. Testing Scenarios

> **NOT RUN.** No automated test covers any of the new endpoints; everything
> shipped was verified by hand. This is the largest quality gap in the repo.

### Happy path

- [ ] Browse shop without authentication
- [ ] Add items to cart
- [ ] Click checkout → auth modal appears
- [ ] Sign up → cart remains intact → proceed to payment
- [ ] Log in instead of signing up → same result

### Alternative path

- [ ] Update quantities before checkout
- [ ] Remove items from cart
- [ ] Abandon checkout and return later (cart persists)

### Error cases

- [ ] Signup with invalid email / weak password
- [ ] Login with wrong credentials
- [ ] Session expires during checkout
- [ ] Network error during signup
- [ ] localStorage unavailable

---

## 7. Product Catalog Structure

Kept as reference - both shop and agent stock request consume this.

### Two-tier model: Category → Variety

```
Category: Grains
  Variety: Rice - Local White, Ofada, Tuwo, Long Grain
  Variety: Beans - Wake Gida, Cowpea, Soya Beans, Ameria, Honey Beans
  Variety: Garri - White, Yellow (toasted), Ijebu

Category: Oil
  Palm Oil, Groundnut Oil, Vegetable Oil

Category: Tubers
  Yam, Irish Potato, Sweet Potato
```

### Per-variety data shape

```typescript
interface ProductVariety {
  id: string;
  slug: string;
  name: string;
  categoryId: string;
  images: string[];
  pricePerUnit: number;
  unit: "bag" | "kg" | "litre" | "keg" | "tuber" | "crate";
  unitSizes: string[];
  description: string;
  inStock: boolean;
  featured?: boolean;
}
```

### Notes

- Images per variety are critical - Wake Gida looks different from cowpea, Ofada from long grain. Get real photos.
- Pricing is at variety level, not category level.
- The shop catalog and homepage "What We Deliver" cards share the same underlying data.

---

## 8. Buyer Settings - Unimplemented Toggles

### 8.1 Email Notification Toggle

Frontend hydrates and sends the toggle correctly. Backend is missing:

1. `users` table: add `email_notifications boolean NOT NULL DEFAULT true` column + migration.
2. `updateProfile` DTO: add `email_notifications?: boolean`.
3. `BuyerService.updateProfile`: include `email_notifications` in updates.
4. `BuyerService.getProfile`: return `email_notifications` in profile response.
5. `UserListeners` / `EmailService`: before every transactional email to a buyer, check `email_notifications` flag and skip if `false`. Welcome and verification emails always send.

### 8.2 SMS Notification Toggle

Toggle is pure UI - no SMS service exists anywhere.

1. Choose SMS provider: Africa's Talking (recommended for Nigeria), Termii, or Twilio.
2. Build `SmsService` under `notification/features/sms/`.
3. `users` table: add `sms_notifications boolean NOT NULL DEFAULT false` + migration.
4. Wire `sms_notifications` into `updateProfile` DTO + service + `getProfile`.
5. Add SMS sends in `UserListeners` for order placed, out-for-delivery, delivered events. Only send if `sms_notifications === true` AND user has a `phone` on file.
6. Frontend: show helper note "You must have a phone number saved to receive SMS."

### 8.3 Two-Factor Authentication Toggle

Toggle is pure UI - no TOTP implementation exists.

1. `users` table: add `two_factor_enabled boolean NOT NULL DEFAULT false` and `two_factor_secret text` (nullable) + migration.
2. Install `otplib` for TOTP.
3. New endpoints:
   - `POST /buyer/2fa/setup` - generate TOTP secret, return QR code URL.
   - `POST /buyer/2fa/verify-setup` - confirm first TOTP code, persist secret, set `two_factor_enabled = true`.
   - `DELETE /buyer/2fa` - disable (requires current TOTP code).
4. `AuthService.login`: if `two_factor_enabled`, do NOT return tokens - return `{ requires2fa: true, tempToken }`.
5. New `POST /auth/2fa/login` - accepts `tempToken` + `totpCode`, verifies, issues real tokens.
6. Frontend settings: clicking toggle opens setup flow (QR code + confirm code), not just a boolean flip. Disabling also requires entering current TOTP code.
7. Frontend login page: if `requires2fa` returned, show second step for TOTP code.

| Feature                   | Backend missing                           | Complexity |
| ------------------------- | ----------------------------------------- | ---------- |
| Email notification        | Schema col, DTO, listener gate            | Low        |
| SMS notifications         | Full SMS provider + schema + listeners    | High       |
| Two-factor authentication | Full TOTP flow + 3 endpoints + login step | High       |

---

## 9. Wallet & Payment

### 9.1 Buyer Wallet - Not Built

Balance is hardcoded to 0. "Add Funds" is disabled/fake. No `GET /buyer/wallet` endpoint exists. No buyer row in the `wallets` table.

**Backend needed:**

1. Create `buyer_wallets` table: `id, buyer_id FK, balance_kobo, total_funded_kobo, updated_at`. Create row on buyer registration.
2. `GET /buyer/wallet` - return `{ balance_kobo, total_funded_kobo }`.
3. `POST /buyer/wallet/topup/initialize` - accepts `{ amount_kobo }`, calls Paystack `transaction/initialize`, returns `{ authorization_url, reference }`.
4. Paystack webhook: on `charge.success` with `metadata.type = "buyer_topup"`, credit buyer wallet.
5. `wallet_transactions` table: `id, wallet_id, type (credit|debit), amount_kobo, description, reference, created_at`. Credit on top-up, debit on order.

**Frontend (`buyer/wallet.tsx`):**

- Fetch from `GET /buyer/wallet` for real balance.
- "Add Funds" calls initialize endpoint, redirects to `authorization_url`.
- Show real credit/debit history from transaction log.

### 9.2 Agent Wallet - Bank Details & Payout Missing

`GET /agent/wallet` and commissions work. Missing:

1. `PATCH /agent/bank-details` - accepts `{ bank_code, account_number }`, verifies via Paystack account resolution API, updates profile and Paystack subaccount. Currently hardcoded to `"0000000000"`.
2. Payout cron job (`@Cron`, every Friday 9am Nigeria time):
   - Find agents with `pending_balance > 0` and approved Paystack subaccount.
   - Call Paystack `POST /transfer`.
   - On success, move pending to available balance, record payout transaction.
3. Frontend `agent/wallet.tsx`: replace "Contact admin" placeholder with bank name (from Paystack bank list) + account number form. Show resolved account name before saving.

---

## 10. Agent Stock Request - Hierarchical UX

Current page lists products flat. Goal: three-level drill-down.

### Desired flow

```
Step 1 - Category buttons (always visible):  [ Grains ]  [ Oil ]  [ Tubers ]

↓ click "Grains"

Step 2 - Type pills appear below:  [ Beans ]  [ Rice ]  [ Garri ]

↓ click "Beans"

Step 3 - Variety list (inline accordion):
  Wake Gida
  Cowpea
  Soya Beans

↓ select "Wake Gida"

Step 4 - Inline qty stepper appears:
  Wake Gida  [ - ]  [ 3 ]  [ + ]   Add to Request
```

### State shape

```typescript
interface StockSelectionState {
  activeCategoryId: string | null;
  activeTypeId: string | null;
  activeVarietyId: string | null;
  quantity: number;
}

interface RequestLineItem {
  varietyId: string;
  varietyName: string;
  typeName: string;
  categoryName: string;
  unit: string;
  quantity: number;
}
```

### UX notes

- Category row: horizontally scrollable on mobile, no wrapping.
- Active category and type have clear visual distinction.
- Type is an accordion toggle - clicking active type collapses it.
- Already-added varieties show a checkmark.
- Running request list at bottom (sticky or collapsible sheet) with remove option.
- File to modify: `apps/debridgers-frontend/app/routes/dashboards/agent/request-stock.tsx`

---

## 11. Admin Commission & Referral System

### 11.1 Backend - system_settings Table

`system_settings` table, `SystemSettingsService`, `GET`/`PATCH /admin/settings`, and `GET /config/public` are all built. The admin settings UI (`admin/settings.tsx`) is wired on the frontend.

### What's still missing

- `PaymentService` still reads the agent commission rate from the `AGENT_COMMISSION_RATE` env var, not from `SystemSettingsService.getSetting("agent_commission_rate")`. Wire it to the DB-backed setting so admin changes actually take effect.
- Seed rows for `buyer_referral_discount_kobo` (`50000`) and `buyer_referral_discount_type` (`flat`) - needed once section 11.4 (buyer referral discounts) is built.

### 11.2 Referral Tracking Columns

`users` table additions (migration needed):

```
referral_code:   varchar UNIQUE    Generated on account activation. Format: "DBR-<ULID-short>"
referred_by:     integer FK -> users.id (nullable)
```

### 11.3 Agent Referral System

Agent earns commission when a referred buyer places an order.

**Backend:**

1. `POST /auth/signup`: if `referred_by_code` in body, resolve to user ID, persist as `users.referred_by`.
2. Paystack webhook: on `charge.success` for buyer order, check if buyer has `referred_by`. If so, create `commissions` row with `type: "buyer_referral"`.
3. `GET /agent/profile` must return `referral_code`.

**Frontend:**

- Show agent's referral link in `agent/overview.tsx` or `agent/wallet.tsx` with copy-to-clipboard button.

### 11.4 Buyer Referral System

Buyer earns a discount (not cash) when a referred friend places their first order.

**Backend:**

1. New `buyer_discounts` table:
   ```
   id, buyer_id FK, amount_kobo, reason, status (pending|applied|expired),
   expires_at, order_id FK (nullable), created_at
   ```
2. Paystack webhook: on `charge.success` for buyer order, if it is the buyer's first order AND buyer has `referred_by`, create a `buyer_discounts` row for the referrer. Notify referrer.
3. Checkout flow: before calling Paystack initialize, query `buyer_discounts` for pending discounts. If one exists, subtract from total. Mark as `applied` after Paystack confirms.
4. `GET /buyer/discounts` - pending discounts for authenticated buyer.

**Business rules:**

- One discount per referral (only on referee's first order).
- Discounts stack if multiple referrals - apply oldest first at checkout.
- Discount cannot bring total below ₦0; remainder is forfeited.
- 90-day expiry.

**Frontend:**

- Show buyer's referral link in `buyer/overview.tsx` or `buyer/settings.tsx` with copy button and explanation.
- Checkout shows pending discount if available.

### 11.5 /refer Landing Page

New route: `apps/debridgers-frontend/app/routes/landing/refer.tsx`

**Sections:**

1. Hero - "Invite a friend, both of you win."
2. For Buyers - how it works (3 steps), ₦500 discount, 90-day expiry note, CTA.
3. For Agents - how it works (3 steps), live commission rate from `/config/public`, CTA.
4. FAQ - limits, timing, buyer vs agent distinction.

**Navigation entry points:**

- Landing page header nav.
- Buyer dashboard sidebar.
- Agent dashboard sidebar under Wallet section.

### 11.6 Implementation Order

| Step | What                                                | Complexity |
| ---- | --------------------------------------------------- | ---------- |
| 1    | `system_settings` table + migration                 | Low        |
| 2    | `SystemSettingsService` + `GET /config/public`      | Low        |
| 3    | `PATCH /admin/settings` endpoint                    | Low        |
| 4    | Wire `PaymentService` to `system_settings`          | Low        |
| 5    | `referral_code` + `referred_by` columns + migration | Low        |
| 6    | Generate `referral_code` on user activation         | Low        |
| 7    | Capture `?ref=` on signup, persist `referred_by`    | Low        |
| 8    | Agent referral commission on referred buyer order   | Medium     |
| 9    | `buyer_discounts` table + migration                 | Low        |
| 10   | Buyer referral discount on referee's first order    | Medium     |
| 11   | Apply discount at checkout before Paystack init     | Medium     |
| 12   | `GET /buyer/discounts` + checkout UI                | Low        |
| 13   | `/refer` landing page                               | Medium     |
| 14   | Referral link in buyer + agent dashboards           | Low        |

---

## 12. Repeat Last Order - Server Persistence

The "Repeat Last" quick action on the buyer overview currently reads from `debridgers_last_order` in localStorage, which is snapshotted from `debridgers_cart` at checkout. This works per-device but is lost if the browser data is cleared or the user switches devices.

### What's missing

**Backend:**

1. New endpoint `GET /buyer/orders/last/items` - returns the line items of the buyer's most recent confirmed order:
   ```json
   [
     {
       "product_id": 3,
       "name": "Rice - Local White",
       "price_kobo": 250000,
       "unit": "50kg bag",
       "qty": 2
     },
     {
       "product_id": 7,
       "name": "Palm Oil",
       "price_kobo": 80000,
       "unit": "keg",
       "qty": 1
     }
   ]
   ```
   Query: join `orders` with `order_items` and `products`, filter by `buyer_id`, order by `created_at DESC`, limit 1.
   Returns `[]` if the buyer has no orders yet.

**Frontend (`buyer/overview.tsx`):**

1. On mount (authenticated), call `GET /buyer/orders/last/items`.
2. If the result is non-empty, map to `CartItem[]` and write to `localStorage.setItem("debridgers_last_order", JSON.stringify(items))`.
3. The existing `repeatLastOrder()` function already reads from `debridgers_last_order` and copies it to `debridgers_cart`, so no other changes needed.

### Notes

- The localStorage snapshot at checkout (`checkout.tsx`) remains as an immediate fallback for the session in which the order was just placed, before the next app load.
- If the API call fails, silently skip - the localStorage snapshot (if present) still works.
- The `order_items` table must exist and be populated when orders are created. Verify the backend's `POST /buyer/orders` is writing line items, not just the order header.

## Others

### Buyers

- Transfer to your account

Money sent here lands in your wallet automatically.

We could not set up your account number just now. Use the card option below, or try again.

> Try again. This ccount should exist already
