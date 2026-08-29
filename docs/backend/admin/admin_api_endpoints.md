================================================================================
ADMIN AUTHENTICATION API ENDPOINTS
================================================================================

BASE URL: http://localhost:4001/api/v1

================================================================================

1. # SUPER ADMIN SETUP & LOGIN

# Generate 2 super admin keys (store in .env)

SUPER_ADMIN_KEY_1=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
SUPER_ADMIN_KEY_2=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")

# Add to .env:

# SUPER_ADMIN_KEY_1=<key1>

# SUPER_ADMIN_KEY_2=<key2>

export SUPER_ADMIN_KEY_1=$SUPER_ADMIN_KEY_1
export SUPER_ADMIN_KEY_2=$SUPER_ADMIN_KEY_2

# Create super_admin in database (run once):

# INSERT INTO users (first_name, last_name, email, password, role, admin_tier, is_email_verified, created_at, updated_at)

# VALUES ('Admin', 'User', 'admin@debridgers.com', '$2a$10$...[bcryptjs hash]...', 'admin', 'super_admin', true, NOW(), NOW());

# Login as super admin

curl -X POST http://localhost:4001/api/v1/auth/login \
 -H "Content-Type: application/json" \
 -d '{
"email": "admin@debridgers.com",
"password": "password"
}' | jq .

# Parse response and save token

SUPER_ADMIN_TOKEN=$(curl -s -X POST http://localhost:4001/api/v1/auth/login \
 -H "Content-Type: application/json" \
 -d '{"email":"admin@debridgers.com","password":"password"}' | jq -r '.data.access_token')

echo "Super Admin Token: $SUPER_ADMIN_TOKEN"

# ================================================================================ 2. CREATE INVITE FOR SUB ADMIN (SUPER ADMIN ONLY)

Endpoint: POST /admin/invites
Required Headers:

- Authorization: Bearer <SUPER_ADMIN_TOKEN>
- X-Admin-Key: <SUPER_ADMIN_KEY_1 or SUPER_ADMIN_KEY_2>
- X-Admin-Tier: super

Request Body:
{
"email": "newadmin@example.com"
}

Response:
{
"success": true,
"data": {
"invite_id": 1,
"invite_code": "34dcdf7de4d267a048742939aff9cedb",
"email": "newadmin@example.com",
"expires_at": "2026-08-21T06:45:00.000Z"
},
"message": "Invite sent to newadmin@example.com. Valid for 10 minutes."
}

# Full curl command

curl -X POST http://localhost:4001/api/v1/admin/invites \
 -H "Authorization: Bearer $SUPER_ADMIN_TOKEN" \
 -H "X-Admin-Key: $SUPER_ADMIN_KEY_1" \
 -H "X-Admin-Tier: super" \
 -H "Content-Type: application/json" \
 -d '{
"email": "newadmin@example.com"
}' | jq .

# Save invite code

INVITE_CODE=$(curl -s -X POST http://localhost:4001/api/v1/admin/invites \
 -H "Authorization: Bearer $SUPER_ADMIN_TOKEN" \
 -H "X-Admin-Key: $SUPER_ADMIN_KEY_1" \
 -H "X-Admin-Tier: super" \
 -H "Content-Type: application/json" \
 -d '{"email":"newadmin@example.com"}' | jq -r '.data.invite_code')

echo "Invite Code: $INVITE_CODE"

# ================================================================================ 3. REGISTER SUB ADMIN (PUBLIC - INVITE REQUIRED)

Endpoint: POST /auth/admin/register
No authentication needed (invite validates user)

Request Body:
{
"email": "newadmin@example.com",
"password": "secure_password_123",
"first_name": "Jane",
"last_name": "Admin",
"invite_code": "34dcdf7de4d267a048742939aff9cedb"
}

Response:
{
"success": true,
"data": {
"user_id": 456,
"email": "newadmin@example.com",
"admin_tier": "sub_admin",
"admin_api_key": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0"
},
"message": "Admin registered successfully. Save your API key securely as backup."
}

# Full curl command

curl -X POST http://localhost:4001/api/v1/auth/admin/register \
 -H "Content-Type: application/json" \
 -d '{
"email": "newadmin@example.com",
"password": "secure_password_123",
"first_name": "Jane",
"last_name": "Admin",
"invite_code": "'$INVITE_CODE'"
}' | jq .

# Save admin API key

SUB_ADMIN_API_KEY=$(curl -s -X POST http://localhost:4001/api/v1/auth/admin/register \
  -H "Content-Type: application/json" \
  -d '{"email":"newadmin@example.com","password":"secure_password_123","first_name":"Jane","last_name":"Admin","invite_code":"'$INVITE_CODE'"}' | jq -r '.data.admin_api_key')

echo "Sub Admin API Key: $SUB_ADMIN_API_KEY"

# ================================================================================ 4. SUB ADMIN LOGIN

Endpoint: POST /auth/login
Request Body:
{
"email": "newadmin@example.com",
"password": "secure_password_123"
}

# Full curl command

curl -X POST http://localhost:4001/api/v1/auth/login \
 -H "Content-Type: application/json" \
 -d '{
"email": "newadmin@example.com",
"password": "secure_password_123"
}' | jq .

# Save token

SUB_ADMIN_TOKEN=$(curl -s -X POST http://localhost:4001/api/v1/auth/login \
 -H "Content-Type: application/json" \
 -d '{"email":"newadmin@example.com","password":"secure_password_123"}' | jq -r '.data.access_token')

echo "Sub Admin Token: $SUB_ADMIN_TOKEN"

