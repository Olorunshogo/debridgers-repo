# Wallet, Stock & Commission Documentation

## Overview

Agents operate in **Mode 2** (stock-based distribution):

1. Agent requests stock from Debridgers warehouse
2. Admin fulfils the request (dispatches packs)
3. Agent sells packs to buyers
4. Agent remits payment back to Debridgers
5. Commission is credited to agent's wallet

---

## Wallet

Each agent gets a wallet automatically when their application is approved. All amounts are stored in **kobo** (₦1 = 100 kobo).

### GET /api/v1/agent/wallet

**Auth:** `Bearer <agentToken>`

Returns the agent's current wallet state.

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

| Field               | Description                                                      |
| ------------------- | ---------------------------------------------------------------- |
| `available_balance` | Balance the agent can withdraw                                   |
| `pending_balance`   | Commission earned but not yet confirmed (pending order delivery) |

> **Conversion:** `250000 kobo = ₦2,500`

---

## Stock

### Pricing

Each modu pack costs **₦1,300** (`130000` kobo) - this is the amount the agent remits back after selling.

---

### POST /api/v1/agent/stock/request

Request stock packs from the warehouse. **Requires `kyc_status: approved`.**

**Auth:** `Bearer <agentToken>`

**Body:**

```json
{ "quantity": 10 }
```

**Response (201):**

```json
{
  "data": {
    "id": 3,
    "quantity": 10,
    "amount_to_remit": 1300000,
    "status": "pending"
  }
}
```

`amount_to_remit = quantity × 130000 kobo`

**Errors:**

- `400` - `"KYC verification required before requesting stock"` - complete KYC first
- `400` - `"Only approved agents can request stock"` - application not approved

---

### GET /api/v1/agent/stock

Returns all stock requests for the agent with remittance progress.

```json
{
  "data": [
    {
      "id": 3,
      "quantity": 10,
      "status": "fulfilled",
      "amount_to_remit": 1300000,
      "amount_remitted": 650000,
      "fulfilled_at": "2026-04-07T12:00:00.000Z",
      "created_at": "2026-04-07T09:00:00.000Z"
    }
  ]
}
```

Stock request statuses: `pending` → `fulfilled` | `cancelled`

---

### POST /api/v1/agent/stock/remit

Record a payment remittance against a fulfilled stock request. Partial payments are allowed - multiple remittances can be made until `amount_to_remit` is fully covered.

**Auth:** `Bearer <agentToken>`

**Body:**

```json
{
  "stock_request_id": 3,
  "amount_remitted": 650000
}
```

`amount_remitted` is in **kobo**.

**Response (200):**

```json
{
  "data": {
    "stock_request_id": 3,
    "amount_remitted": 650000,
    "amount_to_remit": 1300000,
    "outstanding": 650000
  }
}
```

**Errors:**

- `404` - stock request not found or doesn't belong to agent
- `400` - `"Can only remit against a fulfilled stock request"` - not yet fulfilled by admin
- `400` - `"Remittance exceeds the amount owed"` - cumulative total exceeds `amount_to_remit`

---

## Admin - Stock Management

### GET /api/v1/admin/stock/requests

Returns all agent stock requests with agent name and remittance status.

Filter: `?status=pending|fulfilled|cancelled`

---

### PATCH /api/v1/admin/stock/requests/:id/fulfil

Marks a pending request as fulfilled. This signals to the agent that stock has been dispatched and they can now remit.

**Auth:** `Bearer <adminToken>`

**Errors:**

- `404` - request not found
- `400` - `"Only pending requests can be fulfilled"`

---

### GET /api/v1/admin/stock/inventory

Warehouse overview - total received, total dispatched, current available stock.

```json
{
  "data": {
    "total_received": 500,
    "total_dispatched": 120,
    "current_stock": 380
  }
}
```

`current_stock = total_received − total_dispatched`

---

### POST /api/v1/admin/stock/inventory

Record stock received from supplier.

**Body:**

```json
{
  "quantity": 200,
  "source": "Farm Direct Ltd",
  "notes": "April batch - 200 x 5kg modu packs"
}
```

---

## Commissions

Commissions are calculated automatically. There are four types:

| Type                     | Trigger                                               | Amount                                |
| ------------------------ | ----------------------------------------------------- | ------------------------------------- |
| `direct`                 | Agent submits a sales report                          | Calculated from report amount         |
| `buyer_referral`         | Buyer places an order using agent's `BUYER-XXXX` code | ₦20 per order                         |
| `agent_override`         | Monthly cron - agent recruited other agents           | 5% of recruited agents' monthly sales |
| `state_manager_override` | Monthly cron - for State Managers only                | 2% of all orders in their state       |

### Commission Lifecycle

```
order placed / report submitted
        ↓
commission record created (status: pending)
        ↓
order delivered (confirmed by system)
        ↓
commission status → confirmed
wallet.pending_balance credited
        ↓
admin marks commission paid
PATCH /admin/commissions/:id/paid
        ↓
commission status → paid
wallet.available_balance credited
wallet.pending_balance decremented
```

### Monthly Override Cron

Runs automatically on the **1st of every month** at midnight. Calculates:

- `agent_override` (5%) for each agent who recruited others
- `state_manager_override` (2%) for each State Manager

Maximum referral depth: **2 layers**. An agent cannot earn overrides from agents recruited by their own recruits' recruits.

### GET /api/v1/agent/commissions

Returns all commission records for the logged-in agent.

```json
{
  "data": [
    {
      "id": 8,
      "agent_id": 5,
      "order_id": 22,
      "type": "buyer_referral",
      "amount": "2000",
      "status": "pending",
      "paid_at": null,
      "created_at": "2026-04-07T10:00:00.000Z"
    }
  ]
}
```

### PATCH /api/v1/admin/commissions/:id/paid

Mark a commission as paid after manually transferring funds to the agent. Updates `status → paid` and sets `paid_at` timestamp.
