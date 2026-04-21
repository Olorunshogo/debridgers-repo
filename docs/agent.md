# Agent API Documentation

## Overview

The Agent module handles the full agent lifecycle: applying, onboarding (KYC), stock management, wallet, sales reports, and commissions.

**Agent login is blocked until admin approves the application.** After approval, a wallet and referral codes are auto-created. KYC must be completed before requesting stock.

All responses follow the standard format:

```json
{
  "statusCode": 200,
  "message": "...",
  "data": {},
  "timestamp": "2026-04-07T10:00:00.000Z",
  "version": "v1",
  "path": "/api/v1/agent/..."
}
```

---

## Public Endpoints

### POST /api/v1/agent/apply

Submit an agent application. No auth required. Accepts `multipart/form-data`.

| Field                    | Type   | Required | Notes                            |
| ------------------------ | ------ | -------- | -------------------------------- |
| `first_name`             | string | Yes      | Min 2 chars                      |
| `last_name`              | string | No       | Min 2 chars                      |
| `email`                  | string | Yes      | Valid email                      |
| `phone`                  | string | Yes      | Min 10 digits                    |
| `lga`                    | string | Yes      | Local Government Area            |
| `address`                | string | Yes      | Min 5 chars                      |
| `password`               | string | Yes      | Min 8 chars, mixed case + number |
| `confirm_password`       | string | Yes      | Must match `password`            |
| `referred_by_agent_code` | string | No       | An agent's `AGENT-XXXX` code     |
| `cv`                     | file   | No       | PDF - uploaded to `/tmp`         |

**Response (201):**

```json
{ "data": { "id": 5 } }
```

**Errors:** `400` validation | `409` email already registered

---

## Protected Endpoints (require `Authorization: Bearer <accessToken>`)

All routes below require `role: agent`.

---

### GET /api/v1/agent/me

Returns the agent's profile, status, target, referral codes, and LGA.

---

## Wallet

### GET /api/v1/agent/wallet

Returns the agent's wallet balances (amounts in **kobo**).

```json
{
  "data": {
    "id": 1,
    "agent_id": 5,
    "available_balance": 250000,
    "pending_balance": 50000,
    "updated_at": "2026-04-07T10:00:00.000Z"
  }
}
```

> ₦2,500 available = `250000` kobo

---

## KYC

KYC is required before an agent can request stock or process orders.

### POST /api/v1/agent/kyc

Submit KYC documents. Accepts `multipart/form-data`. Agent must be `status: approved` first.

| Field                 | Type   | Required | Notes                                    |
| --------------------- | ------ | -------- | ---------------------------------------- |
| `id_type`             | string | Yes      | `NIN` \| `Passport` \| `Drivers License` |
| `bank_name`           | string | Yes      | Min 2 chars                              |
| `bank_account_number` | string | Yes      | Exactly 10 digits                        |
| `bank_account_name`   | string | Yes      | Min 2 chars                              |
| `id_front`            | file   | Yes      | Photo of ID document                     |
| `id_selfie`           | file   | Yes      | Selfie holding the ID                    |

**Response (200):**

```json
{ "message": "KYC submitted successfully. We will review and get back to you." }
```

**Errors:**

- `400` - application not yet approved
- `400` - KYC already submitted or approved
- `400` - both files required

---

### GET /api/v1/agent/kyc

Returns current KYC status.

```json
{
  "data": {
    "kyc_status": "submitted",
    "kyc_rejection_reason": null,
    "id_type": "NIN",
    "bank_name": "GTBank",
    "bank_account_name": "Amina Yusuf"
  }
}
```

`kyc_status` values: `not_submitted` | `submitted` | `approved` | `rejected`

---

## Stock

Agents operate in **Mode 2** (stock-based): they request stock from Debridgers, sell it, then remit the proceeds.

Cost per modu pack: **₦1,300** (remitted back to Debridgers after sale).

### POST /api/v1/agent/stock/request

Request stock packs. **Requires `kyc_status: approved`.**

**Body:**

```json
{ "quantity": 10 }
```

**Response (201):**

```json
{
  "data": {
    "id": 1,
    "quantity": 10,
    "amount_to_remit": 1300000,
    "status": "pending"
  }
}
```

**Errors:**

- `400` - KYC not approved
- `400` - agent not approved

---

### POST /api/v1/agent/stock/remit

Record a remittance payment against a fulfilled stock request.

**Body:**

```json
{
  "stock_request_id": 1,
  "amount_remitted": 650000
}
```

- `amount_remitted` is in **kobo**
- Multiple partial remittances are allowed (cumulative)
- Returns error if total exceeds `amount_to_remit`

---

### GET /api/v1/agent/stock

Returns all the agent's stock requests with remittance status.

---

## Reports & Commissions

### POST /api/v1/agent/report

Submit a sales report. Commission is recorded automatically as `type: direct`.

**Body:**

```json
{
  "pages_sold": 5,
  "amount": 75000,
  "notes": "Sold to caterers at Barnawa Market"
}
```

---

### GET /api/v1/agent/reports

Returns all submitted sales reports for the agent.

---

### GET /api/v1/agent/commissions

Returns all commission records for the agent.

Commission types:
| Type | Description |
| ---- | ----------- |
| `direct` | Agent's own sales (direct commission) |
| `buyer_referral` | ₦20 per order from a buyer who used the agent's `BUYER-XXXX` code |
| `agent_override` | 5% monthly override on sales by agents the agent recruited |
| `state_manager_override` | 2% monthly override for State Managers on all orders in their state |

Commission statuses: `pending` → `confirmed` → `paid`

---

## Referral System

Each approved agent gets two codes:

| Code         | Used by              | Effect                                                        |
| ------------ | -------------------- | ------------------------------------------------------------- |
| `BUYER-XXXX` | Buyers at checkout   | Agent earns ₦20 per order placed with this code               |
| `AGENT-XXXX` | New agent applicants | Recruiting agent earns 5% monthly override on recruit's sales |

Maximum referral depth: **2 layers** (direct recruit + their recruits). State managers earn an additional 2% on their entire state.

---

## Agent Lifecycle

```
1. Apply               → POST /agent/apply (public)
2. Login denied        → 401 "Your account is not yet approved"
3. Admin approves      → wallet + referral codes created, email sent
4. Agent logs in       → POST /auth/login ✓
5. Submit KYC          → POST /agent/kyc (upload id_front + id_selfie)
6. Admin approves KYC  → kyc_status: approved
7. Request stock       → POST /agent/stock/request
8. Admin fulfils       → stock dispatched
9. Agent sells + remits → POST /agent/stock/remit
10. Commissions paid   → wallet credited, PATCH /admin/commissions/:id/paid
```