# ================================================================================ 5. PROTECTED ADMIN ENDPOINTS

All admin endpoints require:

- Authorization: Bearer <TOKEN>
- X-Admin-Key: <KEY>
- X-Admin-Tier: super | sub

---

## 5.1 LIST BUYERS

GET /admin/buyers

curl -X GET http://localhost:4001/api/v1/admin/buyers \
 -H "Authorization: Bearer $SUB_ADMIN_TOKEN" \
 -H "X-Admin-Key: $SUB_ADMIN_API_KEY" \
 -H "X-Admin-Tier: sub" | jq .

---

## 5.2 GET BUYER PROFILE

GET /admin/buyers/:buyerId

curl -X GET http://localhost:4001/api/v1/admin/buyers/1 \
 -H "Authorization: Bearer $SUB_ADMIN_TOKEN" \
 -H "X-Admin-Key: $SUB_ADMIN_API_KEY" \
 -H "X-Admin-Tier: sub" | jq .

---

## 5.3 SUSPEND BUYER

POST /admin/buyers/:buyerId/suspend

curl -X POST http://localhost:4001/api/v1/admin/buyers/1/suspend \
 -H "Authorization: Bearer $SUB_ADMIN_TOKEN" \
 -H "X-Admin-Key: $SUB_ADMIN_API_KEY" \
 -H "X-Admin-Tier: sub" \
 -H "Content-Type: application/json" \
 -d '{"reason": "Suspicious activity"}' | jq .

---

## 5.4 UNSUSPEND BUYER

POST /admin/buyers/:buyerId/unsuspend

curl -X POST http://localhost:4001/api/v1/admin/buyers/1/unsuspend \
 -H "Authorization: Bearer $SUB_ADMIN_TOKEN" \
 -H "X-Admin-Key: $SUB_ADMIN_API_KEY" \
 -H "X-Admin-Tier: sub" \
 -H "Content-Type: application/json" \
 -d '{}' | jq .

---

## 5.5 LIST PENDING DELIVERIES

GET /admin/deliveries/pending

curl -X GET http://localhost:4001/api/v1/admin/deliveries/pending \
 -H "Authorization: Bearer $SUB_ADMIN_TOKEN" \
 -H "X-Admin-Key: $SUB_ADMIN_API_KEY" \
 -H "X-Admin-Tier: sub" | jq .

---

## 5.6 GET DELIVERY DETAILS

GET /admin/deliveries/:orderId

curl -X GET http://localhost:4001/api/v1/admin/deliveries/1 \
 -H "Authorization: Bearer $SUB_ADMIN_TOKEN" \
 -H "X-Admin-Key: $SUB_ADMIN_API_KEY" \
 -H "X-Admin-Tier: sub" | jq .

---

## 5.7 VERIFY DELIVERY

POST /admin/deliveries/:orderId/verify

curl -X POST http://localhost:4001/api/v1/admin/deliveries/1/verify \
 -H "Authorization: Bearer $SUB_ADMIN_TOKEN" \
 -H "X-Admin-Key: $SUB_ADMIN_API_KEY" \
 -H "X-Admin-Tier: sub" \
 -H "Content-Type: application/json" \
 -d '{
"delivery_notes": "Delivered successfully",
"delivery_proof_photos": ["url1", "url2"]
}' | jq .

# ================================================================================ 6. QUICK TEST SCRIPT

#!/bin/bash

# Setup

SUPER_ADMIN_KEY_1=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
export SUPER_ADMIN_KEY_1=$SUPER_ADMIN_KEY_1

# Step 1: Login super admin

echo "1. Super Admin Login..."
SUPER_ADMIN_TOKEN=$(curl -s -X POST http://localhost:4001/api/v1/auth/login \
 -H "Content-Type: application/json" \
 -d '{"email":"admin@debridgers.com","password":"password"}' | jq -r '.data.access_token')
echo "Token: $SUPER_ADMIN_TOKEN"

# Step 2: Create invite

echo "2. Creating invite..."
INVITE_CODE=$(curl -s -X POST http://localhost:4001/api/v1/admin/invites \
 -H "Authorization: Bearer $SUPER_ADMIN_TOKEN" \
 -H "X-Admin-Key: $SUPER_ADMIN_KEY_1" \
 -H "X-Admin-Tier: super" \
 -H "Content-Type: application/json" \
 -d '{"email":"test@example.com"}' | jq -r '.data.invite_code')
echo "Code: $INVITE_CODE"

# Step 3: Register sub admin

echo "3. Registering sub admin..."
SUB_ADMIN_API_KEY=$(curl -s -X POST http://localhost:4001/api/v1/auth/admin/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"pass123","first_name":"Test","last_name":"Admin","invite_code":"'$INVITE_CODE'"}' | jq -r '.data.admin_api_key')
echo "API Key: $SUB_ADMIN_API_KEY"

# Step 4: Login sub admin

echo "4. Sub admin login..."
SUB_ADMIN_TOKEN=$(curl -s -X POST http://localhost:4001/api/v1/auth/login \
 -H "Content-Type: application/json" \
 -d '{"email":"test@example.com","password":"pass123"}' | jq -r '.data.access_token')
echo "Token: $SUB_ADMIN_TOKEN"

# Step 5: Test endpoint access

echo "5. Accessing admin endpoints..."
curl -s -X GET http://localhost:4001/api/v1/admin/buyers \
 -H "Authorization: Bearer $SUB_ADMIN_TOKEN" \
 -H "X-Admin-Key: $SUB_ADMIN_API_KEY" \
 -H "X-Admin-Tier: sub" | jq .

echo "✅ All tests passed!"
