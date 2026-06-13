# Core Development Tasks (Remaining)

## Table of Contents

- [1. Cart Sync on Login](#1-cart-sync-on-login)
- [2. Shopping Cart Backend Sync](#2-shopping-cart-backend-sync)
- [3. Favorites / Wishlist](#3-favorites--wishlist)
- [4. Checkout and Payment Flow](#4-checkout-and-payment-flow)
- [5. Error Handling & Edge Cases](#5-error-handling--edge-cases)
- [6. Testing Scenarios](#6-testing-scenarios)
- [7. Product Catalog Structure](#7-product-catalog-structure)
- [8. Buyer Settings - Unimplemented Toggles](#8-buyer-settings--unimplemented-toggles)
- [9. Wallet & Payment](#9-wallet--payment)
- [10. Agent Stock Request - Hierarchical UX](#10-agent-stock-request--hierarchical-ux)
- [11. Admin Commission & Referral System](#11-admin-commission--referral-system)
- [12. Repeat Last Order - Server Persistence](#12-repeat-last-order---server-persistence)

---

## 1. Cart Sync on Login

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

For logged-in users, cart changes should sync to the backend so the cart survives across devices and browser clears.

### Strategy

- Debounce 3 seconds: every cart mutation resets a timer; after 3s of no changes, `PUT /cart` fires with the full current cart.
- On page unload (`beforeunload`), flush immediately without waiting for debounce.
- On error, retry once then fall back to localStorage.
- Show a subtle "saving..." indicator while sync is in flight.

---

## 3. Favorites / Wishlist

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

Orders are currently created immediately with no payment step - money is never collected.

### Option B - Pay per order via Paystack (recommended, ship first)

```
Buyer places order
→ POST /buyer/orders/initialize-payment
→ Backend calls Paystack initialize → returns authorization_url + reference
→ Frontend redirects buyer to Paystack
→ Paystack webhook: charge.success → create order with status "confirmed"
→ Buyer redirected back → show "Order confirmed" screen
```

**Backend changes:**

1. New endpoint `POST /buyer/orders/initialize-payment` - validate cart, call Paystack `transaction/initialize` with `metadata: { type: "buyer_order", cart: [...] }`, return `{ authorization_url, reference }`.
2. Paystack webhook: on `charge.success` with `metadata.type = "buyer_order"`, create the confirmed order, notify buyer.

**Frontend changes (`buyer/checkout.tsx`):**

1. On "Place Order", call initialize endpoint, redirect to `authorization_url`.
2. On Paystack callback URL, show confirmation screen, clear cart.

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

### 8.4 Change Password

Frontend is wired. Backend is missing:

1. `BuyerService`: add `changePassword(dto: { old_password, new_password }, user)` - fetch user, bcrypt compare old, hash new, update.
2. `BuyerController`: add `PATCH /buyer/password` guarded by `AuthGuard + RolesGuard("buyer")`. New DTO with min 8 chars validation.

| Feature                   | Backend missing                           | Complexity |
| ------------------------- | ----------------------------------------- | ---------- |
| Email notification        | Schema col, DTO, listener gate            | Low        |
| Change password endpoint  | Service method + endpoint                 | Low        |
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

Needed before anything in this section.

```
system_settings
  key:         varchar PRIMARY KEY
  value:       text
  updated_at:  timestamp
  updated_by:  integer FK -> users.id
```

Initial seed:

| key                            | value   | description                     |
| ------------------------------ | ------- | ------------------------------- |
| `agent_commission_rate`        | `30`    | Percentage agent earns per sale |
| `buyer_referral_discount_kobo` | `50000` | Flat ₦500 discount for referrer |
| `buyer_referral_discount_type` | `flat`  | `flat` or `percent`             |

**Backend needed:**

- `SystemSettingsService`: `getSetting(key)`, `setSetting(key, value, adminId)`, `getPublicConfig()`.
- `PaymentService`: replace `AGENT_COMMISSION_RATE` env with `SystemSettingsService.getSetting("agent_commission_rate")`.
- `GET /admin/settings` - all settings, admin auth.
- `PATCH /admin/settings` - update one key, admin auth, validate value.
- `GET /config/public` - safe subset, no auth. (Frontend already calls this.)

Note: the admin settings UI (`admin/settings.tsx`) is already built on the frontend.

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
