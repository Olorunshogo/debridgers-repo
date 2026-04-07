# Admin API Documentation

## Overview

The Admin module provides full platform oversight: dashboard stats, agent management (approve/reject/suspend/KYC), buyer management, stock & inventory management, leads, and commission payouts.

**All admin routes require:**

- `Authorization: Bearer <accessToken>` header
- Authenticated user must have `role: admin`

Returns `401 Unauthorized` without a valid token, `403 Forbidden` for wrong role.

---

## Admin Login

Use the shared auth endpoint. See [auth.md](./auth.md).

```json
POST /api/v1/auth/login
{ "email": "admin@debridgers.com", "password": "Admin@2026!" }
```

Default credentials set via `ADMIN_EMAIL` / `ADMIN_PASSWORD` in `.env`, seeded with `pnpm db:seed`.

---

## Dashboard

### GET /api/v1/admin/dashboard

Returns platform-wide summary stats.

```json
{
  "data": {
    "total_agents": 12,
    "pending_agents": 3,
    "total_buyers": 87,
    "total_orders": 204,
    "total_revenue": "15600000.00",
    "pending_commissions": "87500.00",
    "total_leads": 45
  }
}
```

---

## Agents

### GET /api/v1/admin/agents

Returns all agents. Filter by status with `?status=pending|approved|rejected|suspended`.

```json
{
  "data": [
    {
      "id": 5,
      "first_name": "Amina",
      "last_name": "Yusuf",
      "email": "amina@example.com",
      "phone": "08012345678",
      "status": "pending",
      "state": "Kaduna",
      "lga": "Kaduna North",
      "is_state_manager": false,
      "referral_buyer_code": null,
      "referral_agent_code": null,
      "applied_at": "2026-04-02T08:30:00.000Z"
    }
  ]
}
```

---

### GET /api/v1/admin/agents/:id

Returns a single agent's full profile including wallet and total confirmed commissions.

```json
{
  "data": {
    "id": 5,
    "first_name": "Amina",
    "status": "approved",
    "kyc_status": "approved",
    "id_type": "NIN",
    "id_front_url": "/tmp/uploads/id_front.jpg",
    "id_selfie_url": "/tmp/uploads/id_selfie.jpg",
    "bank_name": "GTBank",
    "bank_account_number": "0123456789",
    "bank_account_name": "Amina Yusuf",
    "referral_buyer_code": "BUYER-A3F2B1C9",
    "referral_agent_code": "AGENT-A3F2B1C9",
    "is_state_manager": false,
    "wallet": {
      "available_balance": 500000,
      "pending_balance": 0
    },
    "total_confirmed_commissions": "150000.00"
  }
}
```

---

### PATCH /api/v1/admin/agents/:id/status

Approve or reject an agent application.

**Body:**

```json
{ "status": "approved", "admin_notes": "Great profile" }
```

| Field         | Type   | Required | Values                   |
| ------------- | ------ | -------- | ------------------------ |
| `status`      | string | Yes      | `approved` \| `rejected` |
| `admin_notes` | string | No       | Max 500 chars            |

On **approval**:

- Unique referral codes generated (`BUYER-XXXX`, `AGENT-XXXX`)
- Wallet created for the agent
- Approval email sent

On **rejection**: rejection email sent with `admin_notes` as reason.

---

### PATCH /api/v1/admin/agents/:id/suspend

Suspends an approved agent (sets status to `suspended`). Suspended agents cannot log in.

---

### PATCH /api/v1/admin/agents/:id/unsuspend

Restores a suspended agent back to `approved`.

---

### PATCH /api/v1/admin/agents/:id/promote-manager

Promotes an approved agent to State Manager for a given state.

**Body:**

```json
{ "managed_state": "Kaduna" }
```

State managers receive a 2% monthly override commission on all orders in their managed state.

---

### PATCH /api/v1/admin/agents/:id/target

Sets the agent's monthly sales target (number of modu packs).

**Body:** `{ "target": 50 }` (sent as JSON integer)

---

## KYC

### GET /api/v1/admin/kyc

