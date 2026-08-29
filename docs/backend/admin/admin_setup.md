# Two-Tier Admin Setup Guide

## Architecture

**Super Admin** → Invites → **Sub Admin** (via email code)

Both require:

1. JWT Bearer Token
2. X-Admin-Key Header

## Environment Setup

```env
SUPER_ADMIN_KEY=<32-byte random hex string>
```

Generate with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Database Schema

**users table** (new columns):

- `admin_tier` (varchar 20): 'super_admin' or 'sub_admin'
- `admin_api_key` (varchar 255): Unique key for sub_admin only

**admin_invites table** (new):

- `invite_code` (varchar 32): Random 32-char hex, expires in 10 minutes
- `email` (varchar 255)
- `invited_by_admin_id` (foreign key)
- `used_at` (timestamp nullable): When invite was used
- `used_by_admin_id` (foreign key nullable)
- `expires_at` (timestamp): 10 minutes from creation

## Setup Steps

### 1. Create Initial Super Admin

```sql
INSERT INTO users (
  first_name, last_name, email, password, role, admin_tier, is_email_verified,
  created_at, updated_at
) VALUES (
  'Admin', 'User', 'admin@debridgers.com',
  '$2a$10$...[bcryptjs hashed password]...',
  'admin',
  'super_admin',
  true,
  NOW(), NOW()
);
```

### 2. Super Admin Login

```bash
POST /auth/login
{
  "email": "admin@debridgers.com",
  "password": "your_password"
}
```

Save the `access_token` from response.

### 3. Invite Sub Admin

```bash
POST /admin/invites
Authorization: Bearer <access_token>
X-Admin-Key: <SUPER_ADMIN_KEY from .env>
Content-Type: application/json

{
  "email": "newadmin@example.com"
}
```

Response includes `invite_code` (valid 10 minutes).

Email sent to invitee with code in body (not URL).

### 4. Sub Admin Registration

```bash
POST /auth/admin/register
Content-Type: application/json

{
  "email": "newadmin@example.com",
  "password": "their_password",
  "first_name": "Jane",
  "last_name": "Admin",
  "invite_code": "34dcdf7de4d267a048742939aff9cedb"
}
```

Response includes `admin_api_key` — **must be saved securely**.

### 5. Sub Admin Subsequent Use

```bash
# Login
POST /auth/login
{
  "email": "newadmin@example.com",
  "password": "their_password"
}

# Use admin endpoints
GET /admin/buyers
Authorization: Bearer <access_token>
X-Admin-Key: <their_admin_api_key>
```

## Security

- **Invite codes**: 10-minute expiry, sent in email body (not URL params)
- **API Keys**: 64-character hex, generated per sub_admin
- **Header auth**: Role-specific keys prevent JWT reuse without proper key
- **Guards**: AuthGuard → AdminKeyGuard → RolesGuard

## Endpoints

- `POST /admin/invites` — Create invite (super_admin)
- `POST /auth/admin/register` — Register as sub_admin (public, invite required)
- `POST /admin/buyers`, `GET /admin/deliveries/pending`, etc. — Protected by both guards
