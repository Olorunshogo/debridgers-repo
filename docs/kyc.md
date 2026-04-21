# KYC Flow Documentation

## Overview

KYC (Know Your Customer) is a mandatory gate before an agent can request stock or process orders. It is a two-step process: the agent submits documents, and an admin reviews and approves or rejects them.

---

## KYC States

| State           | Meaning                                     |
| --------------- | ------------------------------------------- |
| `not_submitted` | Default - agent has not submitted KYC yet   |
| `submitted`     | Agent submitted - awaiting admin review     |
| `approved`      | Admin approved - agent is fully operational |
| `rejected`      | Admin rejected - agent can resubmit         |

---

## Prerequisites

Before KYC can be submitted:

1. Agent application must be `status: approved` (admin must approve the application first)
2. KYC must not already be `submitted` or `approved`

---

## Flow

```
Agent approved by admin
        ↓
Agent submits KYC documents
  POST /api/v1/agent/kyc
  → id_front (photo of ID document)
  → id_selfie (selfie holding ID)
  → id_type, bank_name, account_number, account_name
        ↓
kyc_status → "submitted"
        ↓
Admin reviews pending KYC
  GET /api/v1/admin/kyc
        ↓
Admin approves or rejects
  PATCH /api/v1/admin/agents/:id/kyc
  { "action": "approved" }
  OR
  { "action": "rejected", "reason": "Selfie unclear" }
        ↓
If approved: kyc_status → "approved"
  → Agent can now request stock and process orders

If rejected: kyc_status → "rejected"
  → Agent sees rejection reason via GET /agent/kyc
  → Agent can resubmit new documents
```

---

## Agent Endpoints

### POST /api/v1/agent/kyc

Submit KYC documents. Uses `multipart/form-data`.

**Headers:** `Authorization: Bearer <agentToken>`

**Form fields:**

| Field                 | Type   | Required | Notes                                    |
| --------------------- | ------ | -------- | ---------------------------------------- |
| `id_type`             | string | Yes      | `NIN` \| `Passport` \| `Drivers License` |
| `bank_name`           | string | Yes      | Min 2 chars                              |
| `bank_account_number` | string | Yes      | Exactly 10 digits                        |
| `bank_account_name`   | string | Yes      | Min 2 chars                              |
| `id_front`            | file   | Yes      | Front of ID document (image)             |
| `id_selfie`           | file   | Yes      | Selfie holding the ID (image)            |

**Response (200):**

```json
{
  "message": "KYC submitted successfully. We will review and get back to you.",
  "data": null
}
```

**Error cases:**

```json
// Agent application not approved yet
{ "statusCode": 400, "message": "Your application must be approved before submitting KYC" }

// Already submitted or approved
{ "statusCode": 400, "message": "KYC already submitted or approved. Contact support to resubmit." }

// Missing files
{ "statusCode": 400, "message": "Both ID document and selfie photo are required" }
```

---

### GET /api/v1/agent/kyc

Check current KYC status. Agent can use this to see if their KYC was rejected and why.

**Response (200):**

```json
{
  "data": {
    "kyc_status": "rejected",
    "kyc_rejection_reason": "Selfie photo is unclear, please retake",
    "id_type": "NIN",
    "bank_name": "GTBank",
    "bank_account_name": "Amina Yusuf"
  }
}
```

---

## Admin Endpoints

### GET /api/v1/admin/kyc

Returns all agents with `kyc_status: submitted` awaiting review. Includes document URLs and bank details.

**Headers:** `Authorization: Bearer <adminToken>`

---

### PATCH /api/v1/admin/agents/:id/kyc

Approve or reject a submitted KYC. Only works when agent's `kyc_status` is `submitted`.

**Body:**

```json
{ "action": "approved" }
```

```json
{ "action": "rejected", "reason": "ID document expired" }
```

| Field    | Type   | Required | Values                                     |
| -------- | ------ | -------- | ------------------------------------------ |
| `action` | string | Yes      | `approved` \| `rejected`                   |
| `reason` | string | No       | Max 500 chars. Shown to agent on rejection |

**Response (200):**

```json
{ "message": "KYC approved successfully", "data": null }
```

**Error:**

```json
// No submitted KYC found
{ "statusCode": 404, "message": "No submitted KYC found for this agent" }
```

---

## What KYC Unlocks

Once `kyc_status: approved`, the agent can:

- `POST /agent/stock/request` - request stock packs
- Process buyer orders (when orders module is live)
- Access full operational features

Without KYC approval, stock requests return:

```json
{
  "statusCode": 400,
  "message": "KYC verification required before requesting stock"
}
```
