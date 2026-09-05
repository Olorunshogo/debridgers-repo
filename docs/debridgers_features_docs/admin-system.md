# Debridgers Admin System

## Overview

The Debridgers Admin System provides complete platform management capabilities for administrators. It includes agent management, buyer oversight, order handling, payment processing, commission tracking, and comprehensive analytics.

---

## Admin Roles & Permissions

### Role Hierarchy

**1. Super Admin** (Full Access + Admin Management)

- ✅ Access to ALL platform features
- ✅ Invite & manage other admins
- ✅ System settings configuration
- ✅ View audit logs
- ✅ Suspend/remove admin access
- 🔑 API Keys: X-Admin-Key-1 + X-Admin-Key-2

**2. Buyer Admin** (Buyer Management)

- ✅ List/view all buyers
- ✅ Manage buyer orders
- ✅ Handle buyer disputes
- ✅ Suspend/unsuspend buyers
- ✅ View wallet transactions
- ❌ Cannot process payments
- 🔑 API Key: X-Buyer-Admin-Key

**3. Agent Admin** (Agent Management)

- ✅ Approve/reject agent applications
- ✅ Review KYC documents
- ✅ Manage agent performance
- ✅ Suspend/unsuspend agents
- ✅ View agent commissions
- ❌ Cannot process payments
- 🔑 API Key: X-Agent-Admin-Key

**4. Financial Admin** (Payment & Commission Management)

- ✅ View all commissions
- ✅ Approve/process withdrawals
- ✅ Handle refunds
- ✅ View financial reports
- ✅ Update commission rates
- ❌ Cannot manage agents/buyers
- 🔑 API Key: X-Finance-Admin-Key

**5. Outreach Admin** (Campaign Management)

- ✅ Manage outreach records
- ✅ Send batch reminders
- ✅ View coverage analytics
- ✅ Assign team campaigns
- ❌ Cannot access financial data
- 🔑 API Key: X-Outreach-Admin-Key

**6. Inventory Admin** (Product & Stock Management)

- ✅ Manage products
- ✅ Track stock requests
- ✅ View stock fulfillment
- ✅ Set pricing
- ❌ Cannot access financial data
- 🔑 API Key: X-Inventory-Admin-Key

📖 **See `admin-roles.md` for complete role details & invitation system**

---

## Admin Onboarding & Invitation

### How Admins Are Added

1. **Super Admin invites** new admin via email

   ```
   POST /api/v1/admin/invitations
   ```

2. **System sends email** with secure invite link (24h expiry)

3. **New admin accepts** via link → creates password → account created

4. **Role-specific API key** automatically generated

5. **Admin ready to use** with their role-specific permissions

📖 **See `admin-roles.md` for complete invitation system documentation**

---

## Admin Authentication

### Super Admin Login

**Endpoint:**

```
POST /api/v1/auth/admin/login
Headers: X-Admin-Key-1, X-Admin-Key-2
Body:
{
  "email": "admin@debridgers.com",
  "password": "WGxMWQP8RfIMjNWVTpJo"
}
```

### Role-Specific Admin Login

**Endpoint:**

```
POST /api/v1/auth/admin/login
Headers: X-{Role}-Admin-Key (e.g., X-Buyer-Admin-Key)
Body:
{
  "email": "buyer-admin@debridgers.com",
  "password": "SecurePass@2026"
}
```

Examples:

- Buyer Admin: `X-Buyer-Admin-Key: buyer_admin_key_a1b2c3d4e5f6`
- Agent Admin: `X-Agent-Admin-Key: agent_admin_key_b2c3d4e5f6g7`
- Financial Admin: `X-Finance-Admin-Key: finance_admin_key_c3d4e5f6g7h8`
- Outreach Admin: `X-Outreach-Admin-Key: outreach_admin_key_d4e5f6g7h8i9`
- Inventory Admin: `X-Inventory-Admin-Key: inventory_admin_key_e5f6g7h8i9j0`

**Response:**

```json
{
  "message": "Admin login successful",
  "data": {
    "user": {
      "id": 1,
      "first_name": "Debridgers",
      "last_name": "Team",
      "email": "admin@debridgers.com",
      "role": "admin"
    },
    "accessToken": "eyJ0eXAiOiJKV1QiLC...",
    "refreshToken": "eyJ0eXAiOiJKV1QiLC..."
  }
}
```

### Security Requirements

