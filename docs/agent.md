# Agent API Documentation

## Overview

The Agent module handles the full agent lifecycle: applying to become an agent, logging in after approval, viewing the personal dashboard (profile, targets, earnings), submitting sales reports, and checking commission history.

Agents apply publicly (no token required). After admin approval, they receive login credentials via email and can access protected routes using a Bearer JWT.

All responses follow the global format:

```json
{
  "statusCode": 201,
  "message": "...",
  "data": {},
  "timestamp": "2026-04-02T10:00:00.000Z",
  "version": "v1",
  "path": "/api/v1/agent/apply"
}
```

---

## Endpoints

### 1. Apply as Agent

**Endpoint:** `POST /api/v1/agent/apply`

**Auth required:** No

**Description:** Submits an agent application. The agent is created with `status: pending` and the admin is notified. A confirmation email is sent to the applicant. Optionally accepts a CV file upload (`multipart/form-data`).

**Request (multipart/form-data):**

| Field        | Type   | Required | Notes                        |
| ------------ | ------ | -------- | ---------------------------- |
| `first_name` | string | Yes      | Min 2 characters             |
| `last_name`  | string | Yes      | Min 2 characters             |
| `email`      | string | Yes      | Valid email                  |
| `phone`      | string | Yes      | Min 10 digits                |
| `address`    | string | Yes      | Min 5 characters             |
| `nin`        | string | No       | 11-digit National ID         |
| `cv`         | file   | No       | PDF — uploaded to Cloudinary |

**Successful Response (201 Created):**

```json
{
  "statusCode": 201,
  "message": "Application submitted. We'll review and get back to you within 48 hours.",
  "data": {
    "id": 5
  }
}
```

**Error Responses:**

```json
// 400 — Validation failed
{
  "statusCode": 400,
  "message": "Validation failed",
  "errors": [
    { "field": "email", "message": "Invalid email address" }
  ]
}

// 409 — Email already registered
{
  "statusCode": 409,
  "message": "Email already registered"
}
```

---

### 2. Agent Login

Agents use the shared auth endpoint. See [auth.md](./auth.md).

**Endpoint:** `POST /api/v1/auth/login`

```json
{
  "email": "agent@example.com",
  "password": "TemporaryPassword123"
}
```

Returns `accessToken` and `refreshToken`. Use `Authorization: Bearer <accessToken>` on all protected agent routes.

---

### 3. Get My Profile & Dashboard

**Endpoint:** `GET /api/v1/agent/me`

**Auth required:** Yes — role: `agent`

**Description:** Returns the agent's profile, current sales target, status, CV URL, and total earnings to date.

**Headers:**

```
Authorization: Bearer <accessToken>
```

**Successful Response (200 OK):**

```json
{
  "statusCode": 200,
  "message": "Profile retrieved",
  "data": {
    "id": 5,
    "first_name": "Amina",
    "last_name": "Yusuf",
    "email": "amina@example.com",
    "phone": "08012345678",
    "role": "agent",
    "status": "approved",
    "target": 20,
    "cv_url": "https://res.cloudinary.com/drk3myhz2/...",
    "address": "12 Barnawa Road, Kaduna",
    "total_earnings": "45000.00"
  }
}
```

**Error Responses:**

```json
// 401 — No or invalid token
{ "statusCode": 401, "message": "Invalid or expired token" }

// 403 — Wrong role
{ "statusCode": 403, "message": "Insufficient permissions" }
```

---

### 4. Submit Sales Report

**Endpoint:** `POST /api/v1/agent/report`

**Auth required:** Yes — role: `agent`

**Description:** Agent submits a sales report for the day/period. The system automatically calculates and records a 30% commission entry linked to this report.

**Request Body (JSON):**

```json
{
  "pages_sold": 5,
  "amount": 75000,
  "notes": "Sold 5 packages to caterers at Barnawa Market"
}
```

| Field        | Type    | Required | Notes                      |
| ------------ | ------- | -------- | -------------------------- |
| `pages_sold` | integer | Yes      | Min 1                      |
| `amount`     | number  | Yes      | Total sale amount in Naira |
| `notes`      | string  | No       | Max 500 characters         |

**Successful Response (201 Created):**

```json
{
  "statusCode": 201,
  "message": "Report submitted successfully",
  "data": {
    "report_id": 12,
    "commission_earned": 22500
  }
}
```

---

### 5. Get All My Reports

**Endpoint:** `GET /api/v1/agent/reports`

**Auth required:** Yes — role: `agent`

**Description:** Returns all sales reports submitted by the logged-in agent, ordered by newest first.

**Successful Response (200 OK):**

```json
{
  "statusCode": 200,
  "message": "Reports retrieved",
  "data": [
    {
      "id": 12,
      "agent_id": 5,
      "pages_sold": 5,
      "amount": "75000.00",
      "notes": "Sold 5 packages to caterers at Barnawa Market",
      "created_at": "2026-04-02T09:00:00.000Z"
    }
  ]
}
```

---

### 6. Get Commission History

**Endpoint:** `GET /api/v1/agent/commissions`

**Auth required:** Yes — role: `agent`

**Description:** Returns all commission records for the agent. Each commission is linked to a sales report. Status is `pending` until admin marks it as paid.

**Successful Response (200 OK):**

```json
{
  "statusCode": 200,
  "message": "Commissions retrieved",
  "data": [
    {
      "id": 8,
      "agent_id": 5,
      "report_id": 12,
      "amount": "22500.00",
      "rate": "0.30",
      "status": "pending",
      "paid_at": null,
      "created_at": "2026-04-02T09:00:00.000Z"
    }
  ]
}
```

---

## Agent Lifecycle

```
1. Agent submits application → POST /agent/apply
         ↓
2. Admin reviews in dashboard
         ↓
3. Admin approves → PATCH /admin/agents/:id/status { status: "approved" }
         ↓
4. Agent receives email with temporary password
         ↓
5. Agent logs in → POST /auth/login
         ↓
6. Agent views dashboard → GET /agent/me
         ↓
7. Agent submits report → POST /agent/report
         ↓
8. Commission auto-calculated (30%) → stored as pending
         ↓
9. Admin marks commission paid → PATCH /admin/commissions/:id/paid
```

---

## Commission Calculation

Commission is always **30%** of the sale amount reported.

```
pages_sold: 5
amount: ₦75,000
commission: 75,000 × 0.30 = ₦22,500 → agent
company keeps:             ₦52,500
```

The commission rate is configurable via `AGENT_COMMISSION_RATE` in `.env` without code changes.