Returns all agents with `kyc_status: submitted`, awaiting review.

```json
{
  "data": [
    {
      "id": 5,
      "first_name": "Amina",
      "email": "amina@example.com",
      "kyc_status": "submitted",
      "id_type": "NIN",
      "id_front_url": "/tmp/uploads/...",
      "id_selfie_url": "/tmp/uploads/...",
      "bank_name": "GTBank",
      "bank_account_number": "0123456789",
      "bank_account_name": "Amina Yusuf"
    }
  ]
}
```

---

### PATCH /api/v1/admin/agents/:id/kyc

Approve or reject an agent's KYC submission. Only works when `kyc_status` is `submitted`.

**Body:**

```json
{ "action": "approved" }
```

```json
{ "action": "rejected", "reason": "Selfie photo unclear, please resubmit" }
```

| Field    | Type   | Required | Values                   |
| -------- | ------ | -------- | ------------------------ |
| `action` | string | Yes      | `approved` \| `rejected` |
| `reason` | string | No       | Max 500 chars            |

After KYC approval, the agent can request stock and process orders.

---

## Buyers

### GET /api/v1/admin/buyers

Returns all registered buyers.

### GET /api/v1/admin/buyers/:id

Returns a single buyer with their full order history.

### PATCH /api/v1/admin/buyers/:id/block

Blocks a buyer — prevents them from placing orders.

### PATCH /api/v1/admin/buyers/:id/unblock

Unblocks a buyer.

---

## Stock & Inventory

### GET /api/v1/admin/stock/requests

Returns all agent stock requests. Filter with `?status=pending|fulfilled|cancelled`.

```json
{
  "data": [
    {
      "id": 1,
      "agent_id": 5,
      "agent_name": "Amina",
      "agent_last_name": "Yusuf",
      "quantity": 10,
      "status": "pending",
      "amount_to_remit": 1300000,
      "amount_remitted": 0,
      "fulfilled_at": null,
      "created_at": "2026-04-07T09:00:00.000Z"
    }
  ]
}
```

### PATCH /api/v1/admin/stock/requests/:id/fulfil

Marks a pending stock request as fulfilled (stock dispatched to agent).

### GET /api/v1/admin/stock/inventory

Returns warehouse inventory stats.

```json
{
  "data": {
    "total_received": 500,
    "total_dispatched": 120,
    "current_stock": 380
  }
}
```

### POST /api/v1/admin/stock/inventory

Records stock received from supplier.

**Body:**

```json
{
  "quantity": 200,
  "source": "Farm Direct Ltd",
  "notes": "April batch delivery"
}
```

| Field      | Type   | Required |
| ---------- | ------ | -------- |
| `quantity` | number | Yes      |
| `source`   | string | Yes      |
| `notes`    | string | No       |

---

## Leads

### GET /api/v1/admin/leads

Returns all contact form submissions from the landing page.

---

## Commissions

### PATCH /api/v1/admin/commissions/:id/paid

Marks a commission as paid after manual bank transfer to the agent.

---

## Admin Workflow

```
1. Agent applies          → POST /agent/apply (public)
2. Admin reviews          → GET /admin/agents?status=pending
3. Admin approves         → PATCH /admin/agents/:id/status { status: "approved" }
4. Agent submits KYC      → POST /agent/kyc (agent-side)
5. Admin reviews KYC      → GET /admin/kyc → PATCH /admin/agents/:id/kyc { action: "approved" }
6. Stock requested        → GET /admin/stock/requests?status=pending
7. Admin fulfils          → PATCH /admin/stock/requests/:id/fulfil
8. Agent remits payment   → POST /agent/stock/remit (agent-side)
9. Monthly commissions    → Auto-calculated by cron on 1st of month
10. Admin pays out        → PATCH /admin/commissions/:id/paid
```

---

## Security Notes

- Admin routes are double-guarded: `AuthGuard` + `RolesGuard` (`role === 'admin'`)
- There is no public admin registration — admins are created via seeder or database
- Admin JWTs expire in 15 minutes — refresh using `POST /auth/refresh`
- The seeded admin password should be changed immediately after first login in production