- **Two API Keys Required**: X-Admin-Key-1 + X-Admin-Key-2
- **JWT Token**: For authenticated requests
- **Rate Limiting**: 5 login attempts/minute, then 30min lockout
- **Exponential Backoff**:
  - 6-9 attempts: 20 min lockout
  - 10-14 attempts: 30 min lockout
  - 15-19 attempts: 45 min lockout
  - 20+ attempts: 24 hour lockout

---

## Admin Dashboard

### Dashboard Metrics

```
GET /api/v1/admin/dashboard
Headers: X-{Role}-Admin-Key OR (X-Admin-Key-1 + X-Admin-Key-2 for Super Admin)
```

**Returns different data based on admin role:**

Returns:

```json
{
  "data": {
    "admin": {
      "id": 42,
      "name": "Sarah Johnson",
      "role": "buyer_admin",
      "email": "buyer-admin@debridgers.com",
      "api_key_last_4": "f6",
      "permissions": [
        "view:buyers",
        "view:orders",
        "manage:disputes",
        "suspend:buyers"
      ],
      "last_login": "2026-06-11T14:30:00Z"
    },
    "summary": {
      "total_agents": 147,
      "total_buyers": 3421,
      "total_orders_today": 284,
      "total_revenue_today": "₦4,280,000",
      "pending_withdrawals": 18,
      "active_disputes": 3,
      "unread_messages": 5
    },
    "role_specific": {
      "buyer_admin": {
        "buyers_awaiting_action": 12,
        "active_disputes": 3,
        "suspended_buyers": 2
      },
      "agent_admin": {
        "pending_applications": 8,
        "pending_kyc": 5,
        "withdrawal_reports_pending": 3
      },
      "financial_admin": {
        "pending_withdrawals": 18,
        "pending_referral_bonuses": 5,
        "salary_cycle": "Monthly (Next: June 15)"
      }
    },
    "today_stats": {
      "new_agents": 5,
      "new_buyers": 42,
      "successful_orders": 278,
      "failed_orders": 6,
      "total_commission": "₦1,284,000"
    },
    "alerts": [
      {
        "type": "warning",
        "message": "High failed payment rate (2.1%)"
      },
      {
        "type": "info",
        "message": "Weekly payout sweep scheduled for Friday"
      },
      {
        "type": "message",
        "message": "Agent Admin sent you 1 withdrawal report",
        "from_admin": "John Doe"
      }
    ]
  }
}
```

**Role-Specific Dashboard Data:**

- **Buyer Admin**: Buyer metrics, dispute count, suspended buyers
- **Agent Admin**: Applications pending, KYC reviews pending, withdrawal reports
- **Financial Admin**: Pending withdrawals, salary cycle, referral bonuses
- **Outreach Admin**: Campaign performance, coverage metrics
- **Inventory Admin**: Stock levels, pending fulfillment
- **Super Admin**: ALL metrics combined

---

## Role-Specific Operations

⚠️ **Each section below shows endpoints available to SPECIFIC admin roles:**

- Agent Management → Agent Admin only
- Buyer Management → Buyer Admin only
- Commission & Withdrawal → Financial Admin only
- Outreach Management → Outreach Admin only
- Inventory Management → Inventory Admin only
- Super Admin can do ALL operations

---

## Agent Management

**Available to:** Agent Admin + Super Admin

### List All Agents

**Endpoint:**

```
GET /api/v1/admin/agents?page=1&limit=20&status=approved&zone=Kaduna
Headers: X-Admin-Key-1, X-Admin-Key-2
        Authorization: Bearer {accessToken}
```

**Query Parameters:**

- `status`: pending, approved, rejected, suspended
- `zone`: Filter by delivery zone
- `page`: Pagination (default: 1)
- `limit`: Items per page (default: 20, max: 100)

**Response:**

```json
{
  "data": [
    {
      "id": 5,
      "first_name": "Amina",
      "last_name": "Yusuf",
      "email": "amina@example.com",
      "phone": "08012345678",
      "status": "approved",
      "kyc_status": "approved",
      "zone": "Kaduna North",
      "total_earnings": "₦125,500",
      "commission_pending": "₦15,000",
      "last_activity": "2026-06-10T14:30:00Z",
      "bank_account_verified": true
    }
  ],
  "pagination": {
    "total": 147,
    "page": 1,
    "limit": 20,
    "pages": 8
  }
}
```

### Agent Details

```
GET /api/v1/admin/agents/:id
```

Returns complete agent profile with:

- Personal details
- KYC status and documents
- Bank account (verified)
- Sales history
- Commission breakdown
- Withdrawal history
- Performance metrics

