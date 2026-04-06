# Admin API Documentation

## Overview

The Admin module provides full platform oversight: viewing the dashboard stats, managing agent applications (approve/reject), setting agent targets, viewing all contact leads, and marking commissions as paid.

**All admin routes require:**

- A valid `Authorization: Bearer <accessToken>` header
- The authenticated user must have `role: admin`

Any request without a valid admin token returns `401 Unauthorized` or `403 Forbidden`.

---

## Admin Login

Admins use the shared auth endpoint. See [auth.md](./auth.md).

**Endpoint:** `POST /api/v1/auth/login`

```json
{
  "email": "admin@debridgers.com",
  "password": "Admin@2026!"
}
```

Default admin credentials are set via `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `.env` and seeded with `pnpm db:seed`.

---

## Endpoints

### 1. Dashboard Stats

**Endpoint:** `GET /api/v1/admin/dashboard`

**Auth required:** Yes — role: `admin`

**Description:** Returns a high-level summary of platform activity — agent counts, pending items, total sales, and lead volume.

**Successful Response (200 OK):**

```json
{
  "statusCode": 200,
  "message": "Dashboard stats retrieved",
  "data": {
    "total_agents": 12,
    "pending_agents": 3,
    "total_sales": "1250000.00",
    "pending_commissions": "87500.00",
    "total_leads": 45
  }
}
```

---

### 2. List All Agents

**Endpoint:** `GET /api/v1/admin/agents`

**Auth required:** Yes — role: `admin`

**Description:** Returns all agents with their profile details, ordered by newest application first. Optionally filter by status.

**Query Parameters:**

| Param    | Type   | Required | Options                               |
| -------- | ------ | -------- | ------------------------------------- |
| `status` | string | No       | `pending` \| `approved` \| `rejected` |

**Example:**

```
GET /api/v1/admin/agents?status=pending
```

**Successful Response (200 OK):**

```json
{
  "statusCode": 200,
  "message": "Agents retrieved",
  "data": [
    {
      "id": 5,
      "first_name": "Amina",
      "last_name": "Yusuf",
      "email": "amina@example.com",
      "phone": "08012345678",
      "status": "pending",
      "target": 0,
      "cv_url": "https://res.cloudinary.com/drk3myhz2/...",
      "address": "12 Barnawa Road, Kaduna",
      "admin_notes": null,
      "applied_at": "2026-04-02T08:30:00.000Z"
    }
  ]
}
```

---

### 3. Approve or Reject an Agent

**Endpoint:** `PATCH /api/v1/admin/agents/:id/status`

**Auth required:** Yes — role: `admin`

**Description:** Updates an agent's application status. On **approval**, a new temporary password is generated and emailed to the agent. On **rejection**, a rejection email is sent with the optional reason.

**URL Parameter:**

- `:id` — the agent's user ID (integer)

**Request Body (JSON):**

```json
{
  "status": "approved",
  "admin_notes": "Great profile, approved for Kaduna North zone"
}
```

| Field         | Type   | Required | Options                                        |
| ------------- | ------ | -------- | ---------------------------------------------- |
| `status`      | string | Yes      | `approved` \| `rejected`                       |
| `admin_notes` | string | No       | Max 500 characters. Sent to agent on rejection |

**Successful Response — Approved (200 OK):**

```json
{
  "statusCode": 200,
  "message": "Agent approved successfully",
  "data": null
}
```

The agent receives an email containing their temporary password.

**Successful Response — Rejected (200 OK):**

```json
{
  "statusCode": 200,
  "message": "Agent rejected successfully",
  "data": null
}
```

**Error Responses:**

```json
// 404 — Agent not found
{ "statusCode": 404, "message": "Agent not found" }

// 400 — Invalid status value
{ "statusCode": 400, "message": "Validation failed", "errors": [...] }
```

---

### 4. Set Agent Sales Target

**Endpoint:** `PATCH /api/v1/admin/agents/:id/target`

**Auth required:** Yes — role: `admin`

**Description:** Sets or updates the monthly sales target (number of pages) for a specific agent.

**URL Parameter:**

- `:id` — the agent's user ID

**Request Body (JSON):**

```json
{
  "target": 20
}
```

**Successful Response (200 OK):**

```json
{
  "statusCode": 200,
  "message": "Target updated",
  "data": {
    "agentId": 5,
    "target": 20
  }
}
```

---

### 5. View All Contact Leads

**Endpoint:** `GET /api/v1/admin/leads`

**Auth required:** Yes — role: `admin`

**Description:** Returns all submissions from the landing page contact form, ordered by newest first. Use this to follow up with potential customers or partners.

**Successful Response (200 OK):**

```json
{
  "statusCode": 200,
  "message": "Leads retrieved",
  "data": [
    {
      "id": 1,
      "full_name": "Chukwudi Obi",
      "email": "chukwudi@example.com",
      "message": "I'd like to order weekly for my restaurant.",
      "created_at": "2026-04-01T15:00:00.000Z"
    }
  ]
}
```

---

### 6. Mark Commission as Paid

**Endpoint:** `PATCH /api/v1/admin/commissions/:id/paid`

**Auth required:** Yes — role: `admin`

**Description:** Marks a commission record as paid and records the payment timestamp. Use this after manually transferring the agent's share.

**URL Parameter:**

- `:id` — commission ID (integer)

**Successful Response (200 OK):**

```json
{
  "statusCode": 200,
  "message": "Commission marked as paid",
  "data": null
}
```

---

### 7. Create Paystack Subaccount for Agent

**Endpoint:** `POST /api/v1/payment/subaccount/:agentId`

**Auth required:** Yes — role: `admin`

**Description:** Creates a Paystack subaccount for an approved agent. Once created, future payments to that agent will be split automatically via Paystack — 30% to agent, 70% to Debridgers. Run this once per agent after approval.

**URL Parameter:**

- `:agentId` — the agent's user ID

**Successful Response (201 Created):**

```json
{
  "statusCode": 201,
  "message": "Subaccount created",
  "data": {
    "subaccount_code": "ACCT_8f4s1eq7ml6rlzj"
  }
}
```

**Note:** Agent's bank account details must be collected separately and passed to Paystack manually or via an extended onboarding flow.

---

## Admin Workflow Summary

```
1. New agent applies → POST /agent/apply (public)
         ↓
2. Admin reviews: GET /admin/agents?status=pending
         ↓
3. Admin approves/rejects: PATCH /admin/agents/:id/status
         ↓ (if approved)
4. Admin creates Paystack subaccount: POST /payment/subaccount/:agentId
         ↓
5. Admin sets sales target: PATCH /admin/agents/:id/target
         ↓
6. Agent sells, submits report: POST /agent/report
         ↓
7. Admin reviews commissions: GET /admin/dashboard (pending_commissions)
         ↓
8. Admin pays agent + marks paid: PATCH /admin/commissions/:id/paid
```

---

## Security Notes

- Admin routes are double-guarded: `AuthGuard` (valid JWT) + `RolesGuard` (`role === 'admin'`)
- The seeded admin password should be changed immediately after first login in production
- Admin JWTs expire in `15m` — refresh using `POST /auth/refresh` with the Refresh token
- There is no public admin registration endpoint — admins are created via the seeder or directly in the database
