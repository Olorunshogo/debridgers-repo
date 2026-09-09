# Debridgers API Commands Reference

Complete curl command reference for all backend API endpoints.

## Quick Start

All scripts are executable bash files with color-coded output. Run them directly:

```bash
chmod +x *.sh
./01-auth.sh
./02-payment.sh
./03-public.sh
# etc...
```

**Base URL**: `http://localhost:4001/api/v1`

---

## Module Overview

| #   | Module         | File                      | Authentication | Purpose                                            |
| --- | -------------- | ------------------------- | -------------- | -------------------------------------------------- |
| 1   | **Auth**       | `01-auth.sh`              | Public         | Register, Login, Password Reset, Token Management  |
| 2   | **Payment**    | `02-payment.sh`           | Mixed          | Payment Processing, Payouts, Refunds, Webhooks     |
| 3   | **Public**     | `03-public.sh`            | None           | Products, Zones, Categories, Config (No Auth)      |
| 4   | **Agent**      | `04-agent.sh`             | Agent Required | Agent Profile, Stock, KYC, Wallet, Withdrawals     |
| 5   | **Buyer**      | `05-buyer.sh`             | Buyer Required | Cart, Favorites, Orders, Checkout                  |
| 6   | **Admin**      | `06-admin.sh`             | Admin Required | User Management, Approvals, Orders, Disputes       |
| 7   | **Commission** | `07-commission.sh`        | Agent/Admin    | Commission Tracking, History, Payouts              |
| 8   | **Contact**    | `08-contact.sh`           | User Required  | Support Tickets, Customer Service                  |
| 9   | **HR**         | `09-hr-security-smoke.sh` | Mixed          | Auth/Roles matrix + HR smoke (careers → analytics) |

---

## Complete API Flow Examples

### 👥 Buyer Checkout (End-to-End)

```bash
# 1. Public: Browse products & zones (no auth needed)
./03-public.sh          # GET /products, /zones

# 2. Auth: Buyer signs up and logs in
./01-auth.sh            # POST /auth/register, POST /auth/login

# 3. Buyer: Add to cart, create order
./05-buyer.sh           # POST /buyer/cart, POST /buyer/orders

# 4. Payment: Initialize Paystack checkout
./02-payment.sh         # POST /payment/initialize

# 5. Paystack: Buyer completes payment on Paystack hosted form

# 6. Payment: Webhook confirms payment (automatic from Paystack)
# → Order status: pending → confirmed
# → Payment status: unpaid → paid
# → Commission created automatically
# → Cart cleared automatically
```

### 🤝 Agent Onboarding (End-to-End)

```bash
# 1. Public: Agent views company (no auth)
./03-public.sh          # GET /config/public, GET /leaderboard

# 2. Agent: Submit application
./04-agent.sh           # POST /agent/apply (public endpoint)

# 3. Admin: Review and approve application
./06-admin.sh           # PATCH /admin/agents/5/approve

# 4. Agent: Login with approved account
./01-auth.sh            # POST /auth/login

# 5. Agent: Complete KYC and add bank details
./04-agent.sh           # POST /agent/kyc/submit, PATCH /agent/bank-details

# 6. Admin: Create Paystack subaccount for agent
./02-payment.sh         # POST /payment/subaccount/5

# 7. Agent: Can now receive payments & commissions
./04-agent.sh           # GET /agent/wallet, POST /agent/stock/request
```

### 💰 Commission & Payout Flow

```bash
# 1. Payment webhook records commission automatically
./02-payment.sh         # POST /payment/webhook (automatic from Paystack)
#    → commission created with status='paid'

# 2. Agent can view earnings
./07-commission.sh      # GET /commission/my-commissions
./04-agent.sh           # GET /agent/wallet

# 3. Automatic payout (Friday 10 AM UTC)
#    → PayoutSchedulerService queries unpaid commissions
#    → Calculates total from past 7 days
#    → If >= ₦5,000 → Creates transfer via Paystack

# 4. Manual payout trigger (for testing/missed schedules)
./02-payment.sh         # POST /payment/payout/run-weekly

# 5. Manual withdrawal approval
./04-agent.sh           # POST /agent/withdrawals/request
./06-admin.sh           # PATCH /admin/withdrawals/3/approve
./02-payment.sh         # POST /payment/payout/3
```

### 🔄 Refund Flow

```bash
# 1. Buyer places order and pays
./05-buyer.sh           # POST /buyer/orders
./02-payment.sh         # POST /payment/initialize

# 2. Admin initiates refund (after payment)
./02-payment.sh         # POST /payment/refund

# 3. Paystack processes refund
#    → refund.processed webhook received

# 4. Backend updates refund status
#    → Refund status: processing → completed
```