### Approve Agent Application

```
PATCH /api/v1/admin/agents/:id/approve
Body: { "admin_notes": "Application approved" }
```

Changes status: `pending` → `approved`

### Reject Agent Application

```
PATCH /api/v1/admin/agents/:id/reject
Body: { "rejection_reason": "Incomplete KYC documents" }
```

Changes status: `pending` → `rejected`

### Suspend/Unsuspend Agent

```
PATCH /api/v1/admin/agents/:id/suspend
Body: { "reason": "Suspicious activity detected" }
```

```
PATCH /api/v1/admin/agents/:id/unsuspend
Body: { "admin_notes": "Reviewed and cleared" }
```

---

## Buyer Management

**Available to:** Buyer Admin + Super Admin

### List All Buyers

```
GET /api/v1/admin/buyers?zone=Kaduna&page=1&limit=20
```

**Query Parameters:**

- `zone`: Filter by delivery zone
- `is_suspended`: true/false
- `page`, `limit`: Pagination

**Response:**

```json
{
  "data": [
    {
      "id": 123,
      "first_name": "Fatima",
      "last_name": "Bello",
      "email": "fatima@example.com",
      "phone": "08098765432",
      "zone": "Kaduna North",
      "total_orders": 12,
      "total_spent": "₦145,000",
      "wallet_balance": "₦25,000",
      "is_suspended": false,
      "last_order": "2026-06-10T12:00:00Z"
    }
  ]
}
```

### Buyer Details

```
GET /api/v1/admin/buyers/:id
```

Returns:

- Personal profile
- Order history
- Wallet balance and transactions
- Suspension status
- Activity timeline

### Suspend/Unsuspend Buyer

```
PATCH /api/v1/admin/buyers/:id/suspend
Body: { "reason": "Policy violation" }
```

```
PATCH /api/v1/admin/buyers/:id/unsuspend
```

### View Buyer Wallet Transactions

```
GET /api/v1/admin/buyers/:id/wallet/transactions?page=1&limit=20
```

Returns all wallet activity (deposits, withdrawals, refunds)

---

## Order Management

**Available to:** Buyer Admin + Super Admin (part of buyer management)

### List All Orders

```
GET /api/v1/admin/orders?status=pending&payment_status=unpaid&page=1&limit=20
```

**Filters:**

- `status`: pending, confirmed, out_for_delivery, delivered, cancelled
- `payment_status`: unpaid, paid, refunded
- `zone`: Filter by zone
- Date range filters

### Order Details

```
GET /api/v1/admin/orders/:id
```

Returns:

- Order info and items
- Buyer details
- Agent assignment
- Payment status
- Delivery tracking
- Disputes (if any)

### Cancel Order

```
POST /api/v1/admin/orders/:id/cancel
Body: { "reason": "Customer request" }
```

### Dispute Resolution

```
GET /api/v1/admin/disputes
```

List all active disputes with:

- Order reference
- Dispute type (payment, delivery, quality)
- Buyer claim
- Evidence
- Status (pending, resolved)

```
PATCH /api/v1/admin/disputes/:id/resolve
Body: {
  "resolution": "refund_full",  // or "refund_partial", "dismiss"
  "amount_refund": 10000,        // if partial
  "notes": "Admin decision"
}
```

---

## Commission & Withdrawal Management

**Available to:** Financial Admin + Super Admin

### Agent Admin Withdrawal Report Workflow

**Step 1: Agent Admin Reviews Pending Withdrawals**

```
GET /api/v1/admin/withdrawals?status=pending
Headers: X-Agent-Admin-Key
```

**Step 2: Agent Admin Sends Report to Financial Admin**

```
POST /api/v1/admin/messages
Headers: X-Agent-Admin-Key
Body:
{
  "to_admin_id": 45,  // Financial Admin
  "subject": "Withdrawal Report - Agent Verification",
  "message": "Verified 5 pending withdrawals for processing",
  "attachments": [
    {
      "type": "withdrawal_report",
      "withdrawal_ids": [123, 124, 125, 126, 127],
      "verified_bank_accounts": true,
      "kyc_status": "approved",
      "total_amount": "₦250,000"
    }
  ]
}
```

**Step 3: Financial Admin Processes Report**

- Reviews agent admin's verification
- Approves/rejects withdrawals
- Processes payouts via Paystack
- Sends confirmation back to Agent Admin

**Example Message Response:**

