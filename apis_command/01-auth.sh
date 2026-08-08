#!/bin/bash
# Auth Module - Authentication & Authorization
# Base URL: http://localhost:4001/api/v1/auth

# Color codes for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== AUTH ENDPOINTS ===${NC}\n"

# Done
# ─────────────────────────────────────────────────────────────────────────────
# 1. REGISTER (Buyer)
echo -e "${GREEN}1. REGISTER BUYER${NC}"
curl -k -X POST http://localhost:4001/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "first_name": "Fatima",
    "last_name": "Bello",
    "email": "nebos12349@netiren.com",
    "phone": "08098765432",
    "password": "SecurePass@123",
    "role": "buyer"
  }' | jq .

# Done
echo -e "\n${GREEN}2. LOGIN (Buyer)${NC}"
curl -s -X POST http://localhost:4001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
     "email": "nebos12349@netiren.com",
    "password": "SecurePass@123"
  }' | jq .

echo -e "\n${GREEN}3. ADMIN LOGIN${NC}"
curl -s -X POST http://localhost:4001/api/v1/auth/admin/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@debridgers.com",
    "password": "Admin@2026!"
  }' | jq .

# Done
echo -e "\n${GREEN}4. VERIFY EMAIL (using OTP)${NC}"
curl -s -X POST http://localhost:4001/api/v1/auth/verify-email \
  -H "Content-Type: application/json" \
  -d '{
    "email": "nebos12349@netiren.com",
    "otp": "486554"
  }' | jq .

echo -e "\n${GREEN}5. RESEND OTP${NC}"
curl -s -X POST http://localhost:4001/api/v1/auth/resend-otp \
  -H "Content-Type: application/json" \
  -d '{
    "email": "nebos12349@netiren.com",
  }' | jq .

echo -e "\n${GREEN}6. FORGOT PASSWORD${NC}"
curl -s -X POST http://localhost:4001/api/v1/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "nebos12349@netiren.com",
  }' | jq .


echo -e "\n${GREEN}7. RESET PASSWORD (using token from email)${NC}"
curl -s -X POST http://localhost:4001/api/v1/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "token": "token_from_email_link_here",
    "password": "NewPassword@456"
  }' | jq .

echo -e "\n${GREEN}8. REFRESH TOKENS${NC}"
# Note: Use Refresh header, not Bearer
curl -s -X POST http://localhost:4001/api/v1/auth/refresh \
  -H "Authorization: Refresh your_refresh_token_here" | jq .

echo -e "\n${GREEN}9. LOGOUT${NC}"
curl -s -X POST http://localhost:4001/api/v1/auth/logout \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjIsImVtYWlsIjoiZmF0aW1hQGV4YW1wbGUuY29tIiwicm9sZSI6ImJ1eWVyIiwiaWF0IjoxNzg1OTQ5Mzc5LCJleHAiOjE3ODU5NTAyNzl9.LfgP0IfIFavtEvvLga04KYhxtKx66gxs1PzQTP99NLo","refreshToken":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjIsImVtYWlsIjoiZmF0aW1hQGV4YW1wbGUuY29tIiwicm9sZSI6ImJ1eWVyIiwiaWF0IjoxNzg1OTQ5Mzc5LCJleHAiOjE3ODY1NTQxNzl9.VikkteSW3ydpbM3PP0CrlFLsKh7GnIBji3bxKhFXcno
" | jq .