---

## Authentication

### Token Types

- **Access Token**: 15 minute expiry, used in `Authorization: Bearer <token>` header
- **Refresh Token**: 7 day expiry, used in `Authorization: Refresh <token>` header
- **API Key**: For OAuth apps, Bearer token format

### Getting Tokens

```bash
# 1. Register or login
curl -X POST http://localhost:4001/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"first_name":"Test","last_name":"User","email":"test@example.com","password":"Pass@123"}'

# Extract accessToken and refreshToken from response

# 2. Use accessToken in headers
curl -X GET http://localhost:4001/api/v1/agent/profile \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."

# 3. Refresh token when expired
curl -X POST http://localhost:4001/api/v1/auth/refresh \
  -H "Authorization: Refresh eyJhbGciOiJIUzI1NiIs..."
```

---

## API Response Format

All responses follow this format:

```json
{
  "statusCode": 200,
  "message": "Success message",
  "data": {
    // Response data here
  },
  "timestamp": "2026-08-04T12:00:00.000Z",
  "version": "v1",
  "path": "/api/v1/auth/login"
}
```

### Error Response

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ],
  "timestamp": "2026-08-04T12:00:00.000Z",
  "path": "/api/v1/auth/login"
}
```

---

## Common Query Parameters

| Parameter | Description                           | Example             |
| --------- | ------------------------------------- | ------------------- |
| `limit`   | Rows per page (default: 20)           | `?limit=50`         |
| `offset`  | Pagination offset (default: 0)        | `?offset=40`        |
| `status`  | Filter by status                      | `?status=pending`   |
| `from`    | Start date (ISO 8601)                 | `?from=2026-08-01`  |
| `to`      | End date (ISO 8601)                   | `?to=2026-08-31`    |
| `sort`    | Sort field (prefix with `-` for desc) | `?sort=-created_at` |

---

## Testing Checklist

- [ ] Public endpoints work without auth
- [ ] Auth flow (register → login → verify email → refresh)
- [ ] Buyer flow (browse → cart → checkout → payment)
- [ ] Agent onboarding (apply → admin approval → KYC → bank details)
- [ ] Payment webhook received and processed
- [ ] Commission created on payment confirmation
- [ ] Payout scheduled correctly (Friday 10 AM UTC)
- [ ] Manual payout trigger works
- [ ] Refund flow completes
- [ ] Support tickets created and resolved

---

## Useful Aliases

Add these to your shell for faster testing:

```bash
alias api_test='cd /Users/iamtechhunter/Documents/workspace/Debridgers/apis_command && bash'
alias auth='./01-auth.sh | jq'
alias payment='./02-payment.sh | jq'
alias public='./03-public.sh | jq'
alias agent='./04-agent.sh | jq'
alias buyer='./05-buyer.sh | jq'
alias admin='./06-admin.sh | jq'
alias commission='./07-commission.sh | jq'
alias contact='./08-contact.sh | jq'
```

---

## Troubleshooting

### "Authorization header missing"

Make sure you're passing the token from login response in subsequent requests.

### "Invalid signature" on webhook

Webhook signature verification failed. Check `x-paystack-signature` header matches secret.

### "Order not found"

Order ID might not exist. List orders first to get valid IDs.

### "Agent not approved"

Agent status must be "approved" before they can log in. Use admin endpoints to approve.

### "Email already registered"

The email is already in use. Try a different email for testing.

---

## Performance Notes

- List endpoints are paginated (default limit: 20)
- Use filters to reduce response size
- Webhook calls are rate-limited with throttle decorator
- Paystack API calls have latency (100-500ms typically)

---

## Documentation

For full API docs including request/response schemas, visit:

- Swagger UI: `http://localhost:4001/api-docs`
- ReDoc: `http://localhost:4001/api-redoc`

---

## Database Inspection (During Testing)

```bash
# Connect to local database
psql postgresql://iamtechhunter@localhost:5432/debridgers

# Useful queries
SELECT * FROM users WHERE email = 'test@example.com';
SELECT * FROM orders WHERE buyer_id = 7 ORDER BY created_at DESC;
SELECT * FROM commissions WHERE agent_id = 5 ORDER BY paid_at DESC;
SELECT * FROM payouts WHERE agent_id = 5;
SELECT * FROM refunds WHERE order_id = 42;
SELECT * FROM withdrawals WHERE status = 'pending';
```

---

## Last Updated

2026-08-04 - All Phase 4 endpoints included (Payment, Refunds, Payouts, Commissions)