```json
{
  "type": "message",
  "from": "Financial Admin",
  "content": "Processed all 5 withdrawals. Total: ₦250,000. Payouts scheduled.",
  "status": "read"
}
```

---

### View Commissions

```
GET /api/v1/admin/commissions?status=pending&agent_id=5&page=1
```

**Filters:**

- `status`: pending, paid
- `agent_id`: Filter by agent
- `date_from`, `date_to`: Date range
- `type`: direct, referral, bonus

**Response:**

```json
{
  "data": [
    {
      "id": 8,
      "agent_id": 5,
      "agent_name": "Amina Yusuf",
      "type": "direct",
      "amount": "₦3,750",
      "status": "pending",
      "source_order": 42,
      "created_at": "2026-06-10T10:00:00Z",
      "paid_at": null
    }
  ]
}
```

### Mark Commission Paid

```
PATCH /api/v1/admin/commissions/:id/mark-paid
```

### List Withdrawals

```
GET /api/v1/admin/withdrawals?status=pending&page=1
```

**Statuses:**

- `pending`: Awaiting admin approval
- `approved`: Ready to process
- `paid`: Completed
- `rejected`: Denied by admin

### Approve Withdrawal

```
POST /api/v1/admin/withdrawals/:id/approve
Body: { "admin_notes": "Approved" }
```

Changes status: `pending` → `approved`

### Process Withdrawal (Transfer Money)

```
POST /api/v1/payment/payout/:withdrawalId
Headers: X-Payment-Key-1, X-Payment-Key-2
         Authorization: Bearer {accessToken}
```

**Flow:**

1. Retrieves agent bank details (verified)
2. Calls Paystack Transfer API
3. Updates withdrawal status to `paid`
4. Sends confirmation to agent

**Response:**

```json
{
  "message": "Withdrawal processing",
  "data": {
    "reference": "WITHDRAWAL_123_1686480000",
    "status": "paid",
    "amount": "₦50,000",
    "processed_at": "2026-06-10T14:30:00Z"
  }
}
```

### Reject Withdrawal

```
POST /api/v1/admin/withdrawals/:id/reject
Body: { "rejection_reason": "Insufficient funds" }
```

### Run Weekly Payout Sweep

```
POST /api/v1/payment/payout/run-weekly
Headers: X-Payment-Key-1, X-Payment-Key-2
```

**What it does:**

1. Groups all pending commissions by agent
2. Creates withdrawal requests
3. Processes all withdrawals
4. Sends batch notifications

---

## Settings & Configuration

**Available to:** Super Admin only

### Get Platform Settings

```
GET /api/v1/admin/settings
```

Returns:

```json
{
  "data": {
    // Corrected 2026-08-29: agent commission is a flat naira amount per
    // package, keyed to product type, not a percentage rate.
    "agent_commission_beans_kobo": 120000,
    "agent_commission_rice_kobo": 100000,
    "agent_commission_oil_kobo": 70000,
    "agent_commission_default_kobo": 40000,
    "buyer_referral_discount_kobo": 50000,
    "buyer_referral_discount_type": "flat",
    "paystack_test_mode": true,
    "wallet_min_deposit": 20000,
    "wallet_max_deposit": 10000000
  }
}
```

### Update Settings

```
PATCH /api/v1/admin/settings
Body: {
  "agent_commission_rice_kobo": 100000,
  "paystack_test_mode": false
}
```

### System Logs

```
GET /api/v1/admin/logs?action=login&user_id=1&page=1
```

Audit trail of all admin actions:

- Who did what
- When
- What changed
- IP address

---

## Reports & Analytics

**Available to:** Financial Admin (financial reports) + Each role can view their own area's reports + Super Admin (all reports)

### Revenue Report

```
GET /api/v1/admin/reports/revenue?period=monthly&from=2026-06-01&to=2026-06-30
```

Returns:

- Daily/weekly/monthly revenue
- Revenue by zone
- Revenue by product
- Trending data

### Agent Performance Report

```
GET /api/v1/admin/reports/agents?period=weekly
```

Returns:

- Top agents by sales
- Top agents by revenue
- Agent activity (active/inactive)
- Commission breakdown

### Payment Report

```
GET /api/v1/admin/reports/payments?status=paid&period=monthly
```

Returns:

- Payment success rate
- Failed payments breakdown
- Refund statistics
- Dispute trends

### Export Reports

```
GET /api/v1/admin/reports/export?type=csv&report=revenue&format=csv
```

