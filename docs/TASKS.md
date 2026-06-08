# Core Development Tasks

## 0. Shop/Catalog on Landing Page — Browse Free, Login Only at Checkout

> **Decision confirmed 2026-06-08**

The shop/catalog will live on the **public landing page**, not behind the buyer dashboard login. Anyone can browse products and add items to cart without an account. Login is only required at the moment they proceed to checkout and payment.

### The Flow

```
Landing page → /shop (public, no auth)
  ↓
User browses products, adds to cart
  ↓
User clicks "Checkout" or "Place Order"
  ↓
App checks: is user logged in?
  ├── YES → go straight to checkout/payment
  └── NO  → show Login / Sign Up modal
              ↓ on success
           Cart is preserved, proceed to checkout
```

### What This Means for Implementation

- `GET /buyer/products` must be accessible **without a token** (make it a public endpoint — remove `AuthGuard` from that one route, or create a separate public products endpoint).
- The `/shop` route on the landing page uses the **landing page layout**, not the buyer dashboard layout.
- Cart state lives in **localStorage** for unauthenticated users. On login, merge it into the user's backend cart.
- The buyer dashboard `/buyer-dashboard/shop` route can be kept as a shortcut into the same shop page for already-logged-in users, or removed once the landing page shop is live.
- The "Login / Sign Up" prompt at checkout is a **modal** (not a full redirect), so the cart and the page context are preserved when the user comes back.

### Auth Gate: Only These Actions Require Login

| Action                             | Auth required? |
| ---------------------------------- | -------------- |
| Browse products                    | No             |
| Add to cart                        | No             |
| View cart                          | No             |
| Proceed to checkout                | Yes            |
| Place order (`POST /buyer/orders`) | Yes            |
| View order history                 | Yes            |
| Access buyer dashboard             | Yes            |

### Related Tasks

- Section 1 — extracting the shop component and landing page route
- Section 2 — cart implementation (localStorage for guests)
- Section 5 — checkout authentication modal
- Section 6 — cart preservation across login

---

## 1. Move Shop/Buyer from Dashboard to Landing Page

### 1.1 Extract Shop/Buyer Component

- **Goal**: Move the product shop/buyer interface from the buyer dashboard to the landing page
- **Location**: Currently at `/apps/debridgers-frontend/app/routes/dashboards/buyer/shop`
- **Target**: Create a new route `/apps/debridgers-frontend/app/routes/landing/shop`
- **Considerations**:
  - Ensure the component is self-contained and doesn't depend on dashboard-specific layouts
  - Review any dashboard-only styling or state management
  - Maintain all product browsing, filtering, and selection functionality
  - Should work standalone without requiring user authentication at this stage

### 1.2 Update Landing Page Navigation

- **Goal**: Add shop/buyer access to the landing page
- **Actions**:
  - Add navigation link or CTA button to shop from landing page
  - Integrate shop route into landing page routing structure
  - Ensure visual consistency with landing page design system

### 1.3 Shopping Cart State Management

- **Goal**: Implement cart persistence across pages
- **Requirements**:
  - Cart should be accessible from landing page and shop routes
  - Cart state should survive navigation and page refreshes
  - Cart should maintain state even before user authenticates
  - **Implementation Options**:
    - Store in localStorage for persistence
    - Use React Context API with localStorage sync
    - Consider using Zustand or similar for global state

---

## 2. Shopping Cart Implementation

### 2.1 Cart UI Components

- **Goal**: Create cart management interface
- **Components Needed**:
  - Cart badge/icon showing item count
  - Cart drawer/modal to view items
  - Item quantity controls (increment/decrement)
  - Remove item from cart functionality
  - Cart total calculation
  - "Proceed to Checkout" button

### 2.2 Cart Data Structure

- **Schema** (minimum):

  ```typescript
  interface CartItem {
    productId: string;
    productName: string;
    price: number;
    quantity: number;
    image?: string;
    [key: string]: any; // Additional product fields
  }

  interface Cart {
    items: CartItem[];
    lastUpdated: timestamp;
  }
  ```

### 2.3 Cart Persistence Strategy — Full Analysis

#### Storage Option Comparison

| Option               | Survives Device Shutdown       | Cross-Device   | Cleared by User          | Auth Required | Notes                                  |
| -------------------- | ------------------------------ | -------------- | ------------------------ | ------------- | -------------------------------------- |
| `sessionStorage`     | ❌ Clears on tab/browser close | ❌             | N/A                      | No            | Worst option for cart                  |
| `localStorage`       | ✅ Persists through shutdowns  | ❌ Device-only | Yes (clear browser data) | No            | Good for guests                        |
| Cookie (session)     | ❌ Clears on browser close     | ❌             | Yes                      | No            | No advantage over sessionStorage       |
| Cookie (persistent)  | ✅ Up to expiry date           | ❌             | Yes                      | No            | 4KB limit, not practical for cart data |
| **Backend endpoint** | ✅ Always                      | ✅ Any device  | Never (server-stored)    | ✅ Yes        | Best for authenticated users           |

#### Recommended: Hybrid Approach

```
Unauthenticated user  → localStorage cart (fast, no API calls needed)
Authenticated user    → Backend cart endpoint (persists everywhere)
On login/signup       → Merge localStorage cart INTO backend cart → clear localStorage
```

This gives the best UX:

- Guest browsing is fast (no API on every add)
- Logged-in users get their cart on any device, any browser, after any reset
- Cart survives device shutdown, browser clear, new device login

#### Why Not Cookie-Only?

- Cookies max out at 4KB — a cart with images/metadata blows that fast
- httpOnly cookies can't be read by JS, defeating cart state management
- Persistent cookies still don't solve the cross-device problem

#### Debounced Batch Sync Strategy (for authenticated users)

Rather than hitting the cart endpoint on every single interaction (every add, every qty change), debounce the sync:

```
User adds item → update local state immediately (optimistic UI)
                 ↓
         start/reset 3s debounce timer
                 ↓
         3 seconds of no changes?
                 ↓
         PATCH /cart with full current cart state → server confirms
```

**Advantages of debounce approach:**

