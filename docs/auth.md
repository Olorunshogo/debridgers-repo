# Authentication API Documentation

## Overview

The Auth module handles registration, login, token refresh, logout, and password reset for **all user types** — `admin`, `agent`, `buyer`, and `company`. There is one unified auth system; the `role` field on the user record determines what they can access after login.

The system uses two JWTs:

- **Access Token** — short-lived (`15m`), sent in `Authorization: Bearer <token>` header
- **Refresh Token** — long-lived (`7d`), sent in `Authorization: Refresh <token>` header for token rotation

All responses follow the global format:

```json
{
  "statusCode": 200,
  "message": "...",
  "data": {},
  "timestamp": "2026-04-02T10:00:00.000Z",
  "version": "v1",
  "path": "/api/v1/auth/login"
}
```

---

## Endpoints

### 1. Register

**Endpoint:** `POST /api/v1/auth/register`

**Auth required:** No

**Description:** Creates a new user account. For agents, registration via this endpoint creates a `pending` agent — the preferred agent flow is `POST /agent/apply` (which also creates a profile and uploads CV). This endpoint is used for direct admin-created accounts or future buyer/company self-registration.

**Request Body (JSON):**

```json
{
  "first_name": "Fatima",
  "last_name": "Bello",
  "email": "fatima@example.com",
  "phone": "08098765432",
  "password": "SecurePass@123",
  "role": "agent"
}
```

| Field        | Type   | Required | Notes                                                         |
| ------------ | ------ | -------- | ------------------------------------------------------------- |
| `first_name` | string | Yes      | Min 2 characters                                              |
| `last_name`  | string | Yes      | Min 2 characters                                              |
| `email`      | string | Yes      | Valid email, case-insensitive                                 |
| `phone`      | string | No       | Min 10 digits                                                 |
| `password`   | string | Yes      | Min 8 characters                                              |
| `role`       | string | No       | `admin` \| `agent` \| `buyer` \| `company` (default: `agent`) |

**Successful Response (201 Created):**

```json
{
  "statusCode": 201,
  "message": "Registration successful",
  "data": {
    "user": {
      "id": 7,
      "first_name": "Fatima",
      "last_name": "Bello",
      "email": "fatima@example.com",
      "phone": "08098765432",
      "role": "agent",
      "is_email_verified": false,
      "created_at": "2026-04-02T10:00:00.000Z"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
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
    { "field": "email", "message": "Invalid email address" },
    { "field": "password", "message": "Password must be at least 8 characters" }
  ]
}

// 409 — Email already registered
{
  "statusCode": 409,
  "message": "Email already registered"
}
```

---

### 2. Login

**Endpoint:** `POST /api/v1/auth/login`

**Auth required:** No

**Description:** Authenticates a user with email and password. Returns both access and refresh tokens. The refresh token is hashed and stored in the database for token rotation.

**Request Body (JSON):**

```json
{
  "email": "fatima@example.com",
  "password": "SecurePass@123"
}
```

**Successful Response (200 OK):**

```json
{
  "statusCode": 200,
  "message": "Login successful",
  "data": {
    "user": {
      "id": 7,
      "first_name": "Fatima",
      "last_name": "Bello",
      "email": "fatima@example.com",
      "role": "agent",
      "is_email_verified": false
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

**Error Responses:**

```json
// 401 — Wrong credentials
{
  "statusCode": 401,
  "message": "Invalid credentials"
}
```

---

### 3. Refresh Tokens

**Endpoint:** `POST /api/v1/auth/refresh`

**Auth required:** Yes — send Refresh token

**Description:** Issues a new pair of access + refresh tokens. The old refresh token is invalidated (rotation). Send the refresh token in the `Authorization` header with the `Refresh` prefix (not `Bearer`).

**Headers:**

```
Authorization: Refresh <refreshToken>
```

**Successful Response (200 OK):**

```json
{
  "statusCode": 200,
  "message": "Tokens refreshed",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

**Error Responses:**

```json
// 401 — Invalid or expired refresh token
{
  "statusCode": 401,
  "message": "Invalid or expired refresh token"
}

// 401 — Token already used (rotation violation)
{
  "statusCode": 401,
  "message": "Access denied"
}
```

---

### 4. Logout

**Endpoint:** `POST /api/v1/auth/logout`

**Auth required:** Yes — Bearer access token

**Description:** Invalidates the user's refresh token in the database. The access token remains valid until it expires naturally (15 minutes). After logout, calls using the old refresh token will return 401.

**Headers:**

```
Authorization: Bearer <accessToken>
```

**Successful Response (200 OK):**

```json
{
  "statusCode": 200,
  "message": "Logged out successfully",
  "data": null
}
```

---

### 5. Forgot Password

**Endpoint:** `POST /api/v1/auth/forgot-password`

**Auth required:** No

**Description:** Initiates password reset. If the email exists, a reset token is generated and emailed to the user with a link. The token expires in **1 hour**. Returns the same response whether the email exists or not (prevents email enumeration).

**Request Body (JSON):**

```json
{
  "email": "fatima@example.com"
}
```

**Successful Response (200 OK):**

```json
{
  "statusCode": 200,
  "message": "Password reset email sent",
  "data": null
}
```

---

### 6. Reset Password

**Endpoint:** `POST /api/v1/auth/reset-password`

**Auth required:** No

**Description:** Consumes the password reset token (from the email link) and sets a new password. The token is single-use and deleted after success.

**Request Body (JSON):**

```json
{
  "token": "a3f8c2d1e9b7...",
  "password": "NewSecurePass@456"
}
```

| Field      | Type   | Required | Notes                     |
| ---------- | ------ | -------- | ------------------------- |
| `token`    | string | Yes      | From the reset email link |
| `password` | string | Yes      | Min 8 characters          |

**Successful Response (200 OK):**

```json
{
  "statusCode": 200,
  "message": "Password reset successful",
  "data": null
}
```

**Error Responses:**

```json
// 401 — Token invalid or expired
{
  "statusCode": 401,
  "message": "Invalid or expired token"
}
```

---

## Using Tokens in Requests

```
# Access protected routes
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...

# Refresh tokens (token rotation)
Authorization: Refresh eyJhbGciOiJIUzI1NiIs...
```

The `role` field inside the JWT payload determines what routes the user can access:

| Role      | Access                                 |
| --------- | -------------------------------------- |
| `admin`   | All `/admin/*` routes                  |
| `agent`   | All `/agent/*` routes (after approval) |
| `buyer`   | `/buyer/*` routes (when built)         |
| `company` | `/company/*` routes (when built)       |

---

## JWT Payload Structure

```json
{
  "sub": 7,
  "email": "fatima@example.com",
  "role": "agent",
  "iat": 1743588000,
  "exp": 1743588900
}
```

---

## Token Expiry Reference

| Token                | Default TTL | Configurable via                 |
| -------------------- | ----------- | -------------------------------- |
| Access Token         | 15 minutes  | `ACCESS_TOKEN_EXPIRY` in `.env`  |
| Refresh Token        | 7 days      | `REFRESH_TOKEN_EXPIRY` in `.env` |
| Password Reset Token | 1 hour      | Hardcoded in `auth.service.ts`   |
