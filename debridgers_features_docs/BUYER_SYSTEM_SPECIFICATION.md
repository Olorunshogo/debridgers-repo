# Buyer System Specification & Architecture

**Document Version:** 1.0  
**Date Created:** 2026-08-06  
**Deadline:** 2026-08-10  
**Project:** Debridgers Marketplace Platform  
**Author:** Stephanie Nwankwo

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [System Architecture](#system-architecture)
3. [Database Design](#database-design)
4. [API Specifications](#api-specifications)
5. [Frontend Architecture](#frontend-architecture)
6. [Payment Flow](#payment-flow)
7. [Analytics Integration](#analytics-integration)
8. [Security Considerations](#security-considerations)
9. [Implementation Timeline](#implementation-timeline)
10. [Testing Strategy](#testing-strategy)
11. [Risk & Mitigation](#risk--mitigation)

---

## Executive Summary

The Buyer System is a critical component of the Debridgers marketplace platform that enables buyers to:

- Browse and purchase agricultural products
- Manage digital wallets for prepaid transactions
- Checkout using dual payment methods (Wallet + Paystack)
- Track orders and manage delivery
- Integrate with analytics for product insights

**Key Objectives:**

- Provide frictionless checkout experience
- Reduce payment abandonment through flexible payment options
- Enable secure wallet transactions
- Track buyer behavior for product optimization
- Complete implementation by August 10, 2026

---

## System Architecture

### 1.1 High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        BUYER FRONTEND                            │
│  ┌──────────────┬────────────────┬──────────────┐               │
│  │ Browse/Cart  │ Checkout Flow  │ Wallet Mgmt  │               │
│  └──────────────┴────────────────┴──────────────┘               │
└────────────────────────────────────────────────────────────────┬┘
                                                                   │
                    ┌─ HTTPS ─────────────────────┐               │
                    │                              │               │
                    ▼                              ▼               │
        ┌────────────────────────┐    ┌────────────────────────┐  │
        │   BACKEND (NestJS)     │    │  PAYSTACK PAYMENT      │  │
        │  ┌────────────────────┤    │  SERVICE               │  │
        │  │ Auth Guards        │    └────────────────────────┘  │
        │  │ - AuthGuard        │                                 │
        │  │ - RequestKeyGuard  │              │                 │
        │  ├────────────────────┤              │                 │
        │  │ Buyer Controllers  │              ▼                 │
        │  │ - Wallet API       │    ┌────────────────────────┐  │
        │  │ - Orders API       │    │  REDIS CACHE           │  │
        │  │ - Payments API     │    │  - Rate Limiting       │  │
        │  ├────────────────────┤    │  - Session Storage     │  │
        │  │ Business Logic     │    └────────────────────────┘  │
        │  │ - WalletService    │                                 │
        │  │ - OrderService     │              │                 │
        │  │ - PaymentService   │              │                 │
        │  ├────────────────────┤              ▼                 │
        │  │ PostgreSQL DB      │    ┌────────────────────────┐  │
        │  └────────────────────┘    │  POSTHOG ANALYTICS     │  │
        └────────────────────────────│                        │  │
                                     │  Event Tracking        │  │
                                     └────────────────────────┘  │
```

### 1.2 Service Layer Architecture

```
┌─────────────────────────────────────────────────────┐
│              BUYER MODULE                           │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌──────────────────────────────────────────────┐  │
│  │         CONTROLLERS (HTTP Layer)              │  │
│  │  - BuyerController                           │  │
│  │  - WalletController                          │  │
│  │  - OrderController                           │  │
│  │  - PaymentController                         │  │
│  └──────────────────────────────────────────────┘  │
│                       ↓                             │
│  ┌──────────────────────────────────────────────┐  │
│  │         SERVICES (Business Logic)             │  │
│  │  - BuyerService (profile management)         │  │
│  │  - WalletService (balance, transactions)     │  │
│  │  - OrderService (create, update orders)      │  │
│  │  - PaymentService (payment processing)       │  │
│  │  - AnalyticsService (PostHog events)         │  │
│  └──────────────────────────────────────────────┘  │
│                       ↓                             │
│  ┌──────────────────────────────────────────────┐  │
│  │      REPOSITORIES (Data Access)               │  │
│  │  - BuyerRepository                           │  │
│  │  - WalletRepository                          │  │
│  │  - OrderRepository                           │  │
│  │  - TransactionRepository                     │  │
│  └──────────────────────────────────────────────┘  │
│                       ↓                             │
│  ┌──────────────────────────────────────────────┐  │
│  │        DATABASE (PostgreSQL)                  │  │
│  │  - users (existing)                          │  │
│  │  - buyer_wallets (new)                       │  │
│  │  - wallet_transactions (new)                 │  │
│  │  - orders (existing)                         │  │
│  │  - order_items (existing)                    │  │
│  └──────────────────────────────────────────────┘  │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## Database Design

### 2.1 Schema Diagram

```
┌────────────────────────┐
│    users (existing)    │
├────────────────────────┤
│ id (PK)                │
│ first_name             │
│ last_name              │
│ email                  │
│ password_hash          │
│ role                   │
│ is_email_verified      │
│ created_at             │
└───────┬────────────────┘
        │ (1:1)
        │
        ▼
┌──────────────────────────────────────┐
│     buyer_wallets (NEW)              │
├──────────────────────────────────────┤
│ id (PK)                              │
│ user_id (FK → users.id)              │
│ available_balance (BIGINT)           │
│ pending_balance (BIGINT)             │
│ total_deposited (BIGINT)             │
│ created_at (TIMESTAMP)               │
│ updated_at (TIMESTAMP)               │
│                                      │
│ Indices:                             │
│ - UNIQUE(user_id)                    │
│ - INDEX(user_id)                     │
└────────┬─────────────────────────────┘
         │ (1:N)
         │
         ▼
┌─────────────────────────────────────────────┐
│   wallet_transactions (NEW)                 │
├─────────────────────────────────────────────┤
│ id (PK)                                     │
│ wallet_id (FK → buyer_wallets.id)           │
│ type (ENUM: deposit, withdraw, refund)      │
│ amount (BIGINT - in kobo)                   │
│ status (ENUM: pending, completed, failed)   │
│ reference (VARCHAR - Paystack ref)          │
│ description (TEXT)                          │
│ created_at (TIMESTAMP)                      │
│                                             │
│ Indices:                                    │
│ - INDEX(wallet_id)                          │
│ - INDEX(status)                             │
│ - INDEX(created_at)                         │
│ - UNIQUE(reference)                         │
└─────────────────────────────────────────────┘

┌────────────────────────┐
│  orders (existing)     │
├────────────────────────┤
│ id (PK)                │
│ buyer_id (FK → users)  │
│ status                 │
│ total_amount           │
│ delivery_fee           │
│ payment_method         │
│ payment_status         │
│ created_at             │
└────────────────────────┘
```

### 2.2 Data Dictionary

| Table               | Column            | Type         | Constraints                | Description                   |
| ------------------- | ----------------- | ------------ | -------------------------- | ----------------------------- |
| buyer_wallets       | id                | SERIAL       | PK                         | Unique wallet identifier      |
| buyer_wallets       | user_id           | INTEGER      | FK, UNIQUE                 | Reference to buyer user       |
| buyer_wallets       | available_balance | BIGINT       | NOT NULL, DEFAULT 0        | Balance in kobo (₦X,XXX)      |
| buyer_wallets       | pending_balance   | BIGINT       | NOT NULL, DEFAULT 0        | Awaiting confirmation in kobo |
| buyer_wallets       | total_deposited   | BIGINT       | NOT NULL, DEFAULT 0        | Lifetime deposits in kobo     |
| wallet_transactions | id                | SERIAL       | PK                         | Transaction identifier        |
| wallet_transactions | wallet_id         | INTEGER      | FK                         | Reference to wallet           |
| wallet_transactions | type              | ENUM         | deposit\|withdraw\|refund  | Transaction type              |
| wallet_transactions | amount            | BIGINT       | NOT NULL                   | Amount in kobo                |
| wallet_transactions | status            | ENUM         | pending\|completed\|failed | Transaction status            |
| wallet_transactions | reference         | VARCHAR(255) | UNIQUE, NULL               | Paystack reference            |

---

## API Specifications

### 3.1 Endpoint Overview

```
WALLET ENDPOINTS
├─ GET    /v1/buyer/wallet
├─ POST   /v1/buyer/wallet/deposit
└─ POST   /v1/buyer/wallet/deposit/confirm

ORDER ENDPOINTS
├─ POST   /v1/buyer/orders
├─ GET    /v1/buyer/orders
├─ GET    /v1/buyer/orders/:id
└─ POST   /v1/buyer/orders/:id/pay
```

### 3.2 Detailed Endpoint Specifications

#### 3.2.1 GET /v1/buyer/wallet

**Purpose:** Retrieve buyer wallet balance and transaction history

**Authentication:**

- AuthGuard (JWT required)
- RequestKeyGuard (X-Request-Key header required)

**Query Parameters:**

```
- page: integer (default: 1)
- limit: integer (default: 10, max: 50)
- status: enum (pending|completed|failed, optional)
```

**Success Response (200):**

```json
{
  "statusCode": 200,
  "message": "Wallet retrieved",
  "data": {
    "wallet": {
      "id": 1,
      "available_balance": 500000,
      "pending_balance": 100000,
      "total_deposited": 1000000
    },
    "transactions": [
      {
        "id": 1,
        "type": "deposit",
        "amount": 100000,
        "status": "completed",
        "reference": "paystack_ref_123",
        "description": "Deposit via Paystack",
        "created_at": "2026-08-06T10:30:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 25
    }
  }
}
```

**Error Response (401):**

```json
{
  "statusCode": 401,
  "message": "Missing Authorization header"
}
```

---

#### 3.2.2 POST /v1/buyer/wallet/deposit

**Purpose:** Initiate Paystack deposit to wallet

**Authentication:**

- AuthGuard (JWT required)
- RequestKeyGuard (X-Request-Key header required)

**Request Body:**

```json
{
  "amount_kobo": 100000
}
```

**Validation:**

- amount_kobo must be >= 10000 (₦100 minimum)
- amount_kobo must be <= 10000000 (₦100,000 maximum)

**Success Response (201):**

```json
{
  "statusCode": 201,
  "message": "Deposit initiated",
  "data": {
    "transaction_id": 5,
    "amount_kobo": 100000,
    "authorization_url": "https://checkout.paystack.com/...",
    "reference": "paystack_ref_abc123"
  }
}
```

**Business Logic:**

1. Validate amount is within limits
2. Create wallet_transaction (status: pending)
3. Call Paystack API to generate checkout URL
4. Store Paystack reference
5. Return authorization_url for frontend redirect

---

#### 3.2.3 POST /v1/buyer/wallet/deposit/confirm

**Purpose:** Confirm Paystack deposit via webhook

**Authentication:**

- None (Paystack signature verification)

**Request Body:**

```json
{
  "reference": "paystack_ref_abc123"
}
```

**Verification:**

```
1. Verify X-Paystack-Signature header matches computed HMAC-SHA512
2. Prevent replay attacks with timestamp validation
```

**Success Response (200):**

```json
{
  "statusCode": 200,
  "message": "Deposit confirmed",
  "data": {
    "wallet_id": 1,
    "available_balance": 600000,
    "amount_added": 100000
  }
}
```

**Business Logic:**

1. Verify Paystack signature
2. Query Paystack API to confirm payment
3. Update wallet_transaction (status: completed)
4. Add amount to buyer_wallets.available_balance
5. Emit PostHog event: wallet_deposit_completed
6. Send confirmation email to buyer

---

#### 3.2.4 POST /v1/buyer/orders

**Purpose:** Create order from cart

**Authentication:**

- AuthGuard (JWT required)
- RequestKeyGuard (X-Request-Key header required)

**Request Body:**

```json
{
  "delivery_address": "123 Barnawa Street, Kaduna",
  "zone_id": 1,
  "delivery_time": "today",
  "cart": [
    {
      "product_id": 1,
      "name": "Local White Rice",
      "price_kobo": 4200000,
      "unit": "50kg bag",
      "qty": 2
    }
  ]
}
```

**Validation:**

- delivery_address: required, min 10 chars
- zone_id: must exist in zones table
- cart: array with min 1 item
- product prices must match current product prices (prevent manipulation)

**Success Response (201):**

```json
{
  "statusCode": 201,
  "message": "Order created",
  "data": {
    "order": {
      "id": 45,
      "status": "pending_payment",
      "items": [
        {
          "product_id": 1,
          "name": "Local White Rice",
          "qty": 2,
          "unit_price": 4200000,
          "subtotal": 8400000
        }
      ],
      "subtotal_kobo": 8400000,
      "delivery_fee_kobo": 50000,
      "total_kobo": 8450000,
      "delivery_address": "123 Barnawa Street, Kaduna",
      "zone_id": 1,
      "created_at": "2026-08-06T10:35:00Z"
    }
  }
}
```

**Business Logic:**

1. Validate all products exist and prices match
2. Calculate delivery fee from zone
3. Create order record with status: pending_payment
4. Create order_items records
5. Reserve inventory (optional based on business rules)
6. Emit PostHog event: order_created

---

#### 3.2.5 GET /v1/buyer/orders

**Purpose:** List buyer's orders with filtering

**Authentication:**

- AuthGuard (JWT required)
- RequestKeyGuard (X-Request-Key header required)

**Query Parameters:**

```
- status: enum (pending_payment|confirmed|shipped|delivered|cancelled)
- payment_status: enum (unpaid|paid)
- page: integer (default: 1)
- limit: integer (default: 10)
- sort: enum (created_at|updated_at, default: created_at)
- order: enum (asc|desc, default: desc)
```

**Success Response (200):**

```json
{
  "statusCode": 200,
  "message": "Orders retrieved",
  "data": {
    "orders": [
      {
        "id": 45,
        "status": "delivered",
        "payment_status": "paid",
        "total_kobo": 8450000,
        "item_count": 2,
        "delivery_address": "123 Barnawa Street",
        "created_at": "2026-08-05T14:20:00Z",
        "estimated_delivery": "2026-08-07T18:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 25
    }
  }
}
```

---

#### 3.2.6 GET /v1/buyer/orders/:id

**Purpose:** Retrieve detailed order information

**Authentication:**

- AuthGuard (JWT required)
- RequestKeyGuard (X-Request-Key header required)

**Authorization:**

- Order must belong to authenticated buyer

**Success Response (200):**

```json
{
  "statusCode": 200,
  "message": "Order retrieved",
  "data": {
    "id": 45,
    "status": "delivered",
    "payment_method": "wallet",
    "payment_status": "paid",
    "items": [
      {
        "product_id": 1,
        "name": "Local White Rice",
        "qty": 2,
        "unit_price": 4200000,
        "subtotal": 8400000
      }
    ],
    "subtotal_kobo": 8400000,
    "delivery_fee_kobo": 50000,
    "total_kobo": 8450000,
    "delivery_address": "123 Barnawa Street, Kaduna",
    "zone_name": "Kaduna North",
    "created_at": "2026-08-05T14:20:00Z",
    "estimated_delivery": "2026-08-07T18:00:00Z",
    "tracking_url": "https://debridgers.com/track/45"
  }
}
```

**Error Response (404):**

```json
{
  "statusCode": 404,
  "message": "Order not found"
}
```

---

#### 3.2.7 POST /v1/buyer/orders/:id/pay

**Purpose:** Pay order using Wallet or Paystack

**Authentication:**

- AuthGuard (JWT required)
- RequestKeyGuard (X-Request-Key header required)

**Request Body:**

```json
{
  "payment_method": "wallet",
  "amount_kobo": 8450000
}
```

**Validation:**

- payment_method: wallet | paystack
- amount_kobo: must equal order.total_kobo
- order must exist and belong to buyer
- order status must be pending_payment

**Response (Wallet Payment - 200):**

```json
{
  "statusCode": 200,
  "message": "Payment successful",
  "data": {
    "order_id": 45,
    "payment_method": "wallet",
    "amount_kobo": 8450000,
    "status": "confirmed",
    "confirmation_number": "ORD-45-2026-08-06",
    "estimated_delivery": "2026-08-07T18:00:00Z"
  }
}
```

**Response (Paystack Payment - 201):**

```json
{
  "statusCode": 201,
  "message": "Payment initiated",
  "data": {
    "order_id": 45,
    "payment_method": "paystack",
    "authorization_url": "https://checkout.paystack.com/...",
    "reference": "paystack_order_45"
  }
}
```

**Business Logic (Wallet Payment):**

1. Validate order exists and is pending
2. Check wallet.available_balance >= amount
3. Deduct from wallet.available_balance
4. Create wallet_transaction (type: withdraw)
5. Update order (status: confirmed, payment_status: paid)
6. Emit PostHog event: order_paid_wallet
7. Send confirmation email
8. Trigger order fulfillment workflow

**Business Logic (Paystack Payment):**

1. Validate order exists and is pending
2. Create wallet_transaction (status: pending, type: deposit)
3. Generate Paystack checkout URL
4. Return authorization_url for frontend redirect
5. On webhook confirmation → complete order

---

### 3.3 Error Response Format

All endpoints follow standard error format:

```json
{
  "statusCode": 400,
  "message": "Descriptive error message",
  "timestamp": "2026-08-06T10:30:00Z",
  "path": "/v1/buyer/orders",
  "errors": [
    {
      "field": "delivery_address",
      "message": "Delivery address must be at least 10 characters"
    }
  ]
}
```

**Common Status Codes:**

- 200: Success
- 201: Created
- 400: Bad Request (validation error)
- 401: Unauthorized (missing JWT or keys)
- 403: Forbidden (rate limited or access denied)
- 404: Not Found
- 429: Too Many Requests (rate limit)
- 500: Internal Server Error

---

## Frontend Architecture

### 4.1 Component Hierarchy

```
<BuyerApp>
├─ <Navbar>
│  └─ <WalletWidget />
├─ <MainRouter>
│  ├─ <BrowseProductsPage>
│  │  ├─ <ProductGrid />
│  │  └─ <Cart>
│  │     └─ <AddToCartButton />
│  │
│  ├─ <CheckoutPage>
│  │  ├─ <CheckoutProgress
        (Step 1-4) />
│  │  ├─ <Step1_DeliveryInfo />
│  │  ├─ <Step2_OrderReview />
│  │  ├─ <Step3_PaymentMethod />
│  │  └─ <Step4_Confirmation />
│  │
│  ├─ <OrdersPage>
│  │  ├─ <OrdersList />
│  │  └─ <OrderDetail />
│  │
│  └─ <WalletPage>
│     ├─ <WalletBalance />
│     ├─ <DepositForm />
│     └─ <TransactionHistory />
│
└─ <AnalyticsProvider> (PostHog)
```

### 4.2 State Management Flow

```
Redux Store Structure:
┌─ auth/
│  ├─ user (buyer profile)
│  ├─ token (JWT)
│  └─ loading
│
├─ wallet/
│  ├─ balance
│  ├─ pending_balance
│  ├─ transactions
│  └─ loading
│
├─ cart/
│  ├─ items []
│  ├─ subtotal
│  └─ count
│
└─ orders/
   ├─ list []
   ├─ current
   ├─ filter
   └─ loading
```

### 4.3 API Integration Points

```
Frontend → Backend API Calls:

1. Load Wallet Balance
   GET /v1/buyer/wallet
   → Redux: wallet/setBalance

2. Initiate Wallet Deposit
   POST /v1/buyer/wallet/deposit
   → Redirect to Paystack URL

3. Create Order from Cart
   POST /v1/buyer/orders
   → Redux: orders/setCurrentOrder
   → Navigate to Step 3 (Payment)

4. Pay Order
   POST /v1/buyer/orders/:id/pay
   → If wallet: Navigate to order confirmation
   → If paystack: Redirect to Paystack

5. Fetch Orders List
   GET /v1/buyer/orders
   → Redux: orders/setList
```

---

## Payment Flow

### 5.1 Wallet Payment Flow

```
┌─ BUYER INITIATES CHECKOUT ─┐
│                             │
├─ Reviews Order             │
├─ Selects "Pay with Wallet" │
│                             │
└────────────┬────────────────┘
             │
             ▼
┌────────────────────────────────┐
│ CHECK WALLET BALANCE           │
│ available_balance >= total?    │
└─────┬──────────────────┬───────┘
      │ YES              │ NO
      │                  │
      ▼                  ▼
   ┌─────┐         ┌──────────────┐
   │ Pay │         │ Show Modal:  │
   └──┬──┘         │ "Insufficient│
      │            │  Balance"    │
      │            │ [Deposit]    │
      │            └──────────────┘
      │
      ▼
┌─────────────────────────────────┐
│ DEDUCT FROM WALLET              │
│ 1. Create transaction (pending) │
│ 2. Subtract from balance        │
│ 3. Update order (confirmed)     │
└─────────────┬───────────────────┘
              │
              ▼
┌─────────────────────────────────┐
│ CONFIRM & FULFILL               │
│ 1. Send confirmation email      │
│ 2. Emit analytics event         │
│ 3. Trigger fulfillment          │
│ 4. Show tracking                │
└─────────────────────────────────┘
```

### 5.2 Paystack Payment Flow

```
┌─ BUYER INITIATES CHECKOUT ─┐
│                             │
├─ Reviews Order             │
├─ Selects "Pay with Paystack"│
│                             │
└────────────┬────────────────┘
             │
             ▼
┌────────────────────────────────┐
│ CREATE PENDING TRANSACTION      │
│ wallet_transactions (pending)   │
└────────────┬───────────────────┘
             │
             ▼
┌────────────────────────────────┐
│ REDIRECT TO PAYSTACK            │
│ Frontend: window.location       │
│ Backend: authorization_url      │
└────────────┬───────────────────┘
             │
    (User completes payment)
             │
             ▼
┌────────────────────────────────┐
│ PAYSTACK WEBHOOK               │
│ POST /v1/buyer/wallet/          │
│      deposit/confirm            │
│ Verify signature ✓              │
└────────────┬───────────────────┘
             │
             ▼
┌────────────────────────────────┐
│ UPDATE WALLET & ORDER           │
│ 1. Transaction: completed       │
│ 2. Add to available_balance     │
│ 3. Update order: confirmed      │
│ 4. Emit analytics event         │
│ 5. Send confirmation email      │
└────────────────────────────────┘
```

---

## Analytics Integration

### 6.1 PostHog Event Schema

**Event:** `checkout_started`

```json
{
  "distinct_id": "buyer_user_id",
  "event": "checkout_started",
  "properties": {
    "cart_total_kobo": 8450000,
    "items_count": 2,
    "delivery_zone": "Kaduna North",
    "app_version": "1.0.0",
    "timestamp": "2026-08-06T10:30:00Z"
  }
}
```

**Event:** `payment_method_selected`

```json
{
  "distinct_id": "buyer_user_id",
  "event": "payment_method_selected",
  "properties": {
    "payment_method": "wallet|paystack",
    "order_total_kobo": 8450000,
    "wallet_balance_kobo": 500000,
    "timestamp": "2026-08-06T10:32:00Z"
  }
}
```

**Event:** `order_completed`

```json
{
  "distinct_id": "buyer_user_id",
  "event": "order_completed",
  "properties": {
    "order_id": 45,
    "order_total_kobo": 8450000,
    "payment_method": "wallet",
    "items_count": 2,
    "delivery_zone": "Kaduna North",
    "conversion": true,
    "timestamp": "2026-08-06T10:35:00Z"
  }
}
```

**Event:** `wallet_deposit_initiated`

```json
{
  "distinct_id": "buyer_user_id",
  "event": "wallet_deposit_initiated",
  "properties": {
    "deposit_amount_kobo": 100000,
    "current_balance_kobo": 500000,
    "timestamp": "2026-08-06T10:45:00Z"
  }
}
```

**Event:** `wallet_deposit_completed`

```json
{
  "distinct_id": "buyer_user_id",
  "event": "wallet_deposit_completed",
  "properties": {
    "deposit_amount_kobo": 100000,
    "balance_after_kobo": 600000,
    "payment_method": "paystack",
    "timestamp": "2026-08-06T10:46:00Z"
  }
}
```

---

## Security Considerations

### 7.1 Authentication & Authorization

**Multi-Layer Protection:**

```
1. JWT Token (AuthGuard)
   - Validates user identity
   - Extracts user.sub for authorization

2. API Keys (RequestKeyGuard)
   - Validates client origin
   - Headers: X-Request-Key

3. Data Ownership
   - Verify order/wallet belongs to authenticated buyer
   - Prevent cross-buyer access

4. Rate Limiting
   - 5 requests/minute for login
   - Progressive backoff on failed attempts
   - 30m → 45m → 1hr lockout
```

### 7.2 Payment Security

**Paystack Integration:**

```
1. HTTPS Only
   - All payment endpoints encrypted

2. Signature Verification
   - HMAC-SHA512 validation on webhook
   - Timestamp check (prevent replay)

3. Idempotency
   - Store Paystack reference
   - Prevent duplicate payments

4. PCI Compliance
   - Never store card details
   - Paystack handles sensitive data
```

### 7.3 Wallet Security

**Fraud Prevention:**

```
1. Amount Validation
   - Minimum: ₦100 (10,000 kobo)
   - Maximum: ₦100,000 (10,000,000 kobo)

2. Transaction Verification
   - Check user wallet ownership
   - Verify sufficient balance before deduction

3. Audit Trail
   - Log all transactions
   - Track timestamps & IPs
   - Store Paystack reference
```

### 7.4 Data Protection

**GDPR Compliance:**

```
1. Buyer Data
   - Encrypted in database
   - HTTPS in transit
   - Access logs maintained

2. Payment Info
   - No card storage (Paystack handles)
   - Minimal data retention

3. Right to Deletion
   - Anonymize buyer data on request
   - Retain transaction records for 7 years (legal)
```

---

## Implementation Timeline

### Phase 1: Database & Backend Foundation (Aug 6-7)

**Duration:** 2 days  
**Tasks:**

- [ ] Create migration: buyer_wallets table
- [ ] Create migration: wallet_transactions table
- [ ] Update Drizzle schema
- [ ] Run migrations on dev/staging

**Deliverables:**

- Database schema deployed
- Schema definitions in version control

---

### Phase 2: Backend APIs (Aug 7-8)

**Duration:** 2 days  
**Tasks:**

- [ ] Create WalletController (3 endpoints)
- [ ] Create WalletService
- [ ] Create OrderController (2 endpoints)
- [ ] Create PaymentService with Paystack integration
- [ ] Implement wallet payment logic
- [ ] Implement Paystack webhook handler
- [ ] Add guards to all endpoints
- [ ] Add input validation (Zod schemas)

**Deliverables:**

- All 7 API endpoints functional
- Paystack integration verified
- Postman collection created
- API documentation updated

---

### Phase 3: Frontend Components (Aug 8-9)

**Duration:** 1-2 days  
**Tasks:**

- [ ] Create WalletBalance component
- [ ] Create DepositForm component
- [ ] Create Checkout flow (4 steps)
- [ ] Create OrdersList component
- [ ] Create OrderDetail component
- [ ] Integrate Redux for state management
- [ ] Integrate API client hooks
- [ ] Add loading/error states

**Deliverables:**

- Checkout flow UI complete
- Wallet management UI complete
- All components wired to backend APIs
- Responsive design (mobile-first)

---

### Phase 4: Analytics & Refinement (Aug 9)

**Duration:** 1 day  
**Tasks:**

- [ ] Install PostHog SDK (frontend + backend)
- [ ] Implement event tracking (5+ events)
- [ ] Test analytics data flow
- [ ] Add error handling & logging
- [ ] Performance optimization
- [ ] Code review & cleanup

**Deliverables:**

- Analytics fully integrated
- Event tracking verified in PostHog
- Performance benchmarks met

---

### Phase 5: Testing & QA (Aug 9-10)

**Duration:** 1-2 days  
**Tasks:**

- [ ] Unit tests (services + controllers)
- [ ] Integration tests (API endpoints)
- [ ] E2E tests (complete checkout flow)
- [ ] Manual testing (all scenarios)
- [ ] Security testing (OWASP top 10)
- [ ] Load testing (rate limiting)
- [ ] Bug fixes & refinement

**Deliverables:**

- Test coverage > 80%
- All tests passing
- No critical/high severity bugs
- Production-ready code

---

### Phase 6: Deployment & Documentation (Aug 10)

**Duration:** Final day  
**Tasks:**

- [ ] Deploy to staging
- [ ] Staging smoke tests
- [ ] Deploy to production
- [ ] Monitor error rates
- [ ] Create runbook documentation
- [ ] Update API documentation
- [ ] Announce feature to stakeholders

**Deliverables:**

- Live in production
- Documentation complete
- Monitoring active
- Incident response plan ready

---

## Sprint Breakdown

### Sprint 1: Aug 6-7 (2 days)

**Goal:** Database ready, basic API structure

**Backlog:**

1. Database migrations (2 tables)
2. Drizzle schema updates
3. WalletService scaffold
4. OrderService scaffold

**Success Criteria:**

- Migrations run successfully
- Schema validated
- Services can be instantiated

---

### Sprint 2: Aug 7-8 (2 days)

**Goal:** All APIs functional with Paystack

**Backlog:**

1. WalletController (3 endpoints)
2. OrderController (4 endpoints)
3. PaymentService (Paystack integration)
4. Webhook handler
5. Guards & validation
6. Postman collection

**Success Criteria:**

- All 7 endpoints return correct responses
- Paystack integration tested
- Rate limiting works

---

### Sprint 3: Aug 8-9 (1 day)

**Goal:** Frontend checkout flow complete

**Backlog:**

1. Create 8+ components
2. Redux store setup
3. API client integration
4. Responsive design
5. Error handling

**Success Criteria:**

- Can add to cart → checkout → pay
- No console errors
- Mobile responsive

---

### Sprint 4: Aug 9 (1 day)

**Goal:** Analytics & optimization

**Backlog:**

1. PostHog SDK integration
2. Event tracking (5+ events)
3. Performance profiling
4. Bug fixes

**Success Criteria:**

- Events visible in PostHog dashboard
- Page load < 2s
- No memory leaks

---

### Sprint 5: Aug 9-10 (1-2 days)

**Goal:** Testing & production readiness

**Backlog:**

1. Write 30+ tests
2. Manual QA (all scenarios)
3. Security review
4. Load testing
5. Documentation

**Success Criteria:**

- Test coverage > 80%
- Zero critical bugs
- Ready for production

---

## Testing Strategy

### 8.1 Unit Tests

**WalletService Tests:**

```
✓ checkBalance - returns correct balance
✓ deductBalance - reduces balance correctly
✓ addBalance - increases balance correctly
✓ validateAmount - rejects invalid amounts
```

**OrderService Tests:**

```
✓ createOrder - creates valid order
✓ validateCart - detects invalid items
✓ calculateTotal - correct math
✓ verifyOwnership - prevents unauthorized access
```

### 8.2 Integration Tests

**Wallet Payment Flow:**

```
✓ POST /v1/buyer/wallet/deposit → creates transaction
✓ POST /v1/buyer/wallet/deposit/confirm → updates balance
✓ Webhook correctly updates wallet
```

**Order Payment Flow:**

```
✓ POST /v1/buyer/orders → creates order
✓ POST /v1/buyer/orders/:id/pay (wallet) → deducts balance
✓ POST /v1/buyer/orders/:id/pay (paystack) → redirects
✓ Paystack webhook → confirms order
```

### 8.3 E2E Tests (Cypress/Playwright)

**Complete Checkout Flow:**

```
Scenario: Buyer purchases with wallet
1. Browse products
2. Add to cart
3. Go to checkout
4. Enter delivery address
5. Select delivery zone
6. Select wallet payment
7. Confirm payment
8. See order confirmation
✓ Order visible in orders list
```

**Wallet Deposit Flow:**

```
Scenario: Buyer deposits to wallet
1. Open wallet page
2. Enter deposit amount
3. Click "Deposit"
4. Redirect to Paystack
5. Complete payment
6. Return to app
✓ Balance updated
✓ Transaction in history
```

### 8.4 Security Testing

**Input Validation:**

```
✓ XSS prevention (no HTML execution)
✓ SQL injection prevention (parameterized queries)
✓ CSRF tokens (if applicable)
```

**Authorization:**

```
✓ Cannot access other buyer's orders
✓ Cannot deduct from other buyer's wallet
✓ Cannot pay another buyer's order
```

**Rate Limiting:**

```
✓ Blocks after 5 failed login attempts
✓ Progressive backoff enforced (30m/45m/1hr)
✓ Paystack webhook verifies signature
```

---

## Risk & Mitigation

| Risk                                   | Probability | Impact | Mitigation                                 |
| -------------------------------------- | ----------- | ------ | ------------------------------------------ |
| Paystack integration fails             | Low         | High   | Use sandbox for testing, maintain fallback |
| Payment race condition (double charge) | Low         | High   | Use idempotency keys, atomic transactions  |
| Database migration issues              | Medium      | High   | Test migrations on staging first           |
| Frontend not responsive on mobile      | Medium      | Medium | Test on real devices, use mobile-first CSS |
| PostHog analytics misconfigured        | Low         | Low    | Test events in sandbox, validate schema    |
| Rate limiting too aggressive           | Medium      | Medium | Monitor error logs, adjust thresholds      |
| Insufficient wallet balance edge case  | Medium      | Medium | Add buffer checks, show clear messages     |
| Order concurrency conflicts            | Low         | High   | Use row-level locking, version numbers     |

**Contingency Plans:**

1. If Paystack integration fails → Use bank transfer as fallback
2. If timeline slips → Reduce analytics scope (Phase 4 optional)
3. If bugs found late → Rollback to previous version, hotfix in parallel

---

## Success Metrics

By August 10, 2026:

- ✅ 100% of planned API endpoints deployed
- ✅ 80%+ test coverage achieved
- ✅ Zero critical/high severity bugs
- ✅ Frontend checkout functional end-to-end
- ✅ Paystack payments verified in sandbox + production
- ✅ PostHog analytics collecting events
- ✅ Performance: Page load < 2s, API response < 300ms
- ✅ Documentation complete (API + runbook)
- ✅ Team trained on new features

---

## Approval & Sign-Off

| Role          | Name                 | Signature    | Date     |
| ------------- | -------------------- | ------------ | -------- |
| Project Lead  | Stephanie Nwankwo    | ****\_\_**** | **\_\_** |
| Tech Lead     | ********\_\_******** | ****\_\_**** | **\_\_** |
| Product Owner | ********\_\_******** | ****\_\_**** | **\_\_** |

---

**Document Status:** DRAFT - Ready for Review  
**Next Review Date:** August 10, 2026  
**Version History:** v1.0 (2026-08-06)