- ✅ UI feels instant (no waiting for API response)
- ✅ Reduces API load massively (1 call per "session of changes" vs 1 per action)
- ✅ If user adds 5 items quickly, only 1 API call goes out
- ✅ On page unload, flush immediately (don't wait for debounce)

**Considerations:**

- Need to handle the race condition: if user closes tab mid-debounce, use `beforeunload` to flush
- Show a subtle "saving..." indicator so user knows it's syncing
- On error, retry once then fall back to localStorage backup

#### Cart Endpoint Design

- `GET /cart` — fetch user's saved cart (on login)
- `PUT /cart` — replace entire cart (debounced batch update, sends full cart state)
- `DELETE /cart` — clear cart (on order completion or user action)

Using `PUT` with full cart state (not individual `POST/DELETE` per item) is simpler and idempotent — the debounce just sends whatever the current state is. No need for per-item endpoints.

#### Pre-login Cart Merge Logic

```
1. User has localStorage cart: [itemA x2, itemB x1]
2. User logs in → fetch their backend cart: [itemA x1, itemC x3]
3. Merge: itemA → take max qty (x2), itemB → add, itemC → add
4. Result: [itemA x2, itemB x1, itemC x3]
5. PUT /cart with merged cart
6. Clear localStorage cart
```

- **Storage**: localStorage for guests, backend for authenticated users
- **Sync**: Debounced 3s batch sync to backend when authenticated
- **Recovery**: On login, `GET /cart` from backend; on app init (guest), load from localStorage
- **Expiration**: Backend cart: 30 days TTL server-side; localStorage: 7-day TTL check on load

---

## 1.4 Landing Outreach / Lead Capture Page

> **Context:** The admin dashboard already has a fully working outreach page at
> `apps/debridgers-frontend/app/routes/dashboards/admin/outreach.tsx`.
> That page is for internal staff to log OFFLINE field visits (agents going door-to-door
> and recording shops/leads they spoke with). The landing page version is the PUBLIC-FACING
> counterpart: potential customers, sellers, or distributors submitting their interest ONLINE
> directly, without needing an agent to record it for them.

### 1.4.1 Purpose and Distinction

|                  | Admin Outreach Page                                      | Landing Outreach Page                                |
| ---------------- | -------------------------------------------------------- | ---------------------------------------------------- |
| Who fills it     | Internal staff / field agents                            | Public visitors (leads)                              |
| Auth required    | Yes (admin dashboard)                                    | No (public landing page)                             |
| Endpoint         | `POST /admin/outreach`                                   | `POST /outreach/submit` (new public endpoint)        |
| Purpose          | Log a visit that already happened                        | Capture self-generated interest online               |
| Data collected   | Full field visit data (who collected, visit date, notes) | Simplified - name, phone, location, product interest |
| Visible to admin | Yes, in outreach records table                           | Yes, should feed into same or adjacent table         |

### 1.4.2 What the Landing Outreach Page Should Include

**Route:** `/routes/landing/outreach.tsx` (or integrate into `/contact` if that makes more sense UX-wise)

**Page goal:** "Register your interest" / "We come to you" lead capture form

**Form fields (public-facing, simplified from admin version):**

- Full name (required)
- Phone number (required)
- Business / shop name (optional)
- LGA - Local Government Area (reuse `kadunaLgas` model, already exists)
- Area (dependent on LGA, reuse `kadunaAreasByLga`)
- Products interested in (text input - same as admin version)
- Estimated quantity needed (optional)
- How they heard about us (optional: dropdown - "Word of mouth", "Social media", "Flyer/Ad", "Agent visit", "Other")
- Notes / message (optional textarea)

**What happens on submit:**

- `POST /outreach/submit` (public, no auth token required)
- Show success confirmation ("We've received your information. An agent will reach out to you within 24 hours.")
- No delete or list functionality on the public page

### 1.4.3 Admin Side - Viewing Public Submissions

- Public submissions from the landing page should appear in the admin outreach table
- Either: same `/admin/outreach` endpoint returns both (server adds a `source: "web"` vs `source: "field"` field)
- Or: separate tab/filter in the admin outreach page for "Web Leads" vs "Field Visits"
- Recommended: add a `source` column to the outreach records table and filter by it in the admin UI

### 1.4.4 Existing Admin Outreach Data Structure (for reference)

From `admin/outreach.tsx`, the `OutreachRecord` interface:

```typescript
interface OutreachRecord {
  id: number;
  shop_name: string;
  owner_name: string | null;
  phone: string | null;
  lga: string | null;
  area: string | null;
  address: string | null;
  product_interest: string | null;
  quantity: number | null;
  notes: string | null;
  collected_by: string | null; // for field: staff name; for web: "web-form"
  visit_date: string; // for web submissions: date of submission
  created_at: string;
}
```

The public form maps cleanly onto this schema. `collected_by` would be set server-side to `"web-form"` for public submissions.

### 1.4.5 UX Considerations

- Page should NOT feel like a dry form. Wrap it in a value proposition section above the form: "Tell us what you need, we'll bring it to you" or similar
- Show the LGA/area dropdowns (same models already in use in admin page: `kadunaLgas`, `kadunaAreas`, `kadunaAreasByLga`)
- On mobile, ensure phone input type is `tel` for native keyboard
- After successful submit, optionally show a WhatsApp CTA ("Prefer to chat? Message us on WhatsApp") using the existing `whatsapp-button` component in `packages/ui-web`
- Loading state on submit button
- Error state if API call fails

### 1.4.6 Navigation Entry Point

- Add "Register Interest" or "Get In Touch" link to landing page header/nav
- Also accessible from the shop page (after viewing products: "Want bulk orders? Register your interest")
- Can reuse or merge with existing `/contact` route - evaluate whether to merge or keep separate

### 1.4.7 API Endpoints Needed

- `POST /outreach/submit` - public, no auth, accepts simplified lead form
  - Server sets `collected_by: "web-form"`, `visit_date: today`, `source: "web"`
  - Returns `{ success: true, message: "..." }`
- Backend optionally sends notification email/SMS to admin on new web submission

---

## 2.4 Save as Favorites / Wishlist

### 2.4.1 Favorites vs Cart — Key Difference

Cart is **transient** (intent to buy now). Favorites are **persistent** (save for later / wishlist). They need different treatment:

|                  | Cart                                  | Favorites                                                                          |
| ---------------- | ------------------------------------- | ---------------------------------------------------------------------------------- |
| Guest support    | Yes (localStorage)                    | Yes (localStorage, limited)                                                        |
| Cross-device     | Only when authenticated               | Only when authenticated                                                            |
| Endpoint pattern | `PUT /cart` (full replace, debounced) | `POST /favorites/:productId`, `DELETE /favorites/:productId` (per-item, immediate) |
| Merge on login   | Merge guest into user cart            | Merge guest favorites into user favorites                                          |
| TTL              | 30 days                               | No expiry (long-term saves)                                                        |

### 2.4.2 Why Per-Item Endpoints for Favorites (not batch)?

Favorites are toggled deliberately, not rapidly changed. Unlike cart (where you might adjust qty multiple times quickly), favorites are one-shot actions. Immediate per-item calls are fine and give clearer feedback ("Saved!").

- `GET /favorites` — fetch all favorites
- `POST /favorites/:productId` — add to favorites
- `DELETE /favorites/:productId` — remove from favorites

### 2.4.3 Guest Favorites

- Store as array of product IDs in localStorage (not full product data — too large)
- On login: `POST /favorites/batch` with the IDs list → server merges with existing favorites
- Clear localStorage favorites after merge

### 2.4.4 UI Behavior

- Heart/bookmark icon on each product card
- Toggling fills/unfills the icon immediately (optimistic)
- Favorites count in header (optional)
- Dedicated "My Favorites" page or drawer in dashboard/profile
- When viewing a favorited item in shop → icon should appear active

---

## 3. Authentication Status Management

### 3.1 Global Auth Context (RECOMMENDED APPROACH)

- **Why Global Context?**:
  - ✅ **Accessibility**: Auth status needed across entire app (landing, shop, checkout, modals)
  - ✅ **Efficiency**: Single source of truth prevents prop-drilling
  - ✅ **Performance**: Avoid redundant auth checks
  - ✅ **Checkout Flow**: Modal needs instant access to auth status
  - ✅ **Signup Redirect**: Need to persist cart location and return seamlessly

- **Implementation**:

  ```typescript
  interface AuthContext {
    isAuthenticated: boolean;
    user: User | null;
    loading: boolean;
    login: (credentials) => Promise<void>;
    signup: (data) => Promise<void>;
    logout: () => Promise<void>;
    checkAuthStatus: () => Promise<void>;
  }
  ```

- **Storage Layers**:
  1. **Session/Token Storage**: Store auth token in httpOnly cookie or secure storage
  2. **Context**: Share auth state across app
  3. **Sync**: On app load, verify token validity and hydrate auth context

### 3.2 Auth Status Verification

- **On App Load**: Check if user has valid auth token
- **On Route Change**: Verify auth status for protected routes
- **On Checkout Click**: Query auth context to determine modal behavior
- **Error Handling**: Handle expired tokens, network errors gracefully

---

## 4. Header Navigation Authentication Link

> **Status: Ready to implement** — depends on global auth context (section 8)

### 4.1 Dynamic Header Link Behavior

- **Goal**: The "Sign Up" link/button in the landing page header must become a "Dashboard" link when the user is authenticated
- **Trigger**: `isUserAuthenticated` value from global auth context
- **Current Location**: Header/navigation bar of landing page
- **Dynamic Behavior**:
  - **If `isUserAuthenticated === false`**: Display as "Sign Up" link
    - Clicking scrolls to signup modal or navigates to signup page
    - Visual state: Primary button/link styling
  - **If `isUserAuthenticated === true`**: Display as "Go to Dashboard" link
    - Clicking navigates to user's role-specific dashboard (see 4.2)
    - Visual state: Secondary or profile button styling (different color to signal "you're logged in")

### 4.2 Role-Based Dashboard Routing

- **Determine User Role**: On auth context hydration, fetch user role from profile
- **Dashboard Mapping**:
  - `role: "buyer"` → Route to `/dashboards/buyer`
  - `role: "seller"` → Route to `/dashboards/seller`
  - `role: "agent"` → Route to `/dashboards/agent`
  - `role: "admin"` → Route to `/dashboards/admin`
  - Default/Unknown → Route to `/dashboards` or profile page

### 4.3 Implementation Details

- **Access**: Use global auth context to check `isAuthenticated` and `user.role`
- **Link Component**: Create reusable header link component
  - Props: Takes authenticated state and user role
  - Returns appropriate link/button with href or onClick handler
- **Styling**:
  - Show different visual states for authenticated vs unauthenticated
  - Consider adding user avatar/profile indicator when authenticated
- **Mobile**: Ensure button is accessible on mobile navigation

### 4.4 State Transition Handling

- **On Login**: Update auth context → Header link automatically updates
- **On Logout**: Clear auth context → Header link reverts to "Sign Up"
- **On Role Change** (if applicable): Fetch new role → Dashboard link points to new dashboard

### 4.5 Related Component Updates

- **Navbar/Header Component**: Add auth context hook
- **Routes**: Ensure all role-based dashboards exist and are protected
- **Navigation Guards** (optional): Redirect to signup if unauthenticated user tries to access dashboard directly

---

## 5. Checkout Authentication Modal

### 5.1 Modal Trigger Logic

- **When**: User clicks "Proceed to Checkout" button
- **Action**: System checks global auth context
- **Conditions**:
  - If `isAuthenticated === true`: Proceed directly to checkout/payment
  - If `isAuthenticated === false`: Show authentication modal

### 5.2 Authentication Modal (Not Authenticated)

- **Title**: "Sign up or Log in to Checkout"
- **Message**: "Please create an account or log in to complete your purchase"
- **Options**:
  - Tab 1: Login form
    - Email input
    - Password input
    - "Forgot Password?" link
    - Login button
  - Tab 2: Signup form
    - Email input
    - Password input
    - Confirm password input
    - First name (optional)
    - Last name (optional)
    - Terms & conditions checkbox
    - Signup button
  - Close/Cancel button

### 5.3 Modal State Flow

```
User Clicks "Checkout"
  ↓
Check auth context → isAuthenticated?
  ├─ YES → Proceed to payment
  └─ NO → Show modal
        ├─ User Logs In
        │   ├─ Success → Close modal, proceed to payment
        │   └─ Error → Show error, stay in modal
        └─ User Signs Up
            ├─ Success → Close modal, proceed to payment
            └─ Error → Show error, stay in modal
```

### 5.4 Modal UI Requirements

- **Accessibility**:
  - Proper ARIA labels
  - Keyboard navigation support
  - Focus management
- **Visual Design**: Match landing page design system
- **Error Handling**: Display form validation errors and API errors
- **Loading States**: Show loading indicator during auth requests

---

## 6. Cart Preservation on Signup/Login

### 6.1 Cart Persistence Strategy

- **Before Auth**: Cart stored in localStorage
- **During Signup/Login**:
  - Keep cart data in localStorage
  - Do NOT clear cart on successful authentication
- **After Auth**:
  - Migrate cart to user's account (optional enhancement)
  - OR maintain localStorage cart and sync with user's saved cart on next visit

### 5.2 User Experience Flow

```
1. User browses shop on landing page (not authenticated)
2. User adds items to cart (stored in localStorage)
3. User clicks "Checkout" → Auth modal appears
4. User completes signup/login
5. Modal closes automatically
6. Cart remains intact with all items
7. User proceeds to payment/checkout page
```

### 5.3 Implementation Details

- **Modal Close**: On successful signup/login, automatically close modal
- **Navigation**: After modal closes, either:
  - Auto-navigate to checkout page, OR
  - Return focus to "Proceed to Checkout" button for manual click
- **Data Sync**: When creating user account, optionally sync cart items to user profile (for future enhancements)

---

## 6. Checkout and Payment Flow

### 6.1 Checkout Page Requirements

- **Access**: Only accessible after successful authentication
- **Display**:
  - Cart items summary
  - Order total
  - Delivery address
  - Payment method selection
- **Actions**:
  - Edit cart (remove/modify quantities)
  - Proceed to payment

### 6.2 Payment Integration

- **Provider**: Specify payment gateway (Stripe, Paystack, etc.)
- **Security**: Ensure PCI compliance
- **Verification**: Process payment and confirm order

---

## 7. Error Handling & Edge Cases

### 7.1 Session Expiration

- **Scenario**: User logs in, but session expires during checkout
- **Behavior**:
  - Detect expired token
  - Show re-authentication modal
  - Preserve cart and checkout progress
  - Allow user to re-login and continue

### 7.2 Network Errors

- **Scenario**: API call fails during signup/login
- **Behavior**:
  - Display user-friendly error message
  - Allow retry
  - Keep modal open

### 7.3 Cart Limits

- **Max Quantity**: Define per-item limits
- **Out of Stock**: Handle unavailable items gracefully
- **Price Changes**: Verify prices haven't changed since adding to cart

### 7.4 Browser/Storage Issues

- **localStorage Unavailable**: Fall back to in-memory cart
- **Quota Exceeded**: Handle storage errors gracefully
- **Incognito Mode**: Detect and warn user about cart not persisting

---

## 8. Global Auth Context Architecture

### 8.1 Context Provider Setup

- **Location**: Root component (`root.tsx` or layout wrapper)
- **Hydration**: On app initialization:
  1. Check for existing auth token
  2. Verify token validity with backend
  3. Fetch user profile if valid
  4. Update context state
- **Loading**: Show loading indicator during initial hydration

### 8.2 Auth Context Exports

- **Hooks**:
  - `useAuth()` - Access auth state and methods
  - `useAuthStatus()` - Only check if authenticated
  - `useUser()` - Get current user data
- **Methods**:
  - `login(email, password)`
  - `signup(data)`
  - `logout()`
  - `refreshToken()`
  - `checkAuthStatus()`

### 8.3 Token Management

- **Storage**:
  - Access token: httpOnly cookie (if backend supports) or secure localStorage
  - Refresh token: httpOnly cookie preferred
- **Refresh Strategy**:
  - Automatically refresh before expiry
  - OR refresh on 401 response
- **Logout**: Clear tokens and reset auth context

### 8.4 Type Safety

```typescript
interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  createdAt?: timestamp;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: Error | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  signup: (data: SignupData) => Promise<void>;
  logout: () => Promise<void>;
  checkAuthStatus: () => Promise<void>;
  clearError: () => void;
}
```

---

## 9. API Integration Points

### 9.1 Required Endpoints

- `POST /auth/signup` - Create new user account
- `POST /auth/login` - Authenticate user
- `POST /auth/logout` - End session
- `GET /auth/status` - Check current auth status
- `POST /auth/refresh-token` - Refresh access token
- `GET /auth/profile` - Get logged-in user profile

### 9.2 Request/Response Formats

- **Login/Signup Response**:
  ```json
  {
    "success": true,
    "user": { "id", "email", "firstName", "lastName" },
    "token": "jwt_token",
    "refreshToken": "refresh_token"
  }
  ```
- **Error Response**:
  ```json
  {
    "success": false,
    "error": "Error message",
    "code": "ERROR_CODE"
  }
  ```

---

## 10. Testing Scenarios

### 10.1 Happy Path

- [ ] User browses shop without authentication
- [ ] User adds items to cart
- [ ] User clicks checkout
- [ ] Auth modal appears
- [ ] User signs up
- [ ] Cart remains intact
- [ ] User proceeds to payment

### 10.2 Alternative Path

- [ ] User logs in instead of signing up
- [ ] User updates quantities before checkout
- [ ] User removes items from cart
- [ ] User abandons checkout and returns later (cart persists)

### 10.3 Error Cases

- [ ] Signup with invalid email
- [ ] Signup with weak password
- [ ] Login with wrong credentials
- [ ] Session expires during checkout
- [ ] Network error during signup
- [ ] localStorage unavailable

---

## 11. Product Catalog Structure

### 11.1 Decision: Two-Tier Category + Varieties

The catalog uses a two-tier model: **Category** at the top level, **Variety** within each category. This matches how buyers in Kaduna markets actually think ("I want beans" first, then "Wake Gida or cowpea?"). A flat list of 25+ products would be confusing on mobile and slow to browse.

```
Category: Grains
  Variety: Rice
    - Local White Rice
    - Ofada Rice
    - Tuwo Rice
    - Long Grain / Parboiled

  Variety: Beans
    - Wake Gida
    - Cowpea
    - Soya Beans
    - Ameria (Brown Beans)
    - Honey Beans

  Variety: Garri
    - White Garri
    - Yellow Garri (toasted)
    - Ijebu Garri

Category: Oil
    - Palm Oil (litre / keg sizes)
    - Groundnut Oil
    - Vegetable Oil

Category: Tubers
    - Yam (tuber / bag)
    - Irish Potato
    - Sweet Potato

Category: Protein / Others (future)
    - Eggs
    - Dried Fish
    - Crayfish
```

### 11.2 Per-Variety Data Shape (for shop catalog and product pages)

Each individual variety needs:

```typescript
interface ProductVariety {
  id: string;
  slug: string; // "wake-gida-beans"
  name: string; // "Wake Gida"
  categoryId: string; // "beans"
  parentCategory: string; // "Grains"
  images: string[]; // multiple images of this specific variety
  pricePerUnit: number; // in Naira
  unit: "bag" | "kg" | "litre" | "keg" | "tuber" | "crate";
  unitSizes: string[]; // ["5kg", "10kg", "50kg bag"] - available sizes
  description: string; // short description of this variety
  inStock: boolean;
  featured?: boolean; // show in homepage carousel
}
```

### 11.3 Category-Level Data Shape (for navigation and "What We Deliver" cards)

```typescript
interface ProductCategory {
  id: string; // "beans"
  name: string; // "Beans"
  parentCategory: string; // "Grains"
  icon?: string; // iconify icon key
  description?: string; // short one-liner
  variants: ProductVariety[];
}
```

### 11.4 "What We Deliver" Cards: Updated Data Structure

The homepage cards currently use `subtitle: string` (single string for all images). This must change to `variants` so each image has its own variety name label (see section 12 for the animation that depends on this):

```typescript
// OLD (current)
interface WhatWeDeliverCategory {
  title: string; // "Beans"
  subtitle: string; // "Wake Gida, Cowpea" — single string
  images: string[];
}

// NEW (required for animation + accuracy)
interface DeliverVariant {
  name: string; // "Wake Gida" — shown as delayed subtitle per image
  image: string; // one image per variety
}

interface WhatWeDeliverCategory {
  title: string; // "Beans" — always visible, never animates
  variants: DeliverVariant[]; // each variant has its own image + label
}
```

**Updated card data (example):**

```typescript
const whatWeDeliverCategories: WhatWeDeliverCategory[] = [
  {
    title: "Beans",
    variants: [
      { name: "Wake Gida", image: "/images/beans-wake-gida.jpg" },
      { name: "Cowpea", image: "/images/beans-cowpea.jpg" },
      { name: "Soya Beans", image: "/images/beans-soya.jpg" },
      { name: "Ameria", image: "/images/beans-ameria.jpg" },
    ],
  },
  {
    title: "Rice",
    variants: [
      { name: "Local White Rice", image: "/images/rice-local.jpg" },
      { name: "Ofada Rice", image: "/images/rice-ofada.jpg" },
      { name: "Tuwo Rice", image: "/images/rice-tuwo.jpg" },
    ],
  },
  {
    title: "Garri",
    variants: [
      { name: "White Garri", image: "/images/garri-white.jpg" },
      { name: "Yellow Garri", image: "/images/garri-yellow.jpg" },
      { name: "Ijebu Garri", image: "/images/garri-ijebu.jpg" },
    ],
  },
  {
    title: "Palm Oil",
    variants: [
      { name: "Fresh Palm Oil", image: "/images/oil-palm-fresh.jpg" },
      { name: "Groundnut Oil", image: "/images/oil-groundnut.jpg" },
    ],
  },
  {
    title: "Tubers",
    variants: [
      { name: "Yam", image: "/images/tubers-yam.jpg" },
      { name: "Irish Potato", image: "/images/tubers-irish.jpg" },
    ],
  },
];
```

### 11.5 Considerations

- **Images per variety are critical** - buyers need to visually confirm they're ordering the right type. Wake Gida looks different from cowpea. Ofada rice looks different from long grain. Get real photos.
- **Pricing lives at variety level**, not category level. Different beans have different prices.
- **Units vary by variety** - garri is sold by kg or bag, palm oil by litre or keg. `unitSizes` captures this.
- **The shop catalog and the homepage "What We Deliver" cards share the same underlying data** - the admin product management should feed both. No duplication.

---

## 12. "What We Deliver" Card Animation (Hover Subtitle Reveal)

### 12.1 Desired Behavior

When hovering a DeliverCard:

1. Images cycle as they do now (every 900ms, right-to-left slide, 600ms transition)
2. The **category title** ("Beans", "Rice", "Garri") stays visible at ALL times - it never hides or animates
3. The **variety subtitle** ("Wake Gida", "Cowpea", etc.) animates per cycle:
   - When the index changes: subtitle **fades out immediately** (as the next image begins sliding in)
   - After the new image has fully arrived: **wait 1 second**
   - Then: subtitle **fades in** with the new variety name

On hover end: snap back to `variants[0]`, title and subtitle[0] immediately visible, no delay.

### 12.2 State Requirements

Current `DeliverCard` state:

```typescript
const [activeImageIndex, setActiveImageIndex] = useState(0);
const [isHovered, setIsHovered] = useState(false);
const intervalRef = useRef(null);
```

New state needed:

```typescript
const [activeIndex, setActiveIndex] = useState(0); // drives both image and variant name
const [isHovered, setIsHovered] = useState(false);
const [subtitleVisible, setSubtitleVisible] = useState(true); // drives subtitle fade
const intervalRef = useRef<NodeJS.Timeout | null>(null);
const subtitleTimerRef = useRef<NodeJS.Timeout | null>(null); // for the 1s delay
```

### 12.3 Timing Logic

```
ON index change (inside interval callback):
  1. setSubtitleVisible(false)             — subtitle fades out immediately
  2. Wait 600ms (image transition duration)
     + 1000ms (the 1 second "hold" after image arrives)
     = 1600ms total delay before showing subtitle
  3. setSubtitleVisible(true)              — subtitle fades in

ON hover end:
  1. Clear interval
  2. Clear subtitle timer
  3. setActiveIndex(0)
  4. setSubtitleVisible(true)              — show subtitle immediately on reset
```

### 12.4 Animation Values for the Subtitle Element

```typescript
// Subtitle animated with framer-motion AnimatePresence or simple motion.p
<motion.p
  key={activeIndex}          // key change triggers re-animation
  animate={{ opacity: subtitleVisible ? 1 : 0 }}
  transition={{ duration: 0.35, ease: "easeOut" }}
  className="text-base text-white"
>
  {category.variants[activeIndex].name}
</motion.p>
```

Alternative without `key` change - just opacity:

```typescript
<motion.p
  animate={{ opacity: subtitleVisible ? 1 : 0, y: subtitleVisible ? 0 : 4 }}
  transition={{ duration: 0.35 }}
>
  {category.variants[activeIndex].name}
</motion.p>
```

The `y: 4` on exit adds a slight downward drift as it fades out, making the reveal feel more natural.

### 12.5 What Does NOT Change

- The category title (`category.title`) — renders as a plain `<p>`, no animation, always fully visible
- The image slide mechanic (right-to-left, 600ms ease-in-out) — unchanged
- The dot indicators at bottom — now keyed to `activeIndex` instead of `activeImageIndex`
- The carousel auto-scroll and snap-back logic in `WhatWeDeliver` parent — unchanged

### 12.6 Implementation Files

- Primary change: `apps/debridgers-frontend/app/routes/landing/home.tsx`
  - `DeliverCard` component (lines 140-229 currently)
  - `whatWeDeliverCategories` data (lines 99-136 currently) - restructure to variants
- No other files affected

---

## Implementation Priority

### Phase 1: Foundation (Critical)

1. Set up global auth context (`useAuth`, `isUserAuthenticated`, `user.role`)
2. **Header Sign Up → Dashboard link** (simple, high-impact, needs auth context)
3. Implement cart state management — localStorage for guests
4. Create authentication modal component
5. Move shop/buyer to landing page
6. Add checkout trigger logic

### Phase 2: Integration (High)

7. Integrate signup/login forms with auth endpoints
8. Add backend cart endpoint (`PUT /cart`) with debounced 3s batch sync
9. Cart merge on login (localStorage → backend)
10. Implement checkout flow
11. Add error handling and `beforeunload` cart flush

### Phase 3: Favorites (Medium-High)

12. Add per-item favorites endpoints (`POST/DELETE /favorites/:productId`)
13. Heart/bookmark UI on product cards (optimistic toggle)
14. Guest favorites localStorage with merge-on-login
15. My Favorites page or drawer

### Phase 4: Polish (Medium)

16. Loading states, animations, "saving..." sync indicator
17. Implement session expiration handling
18. Add analytics tracking
19. Comprehensive testing

### Phase 5: Enhancement (Low)

20. Cart recovery for abandoned carts (email reminders)
21. Add checkout history
22. Recommendations based on favorites

---

## Notes & Considerations

- **Auth Status**: YES, use global context - essential for this flow
- **Cart Data**: Keep separate from auth state for flexibility
- **Offline Support**: Consider service workers for cart persistence in offline mode
- **A/B Testing**: Track conversion rates through checkout flow
- **Performance**: Lazy load checkout page to reduce initial bundle
- **Mobile UX**: Ensure modal and checkout are mobile-optimized

---

## 13. Buyer Settings — Unimplemented Toggles & Password Change

> **Audit date: 2026-06-08**
> All three toggles (Email Notification, SMS Notification, Two-Factor Authentication) and the Change Password section in `apps/debridgers-frontend/app/routes/dashboards/buyer/settings.tsx` are **UI-only**. None of them are wired to the backend.

---

### 13.1 Email Notification Toggle — Not Wired

**Current state:**

- The `emailNotification` boolean lives in frontend `useState` only.
- `handleSubmit` calls `PATCH /buyer/profile` with only `first_name`, `last_name`, and `delivery_address`. The `emailNotification` value is never sent.
- The backend `updateProfile` DTO and handler has no field for notification preferences.
- The `users` schema has no `email_notifications` column.

**What happens if user toggles it off:**
Nothing. The backend will keep sending login confirmation emails, order update emails, and any future transactional emails regardless of the toggle state. The setting is lost on page refresh.

**What needs to be done:**

1. **Backend — DB schema**: Add `email_notifications boolean NOT NULL DEFAULT true` to the `users` table. Run a migration.
2. **Backend — `updateProfile` DTO** (`buyer/dto/update-profile.dto.ts`): Add `email_notifications?: boolean` field.
3. **Backend — `BuyerService.updateProfile`**: Include `email_notifications` in the `updates` object.
4. **Backend — `BuyerService.getProfile`**: Return `email_notifications` in the profile response so the frontend can hydrate the toggle on load.
5. **Backend — `UserListeners` / `EmailService`**: Before every transactional email sent to a buyer (login notification, order updates), fetch the user's `email_notifications` flag and skip the send if it is `false`. This check is needed at the listener level, not the email template level.
6. **Frontend — `settings.tsx`**: Load `email_notifications` from `GET /buyer/me` and set `emailNotification` state. Include it in the PATCH body on submit.

**Note:** Welcome and email-verification emails during signup should always be sent regardless of this flag (user hasn't opted out yet at that point).

---

### 13.2 SMS Notification Toggle — Not Built

**Current state:**

- The `smsNotification` toggle is pure UI state, never saved anywhere.
- There is **no SMS service** in the backend codebase — no Twilio, no Africa's Talking, no Termii, nothing.
- No SMS sending code exists anywhere in `apps/debridgers-backend/src/`.
- The `users` schema has no `sms_notifications` column and no `phone` field used for outbound SMS.

**What needs to be done:**

1. **Choose an SMS provider**: Africa's Talking (popular in Nigeria), Termii, or Twilio. Africa's Talking has strong NG coverage and competitive pricing.
2. **Backend — Install SDK** and wire up a `SmsService` (similar pattern to `EmailService`) under `notification/features/sms/`.
3. **Backend — DB schema**: Add `sms_notifications boolean NOT NULL DEFAULT false` to `users`. Default `false` because users have not opted in.
4. **Backend — `updateProfile` DTO + service**: Accept and persist `sms_notifications`.
5. **Backend — `getProfile`**: Return `sms_notifications`.
6. **Backend — Event listeners**: Add SMS sends in `UserListeners` for events where SMS makes sense (order placed, order delivered, order out-for-delivery). Only send if `sms_notifications === true` AND the user has a `phone` number on file.
7. **Frontend — `settings.tsx`**: Hydrate toggle from profile on load. Include in PATCH body. Show a helper note: "You must have a phone number saved to receive SMS."

---

### 13.3 Two-Factor Authentication Toggle — Not Built

**Current state:**

- The `twoFactor` toggle is pure UI state, never saved.
- There is **no 2FA implementation** anywhere in the backend — no TOTP library (no `speakeasy`, `otplib`, etc.), no authenticator app flow, no 2FA OTP table, no 2FA enforcement at login.
- The existing email OTP in `email_verification` is for signup email verification only — it is not a 2FA login step.
- The `users` schema has no `two_factor_enabled` or `two_factor_secret` column.

**What needs to be done (TOTP approach — recommended):**

1. **Backend — DB schema**: Add `two_factor_enabled boolean NOT NULL DEFAULT false` and `two_factor_secret text` (nullable) to `users`.
2. **Backend — Install `otplib`** (or `speakeasy`) for TOTP generation and verification.
3. **Backend — New endpoints** (under `auth` or `buyer` controller):
   - `POST /buyer/2fa/setup` — generate a TOTP secret, return QR code URL for authenticator app. Store secret temporarily (or in DB as unconfirmed).
   - `POST /buyer/2fa/verify-setup` — user submits first TOTP code to confirm setup. Mark `two_factor_enabled = true`, persist secret.
   - `DELETE /buyer/2fa` — disable 2FA (requires current TOTP code to confirm).
4. **Backend — `AuthService.login`**: After password check, if `user.two_factor_enabled === true`, do NOT return tokens. Instead return `{ requires2fa: true, tempToken: ... }`. The frontend then shows a TOTP prompt.
5. **Backend — New endpoint** `POST /auth/2fa/login` — accepts `tempToken` + `totpCode`, verifies TOTP, then issues real access/refresh tokens.
6. **Frontend — `settings.tsx`**: Clicking the 2FA toggle should open a setup flow (QR code display + confirm code step), not just flip a boolean. Disable toggle cannot just POST a boolean either — require the user to enter their current TOTP code to turn it off.
7. **Frontend — login page**: After password submit, if `requires2fa` is returned, show a second step input for the TOTP code.

**Alternative (SMS-based 2FA):** Simpler but requires SMS provider from 13.2. Send a 6-digit OTP to `user.phone` on login. Only viable once SMS infrastructure is built.

---

### 13.4 Change Password — Not Wired

**Current state:**

- `oldPassword` and `newPassword` fields are rendered in the UI.
- `handleSubmit` does **not** include them in the `PATCH /buyer/profile` call. The fields are entirely ignored on submit.
- There is no `changePassword` method in `BuyerService` and no endpoint for in-dashboard password change. The only password change mechanism is the forgot-password reset flow (`POST /auth/forgot-password` → email link → `POST /auth/reset-password`).

**What needs to be done:**

1. **Backend — `BuyerService`**: Add `changePassword(dto: { old_password: string; new_password: string }, user: JwtPayload)`. Fetch user, `bcrypt.compare` old password, hash new password, update `users.password`.
2. **Backend — `BuyerController`**: Add `PATCH /buyer/password` endpoint, guarded by `AuthGuard + RolesGuard("buyer")`. Use a new DTO with zod validation (min 8 chars for new password).
3. **Frontend — `settings.tsx`**: In `handleSubmit`, if `oldPassword` and `newPassword` are both present, call `PATCH /buyer/password` separately (or chain it). Show specific error if old password is wrong. Clear both fields on success.

---

### 13.5 Implementation Priority

| Feature                                  | Backend missing                                  | Frontend missing                      | Complexity |
| ---------------------------------------- | ------------------------------------------------ | ------------------------------------- | ---------- |
| Email notification toggle save + respect | Schema col, DTO update, gate in listeners        | Hydrate on load, include in PATCH     | Low        |
| Change password endpoint                 | New service method + endpoint                    | Wire in submit handler                | Low        |
| SMS notifications                        | Full SMS provider + service + schema + listeners | Hydrate on load, phone number warning | High       |
| Two-factor authentication                | Full TOTP flow, login step, 3 new endpoints      | Setup wizard, login second step       | High       |

---

## 14. Wallet & Payment

> **Audit date: 2026-06-08**

---

### 14.1 Current State — What Actually Works

| Feature                                                                      | Status                                                      |
| ---------------------------------------------------------------------------- | ----------------------------------------------------------- |
| Agent wallet balance display (`GET /agent/wallet`)                           | Works — reads from `wallets` table                          |
| Agent commission history (`GET /agent/commissions`)                          | Works                                                       |
| Agent Paystack subaccount creation (`POST /payment/subaccount/:agentId`)     | Works — admin-only                                          |
| Paystack payment init for agent referral splits (`POST /payment/initialize`) | Works                                                       |
| Paystack webhook → records agent commission on `charge.success`              | Works                                                       |
| Buyer total-spent display                                                    | Works — derived from delivered orders in `/buyer/dashboard` |
| Buyer transaction history display                                            | Works — built from `/buyer/orders`                          |

---

### 14.2 Buyer Wallet — Not Built

**Current state:**

- The `wallets` table has an `agent_id` column only — there is no buyer wallet row anywhere in the DB.
- `buyer/wallet.tsx` shows "Total Spent" (from delivered orders) and a transaction list (from order history). These work, but they are not a real wallet — there is no balance, no top-up, and no payment flow.
- The "Add Funds" button is **disabled** and labeled "coming soon". The modal behind it has a fake `setTimeout` — no API call is made.
- `balance` and `totalFunded` are hardcoded to `0`.
- There is no `GET /buyer/wallet` endpoint.
- There is no `POST /buyer/wallet/topup` or Paystack initialization endpoint for buyers.

**What a buyer wallet needs:**

1. **DB schema**: Create a `buyer_wallets` table (or extend `wallets` with a `buyer_id` column):

   ```
   id, buyer_id (FK → users), balance_kobo, total_funded_kobo, updated_at
   ```

   A wallet row should be created automatically when a buyer registers (event-driven or on first top-up).

2. **Backend — `GET /buyer/wallet`**: Return `{ balance_kobo, total_funded_kobo }`. Frontend converts to naira.

3. **Backend — `POST /buyer/wallet/topup/initialize`**: Accepts `{ amount_kobo }`. Calls Paystack `transaction/initialize` with the buyer's email and amount. Returns `{ authorization_url, reference }`. Frontend redirects buyer to Paystack checkout page.

4. **Backend — Paystack webhook**: Extend `handleWebhook` to detect buyer top-up events (distinguish from agent commission events via `metadata.type = "buyer_topup"` set during initialization). On `charge.success`, credit the buyer's wallet balance and record the transaction.

5. **Backend — Transaction log**: Add a `wallet_transactions` table:

   ```
   id, wallet_id, type (credit|debit), amount_kobo, description, reference, created_at
   ```

   Credit on top-up. Debit when an order is placed from wallet balance.

6. **Frontend — `buyer/wallet.tsx`**:
   - Fetch from `GET /buyer/wallet` to show real balance.
   - "Add Funds" → call `POST /buyer/wallet/topup/initialize`, redirect to `authorization_url`.
   - After Paystack redirects back (`callback_url`), show success and refresh balance.
   - Show real credit/debit transactions from the transaction log endpoint.

---

### 14.3 Buyer Payment at Checkout — Not Built

**Current state:**

- `POST /buyer/orders` creates an order with `status: "pending"` immediately with no payment step.
- The `total_amount_kobo` is sent by the frontend but no Paystack call is made — the order is created whether or not the user has paid.
- There is no checkout → payment → order confirmation flow. Orders are created on trust.

**Two approaches — choose one:**

**Option A — Pay from wallet balance (pre-funded)**

```
Buyer tops up wallet → balance stored in DB
At checkout → deduct balance → create order as "confirmed"
If balance insufficient → show error, prompt top-up
```

Simpler UX (no Paystack redirect per order). Requires the buyer wallet from 14.2.

**Option B — Pay per order via Paystack (card/transfer each time)**

```
Buyer places order → POST /buyer/orders/initialize-payment
Backend calls Paystack initialize → returns authorization_url
Frontend redirects → buyer pays on Paystack
Paystack webhook → charge.success → confirm order, change status to "confirmed"
```

No pre-funding needed. Each order goes through Paystack.

**Recommended: Option B first** (simpler to ship, no wallet pre-funding complexity), then add Option A (wallet top-up) as a later convenience feature.

**What needs to be built for Option B:**

1. **Backend** — New endpoint `POST /buyer/orders` should not create the order immediately. Instead:
   - Validate the cart, calculate total.
   - Call Paystack `transaction/initialize` with `metadata: { type: "buyer_order", order_details: ... }`.
   - Store a pending order draft (or pass all details in metadata).
   - Return `{ authorization_url, reference }` to frontend.

2. **Backend — Paystack webhook**: On `charge.success` with `metadata.type = "buyer_order"`:
   - Create the order with `status: "confirmed"`.
   - Send buyer a notification (in-app + email: "Order confirmed, payment received").

3. **Frontend — `buyer/checkout.tsx`**:
   - On "Place Order", call the initialize endpoint.
   - Redirect to `authorization_url`.
   - On Paystack callback, show "Payment received, order confirmed" screen.

---

### 14.4 Agent Wallet — Partially Built, Bank Details Missing

**Current state:**

- `GET /agent/wallet` and `GET /agent/commissions` work.
- Paystack subaccount creation works but uses a **hardcoded account number `"0000000000"`** — this is a placeholder and will fail on a real Paystack account.
- Agents cannot update their own bank account details from the dashboard. The `bank_details` section in `agent/wallet.tsx` says "Contact admin to update your payout details."
- There is no endpoint for agents to submit or update their bank account number.
- Automatic payout disbursement (every Friday 9am as shown in the UI) is **not implemented** — no cron job, no payout trigger, no Paystack transfer call.

**What needs to be built:**

1. **Agent bank details endpoint**: `PATCH /agent/bank-details` — accepts `{ bank_code, account_number }`. Verifies account via Paystack's account resolution API (`GET https://api.paystack.co/bank/resolve`), then updates the agent profile and re-creates or updates the Paystack subaccount.

2. **Agent payout cron job**: A scheduled job (NestJS `@Cron`) that runs every Friday at 9am Nigeria time:
   - Finds all agents with `pending_balance > 0` and an approved Paystack subaccount.
   - Calls Paystack `POST /transfer` to disburse.
   - On success, moves `pending_balance` to `available_balance`, records a payout transaction.

3. **Frontend — `agent/wallet.tsx`**: Replace the "Contact admin" placeholder with a form to enter bank name (from Paystack bank list) and account number. Show the resolved account name for confirmation before saving.

---

### 14.5 Implementation Priority

| Feature                                          | Complexity | Blocks                     |
| ------------------------------------------------ | ---------- | -------------------------- |
| Option B: per-order Paystack payment at checkout | Medium     | Buyers placing real orders |
| Paystack webhook for buyer orders                | Medium     | Order confirmation flow    |
| Agent bank details self-service                  | Medium     | Real agent payouts         |
| Buyer wallet table + `GET /buyer/wallet`         | Low        | Wallet balance display     |
| Buyer wallet top-up via Paystack                 | Medium     | Pre-funded wallet UX       |
| Agent payout cron job (Friday disbursement)      | Medium     | Automated agent payouts    |

---

## 15. Agent Stock Request — Hierarchical Category-Based UX

> **Context: 2026-06-08**
> The current stock request page (`apps/debridgers-frontend/app/routes/dashboards/agent/request-stock.tsx`) lists products in a flat or unstructured way. The goal is to rework the selection UX into a three-level drill-down: Category → Subcategory/Type → Variety + Quantity.

---

### 15.1 Desired Flow

```
Step 1 — Category buttons (top level, always visible)
  e.g.  [ Grains ]  [ Oil ]  [ Tubers ]

  ↓ Agent clicks "Grains"

Step 2 — Type/Subcategory pills appear below the category row
  e.g.  [ Beans ]  [ Rice ]  [ Garri ]
  (listed as inline buttons/pills directly under the active category)

  ↓ Agent clicks "Beans"

Step 3 — Variety dropdown opens (inline or popover beneath the type button)
  e.g.  Wake Gida
        Cowpea
        Soya Beans
        Ameria (Brown Beans)
        Honey Beans

  ↓ Agent selects e.g. "Wake Gida"

Step 4 — Quantity input appears (inline, alongside the selected item)
  e.g.  Wake Gida  [ - ]  [ 3 ]  [ + ]  Add to Request
```

The agent can repeat this flow to add multiple items to a single stock request before submitting.

---

### 15.2 UI Structure

- **Category row**: Horizontal scrollable row of buttons. Active category is highlighted. Only one category active at a time.
- **Type pills**: Appear below the category row when a category is selected. Clicking a type pill expands its variety list (dropdown or accordion — TBD, but inline accordion preferred on mobile).
- **Variety list**: Renders below the active type pill. Each variety is a pressable row or card. Tapping one opens the quantity input inline within that row.
- **Quantity input**: Stepper (`-` / number / `+`) with a minimum of 1. Unit label (bag, kg, litre, etc.) shown next to the stepper so the agent knows what they're ordering.
- **Add to Request button**: Appears once a variety and a valid quantity are selected. Adds the item to a running cart/request list visible at the bottom or in a sidebar.

---

### 15.3 State Shape

```typescript
// Selection state during the drill-down
interface StockSelectionState {
  activeCategoryId: string | null; // e.g. "grains"
  activeTypeId: string | null; // e.g. "beans"
  activeVarietyId: string | null; // e.g. "wake-gida"
  quantity: number;
}

// An item already added to the request
interface RequestLineItem {
  varietyId: string;
  varietyName: string; // "Wake Gida"
  typeName: string; // "Beans"
  categoryName: string; // "Grains"
  unit: string; // "bag"
  quantity: number;
}
```

---

### 15.4 Data Source

The same product catalog structure from section 11 drives this UI. No separate data model needed:

```
Category (section 11.3 → ProductCategory)
  └─ Type/Subcategory (e.g. "Beans", "Rice") — middle tier
       └─ Variety (section 11.2 → ProductVariety) — leaf, has price + unit
```

The catalog data (currently seeded/static) should be loaded from the backend via the product endpoints when those are live. Until then, the same hardcoded structure from `home.tsx` / `shop.tsx` can be reused.

---

### 15.5 UX Considerations

- On mobile the category row should be horizontally scrollable with no wrapping — agents will use this on phones in the field.
- Active category and active type should have clear visual distinction (filled button vs outline, or colour change).
- The drill-down should be collapsible — clicking an already-active type closes its variety list (accordion toggle).
- Already-added items should show a checkmark or badge on their variety row so the agent can tell what they've already added without scrolling down to the cart.
- The running request list at the bottom should be always accessible (sticky footer or collapsible sheet). It should show item name, quantity, unit, and an option to remove.
- On submit, the full `RequestLineItem[]` list is sent as the stock request payload.

---

### 15.6 Files to Modify

- Primary: `apps/debridgers-frontend/app/routes/dashboards/agent/request-stock.tsx`
- May need: shared product catalog data (currently duplicated in `home.tsx` and `shop.tsx` — consider extracting to a shared module under `app/data/products.ts` or similar)

---

### 15.7 Implementation Priority

This is a UX improvement to an existing page — not blocked by any other task. Can be done independently of the shop/cart work in sections 1–6. Lower urgency than payment/wallet, but improves daily agent workflow.

| Sub-task                                  | Complexity                                     |
| ----------------------------------------- | ---------------------------------------------- |
| Category row component with active state  | Low                                            |
| Type pills with accordion toggle          | Low                                            |
| Variety list with inline quantity stepper | Medium                                         |
| Running request list (sticky cart)        | Medium                                         |
| Submit request to backend                 | Low (endpoint already exists or near-complete) |
