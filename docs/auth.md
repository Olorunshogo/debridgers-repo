# Authentication API Documentation

## Overview

The Auth module handles registration, login, token refresh, logout, and password reset for **all user types** — `admin`, `agent`, `buyer`, and `company`.

The system uses two JWTs:

- **Access Token** — short-lived (`15m`), sent as `Authorization: Bearer <token>`
- **Refresh Token** — long-lived (`7d`), sent as `Authorization: Refresh <token>` for rotation

> **Note for agents:** Login is blocked until an admin approves the application. Attempting to log in with a `pending` agent account returns `401` with message `"Your account is not yet approved. Please contact customer care."`

---

## Endpoints

### POST /api/v1/auth/register

Creates a new user account directly. For agents, prefer `POST /agent/apply` which also creates the agent profile.

**Body:**

```json
{
  "first_name": "Fatima",
  "last_name": "Bello",
  "email": "fatima@example.com",
  "phone": "08098765432",
  "password": "SecurePass@123",
  "role": "buyer"
}
```

| Field        | Required | Notes                                                   |
| ------------ | -------- | ------------------------------------------------------- |
| `first_name` | Yes      | Min 2 chars                                             |
| `last_name`  | Yes      | Min 2 chars                                             |
| `email`      | Yes      | Valid email, case-insensitive                           |
| `phone`      | No       | Min 10 digits                                           |
| `password`   | Yes      | Min 8 chars                                             |
| `role`       | No       | `admin \| agent \| buyer \| company` (default: `agent`) |

**Response (201):**

```json
{
  "data": {
    "user": { "id": 7, "email": "fatima@example.com", "role": "buyer" },
    "accessToken": "eyJhbGci...",
    "refreshToken": "eyJhbGci..."
  }
}
```

**Errors:** `400` validation | `409` email already registered

---

### POST /api/v1/auth/login

**Body:**

```json
{ "email": "fatima@example.com", "password": "SecurePass@123" }
```

**Response (200):**

```json
{
  "data": {
    "user": { "id": 7, "first_name": "Fatima", "role": "buyer" },
    "accessToken": "eyJhbGci...",
    "refreshToken": "eyJhbGci..."
  }
}
```

**Errors:**

- `401` — wrong credentials: `"Invalid credentials"`
- `401` — agent not approved: `"Your account is not yet approved. Please contact customer care."`

---

### POST /api/v1/auth/refresh

Rotates tokens. Old refresh token is invalidated.

**Header:** `Authorization: Refresh <refreshToken>`

**Response (200):**

```json
{
  "data": {
    "accessToken": "eyJhbGci...",
    "refreshToken": "eyJhbGci..."
  }
}
```

**Errors:** `401` invalid/expired | `401` rotation violation (`"Access denied"`)

---

### POST /api/v1/auth/logout

Invalidates the stored refresh token. Access token naturally expires after 15 minutes.

**Header:** `Authorization: Bearer <accessToken>`

**Response (200):** `{ "data": null, "message": "Logged out successfully" }`

---

### POST /api/v1/auth/forgot-password

Sends a password reset email. Always returns success (prevents email enumeration).

**Body:** `{ "email": "fatima@example.com" }`

---

### POST /api/v1/auth/reset-password

Consumes a single-use reset token and sets a new password.

**Body:**

```json
{ "token": "a3f8c2d1e9b7...", "password": "NewSecurePass@456" }
```

**Errors:** `401` invalid or expired token

---

## Using Tokens

```
# Access protected routes
Authorization: Bearer eyJhbGci...

# Refresh token rotation
Authorization: Refresh eyJhbGci...
```

| Role      | Access                                       |
| --------- | -------------------------------------------- |
| `admin`   | All `/admin/*` routes                        |
| `agent`   | All `/agent/*` routes (after approval + KYC) |
| `buyer`   | `/buyer/*` routes                            |
| `company` | `/company/*` routes                          |

---

## JWT Payload

```json
{
  "sub": 7,
  "email": "fatima@example.com",
  "role": "buyer",
  "iat": 1743588000,
  "exp": 1743588900
}
```

---

## Token Reference

| Token                | Default TTL | Env variable           |
| -------------------- | ----------- | ---------------------- |
| Access Token         | 15 minutes  | `ACCESS_TOKEN_EXPIRY`  |
| Refresh Token        | 7 days      | `REFRESH_TOKEN_EXPIRY` |
| Password Reset Token | 1 hour      | hardcoded              |