Supported formats: CSV, PDF, Excel

---

## Admin Workflow Examples

### Agent Onboarding Process

```
1. Agent applies → Status: pending
2. Admin reviews CV & documents
3. Admin approves → Status: approved
4. Agent submits KYC
5. Admin reviews KYC documents
6. Admin approves KYC → kyc_status: approved
7. Agent can now access features
```

### Withdrawal Processing Workflow

```
1. Agent requests withdrawal (available balance debited)
2. Admin reviews pending withdrawals
3. Admin approves withdrawal
4. System calls Paystack Transfer API
5. Money sent to agent's bank account
6. Withdrawal marked as paid
7. Agent notified
```

### Dispute Resolution Workflow

```
1. Buyer or seller raises dispute
2. Admin reviews evidence
3. Admin makes decision (refund full/partial or dismiss)
4. System executes decision
5. Both parties notified
6. Dispute closed
```

---

## Best Practices for Admins

### Daily Tasks

- ✅ Review pending agent applications
- ✅ Review pending withdrawals
- ✅ Check active disputes
- ✅ Monitor failed orders/payments
- ✅ Respond to support escalations

### Weekly Tasks

- ✅ Run payout sweep (Friday)
- ✅ Review commission reports
- ✅ Check agent performance
- ✅ Review KYC submissions
- ✅ Audit logs for suspicious activity

### Monthly Tasks

- ✅ Generate revenue report
- ✅ Analyze agent performance
- ✅ Review and update commission rates
- ✅ Platform health check
- ✅ Stakeholder reporting

### Security Practices

1. **Never share API keys** - Keep X-Admin-Key-1 and X-Admin-Key-2 secret
2. **Use strong passwords** - Update regularly
3. **Monitor activity logs** - Check for unauthorized access
4. **Verify bank accounts** - Always confirm Paystack verification before payout
5. **Document decisions** - Add notes to all approval/rejection actions
6. **Two-person approval** - For large withdrawals (optional but recommended)

---

## Common Issues & Solutions

### Agent Withdrawal Stuck

**Problem:** Withdrawal remains in pending status
**Checks:**

- Agent bank details verified? (Must be verified via Paystack)
- Sufficient commission balance?
- Paystack API operational?
  **Solution:** Manually trigger payout or contact Paystack support

### High Failed Payment Rate

**Problem:** Many orders with failed payment status
**Likely Causes:**

- Customer credit card issues
- Paystack rate limiting
- Network issues
  **Solution:** Email affected buyers, offer retry option

### Dispute Not Resolving

**Problem:** Dispute status stuck
**Solution:**

- Review all evidence provided
- Make clear decision (refund/dismiss)
- Document reasoning
- Execute resolution

### Agent KYC Rejected Repeatedly

**Problem:** Agent keeps resubmitting failed KYC
**Causes:**

- Blurry ID photos
- Name mismatch with ID
- Expired ID
  **Solution:** Contact agent with specific feedback on what to fix

---

## Security & Audit

### Audit Trail

All admin actions logged:

- User ID
- Action type
- Data changed
- Timestamp
- IP address

```
GET /api/v1/admin/audit-logs
```

### Two-Factor Authentication (Future)

Will require second verification method for sensitive actions

### Rate Limiting

- Login: 5 attempts/min
- API: 100 requests/min per admin

---

## Support & Escalation

### When to Escalate

- Large financial discrepancies (>₦100,000)
- Data deletion requests
- Security incidents
- Paystack API issues
- Persistent technical problems

### Escalation Process

1. Document the issue
2. Contact platform support
3. Provide audit logs
4. Wait for response (24-48 hours)

---

## Conclusion

The Debridgers Admin System provides comprehensive, role-based platform management with security, transparency, and efficiency.

### Key Features:

- ✅ **6 Specialized Roles** - Each admin focused on their area
- ✅ **Secure Invitations** - Email-based onboarding with expiring links
- ✅ **Role-Specific API Keys** - Fine-grained access control
- ✅ **Complete Audit Trail** - Track all admin actions
- ✅ **Scalable Management** - Easy to add/remove admins
- ✅ **Security First** - Key rotation, suspension, activity monitoring

### Documentation:

- **This file** (`admin-system.md`) - Day-to-day operations & endpoints
- **`admin-roles.md`** - Complete role definitions & invitation system

### Key Contacts:

- Support: support@debridgers.com
- Security: security@debridgers.com
- Finance: finance@debridgers.com

**Ready to manage the platform! 🚀**
