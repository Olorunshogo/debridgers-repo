# Admin Roles & Invitation System

## Admin Role Hierarchy

```
Super Admin (Full Control + Invite Others)
    ├─ Buyer Admin (Manage Buyers)
    ├─ Agent Admin (Manage Agents)
    ├─ Financial Admin (Handle Payments & Commissions)
    ├─ Outreach Admin (Manage Outreach Campaigns)
    └─ Inventory Admin (Manage Stock & Products)
```

---

## Role Definitions & Permissions

### 1. Super Admin

**Full platform control + admin management**

**Permissions:**

- ✅ All buyer operations
- ✅ All agent operations
- ✅ All financial operations
- ✅ All outreach operations
- ✅ All inventory operations
- ✅ System settings
- ✅ Invite other admins
- ✅ View audit logs
- ✅ Suspend/unsuspend admins

**API Keys:** X-Admin-Key-1 + X-Admin-Key-2

---

### 2. Buyer Admin

**Manages buyers and their orders**

**Permissions:**

- ✅ List all buyers
- ✅ View buyer details & profiles
- ✅ View buyer orders & history
- ✅ View buyer wallet transactions
- ✅ Suspend/unsuspend buyers
- ✅ Handle buyer disputes
- ✅ View buyer notifications
- ❌ Cannot manage admins
- ❌ Cannot access agent data
- ❌ Cannot process payments

**API Keys:** X-Buyer-Admin-Key (single key)

---

### 3. Agent Admin

**Manages agents and their performance**

**Permissions:**

- ✅ List all agents
- ✅ View agent profiles & KYC
- ✅ Approve/reject agent applications
- ✅ Approve/reject KYC submissions
- ✅ Suspend/unsuspend agents
- ✅ View agent earnings & commissions
- ✅ View agent performance metrics
- ✅ View agent withdrawal history
- ❌ Cannot process payments
- ❌ Cannot manage buyers
- ❌ Cannot access financial data

**API Keys:** X-Agent-Admin-Key (single key)

---

### 4. Financial Admin

**Handles all money-related operations: Commissions, Payouts, Payroll, Bonuses, Promotions**

**Commission & Payout Permissions:**

- ✅ View all commissions
- ✅ View all withdrawals (pending, paid, rejected)
- ✅ Approve/reject withdrawals
- ✅ Process payouts via Paystack
- ✅ Review agent withdrawal reports from Agent Admin
- ✅ View payment reports & revenue analytics
- ✅ Manage system commission rates

**Payroll & Incentives Permissions:**

- ✅ Manage agent salaries & payment schedules
- ✅ Process referral bonuses (agent recruits, buyer referrals)
- ✅ Create & manage promotional campaigns
- ✅ Track promotional discount budgets
- ✅ View referral program analytics
- ✅ Approve bonus payouts

**Financial Management Permissions:**

- ✅ View financial reconciliation
- ✅ Export financial & payroll reports
- ✅ Audit financial transactions

**Restrictions:**

- ❌ Cannot manage agents/buyers directly
- ❌ Cannot access inventory

**API Keys:** X-Finance-Admin-Key (single key)

---

### 5. Outreach Admin

**Manages customer outreach campaigns**

**Permissions:**

- ✅ List all outreach records
- ✅ Create outreach records
- ✅ View outreach analytics & heatmaps
- ✅ Send batch reminders
- ✅ Track reminder delivery
- ✅ View coverage reports by state/zone
- ✅ Assign team outreach campaigns
- ✅ View team reminder schedule
- ❌ Cannot manage financial data
- ❌ Cannot access agent/buyer details

**API Keys:** X-Outreach-Admin-Key (single key)

---

### 6. Inventory Admin

**Manages products and stock**

**Permissions:**

- ✅ List all products
- ✅ Create/edit products
- ✅ View stock levels
- ✅ View stock requests from agents
- ✅ Mark stock as fulfilled
- ✅ View remittance progress
- ✅ Manage pricing
- ✅ View inventory reports
- ❌ Cannot manage financial data
- ❌ Cannot access agent/buyer data

**API Keys:** X-Inventory-Admin-Key (single key)

---

## Admin Invitation System

### How It Works

```
1. Super Admin invites email
   ↓
2. System generates secure invite link (30 mins expiry)
   ↓
3. Email sent to new admin with link
   ↓
4. New admin clicks link → creates password
   ↓
5. Account created with assigned role
   ↓
6. Role-specific API key generated
   ↓
7. Admin ready to use platform
```

---

### Super Admin: Invite New Admin

**Endpoint:**

```
POST /api/v1/admin/invitations
Headers: X-Admin-Key-1, X-Admin-Key-2
         Authorization: Bearer {accessToken}
Body:
{
  "email": "buyer-admin@debridgers.com",
  "role": "buyer_admin",
  "first_name": "Sarah",
  "last_name": "Johnson"
}
```

**Supported Roles:**

- `buyer_admin`
- `agent_admin`
- `financial_admin`
- `outreach_admin`
- `inventory_admin`

**Response:**

```json
{
  "message": "Invitation sent",
  "data": {
    "invitation_id": "inv_123abc",
    "email": "buyer-admin@debridgers.com",
    "role": "buyer_admin",
    "invite_link": "https://debridgers.com/admin/invite/inv_123abc?token=xyz789",
    "expires_at": "2026-06-10T10:30:00Z", // 30 mins from now
    "created_by": 1,
    "status": "pending"
  }
}
```

---

### New Admin: Accept Invitation

**Endpoint (Public):**

```
POST /api/v1/admin/invitations/:invitationId/accept
Body:
{
  "token": "xyz789",
  "password": "SecurePass@2026",
  "password_confirm": "SecurePass@2026"
}
```

**What Happens:**

1. Validates invite link (not expired, correct token)
2. Creates user account with email
3. Sets password (hashed)
4. Assigns role
5. Generates role-specific API key
6. Sends confirmation email

**Response:**

```json
{
  "message": "Account created successfully",
  "data": {
    "user_id": 42,
    "email": "buyer-admin@debridgers.com",
    "role": "buyer_admin",
    "api_key": "buyer_admin_key_a1b2c3d4e5f6",
    "first_login_instructions": "Use your API key with X-Buyer-Admin-Key header"
  }
}
```

---

## Admin Messaging System

### Admin-to-Admin Chat

**Purpose:** Direct communication between admins for coordination and approvals

**Endpoints:**

```
POST /api/v1/admin/messages
Send message to another admin

GET /api/v1/admin/messages/conversations
List all admin conversations

GET /api/v1/admin/messages/conversations/:adminId
Get chat history with specific admin

POST /api/v1/admin/messages/:messageId/read
Mark message as read
```

**Example Use Cases:**

- Financial Admin requests Agent Admin to verify agent bank details
- Agent Admin notifies Financial Admin of withdrawal reports
- Buyer Admin escalates dispute to Super Admin
- Outreach Admin coordinates with Agent Admin on campaign results

### Admin-to-Agent Chat

**Purpose:** Direct communication with agents for support, verification, and notifications

**Endpoints:**

```
POST /api/v1/admin/messages/agent/:agentId
Send message to specific agent

GET /api/v1/admin/messages/agent/:agentId/history
Get chat history with agent

POST /api/v1/agent/messages/admin/inbox
Agent checks messages from admins
```

**Who Can Access:**

- Agent Admin: Chat with all agents
- Financial Admin: Can message agents about payments/withdrawals
- Super Admin: Access all admin-agent conversations

**Example Use Cases:**

- Agent Admin: "Your KYC documents are approved"
- Financial Admin: "Your withdrawal is approved, processing now"
- Super Admin: "Please update your bank details"
- Agent requests: "When will my withdrawal arrive?"

### Message Notifications

- Real-time notifications for new messages
- Email digest for offline admins
- Read receipts
- Message history (searchable)
- Unread badge count

---

## Admin Management

### Super Admin: View All Admins

```
GET /api/v1/admin/admins?page=1&limit=20&role=buyer_admin
Headers: X-Admin-Key-1, X-Admin-Key-2
```

**Response:**

```json
{
  "data": [
    {
      "id": 42,
      "email": "buyer-admin@debridgers.com",
      "first_name": "Sarah",
      "last_name": "Johnson",
      "role": "buyer_admin",
      "status": "active",
      "api_key": "buyer_admin_key_a1b2c3d4e5f6",
      "created_at": "2026-06-10T10:00:00Z",
      "last_login": "2026-06-11T14:30:00Z",
      "invited_by": 1
    }
  ]
}
```

### Super Admin: Suspend Admin

```
PATCH /api/v1/admin/admins/:id/suspend
Headers: X-Admin-Key-1, X-Admin-Key-2
Body: { "reason": "Employee left company" }
```

Changes status: `active` → `suspended`
API key becomes invalid

### Super Admin: Reactivate Admin

```
PATCH /api/v1/admin/admins/:id/reactivate
```

Changes status: `suspended` → `active`

### Super Admin: Revoke Admin Access

```
DELETE /api/v1/admin/admins/:id
Headers: X-Admin-Key-1, X-Admin-Key-2
Body: { "reason": "No longer needed" }
```

Removes admin account and invalidates API key

---

## API Key Management

### How API Keys Work

Each admin role has a **single, role-specific API key**:

```
X-Buyer-Admin-Key: buyer_admin_key_a1b2c3d4e5f6
X-Agent-Admin-Key: agent_admin_key_b2c3d4e5f6g7
X-Finance-Admin-Key: finance_admin_key_c3d4e5f6g7h8
X-Outreach-Admin-Key: outreach_admin_key_d4e5f6g7h8i9
X-Inventory-Admin-Key: inventory_admin_key_e5f6g7h8i9j0
```

### Using API Keys

All role-specific endpoints include the key in headers:

**Example: Buyer Admin lists buyers**

```bash
curl http://localhost:4001/api/v1/admin/buyers \
  -H "Authorization: Bearer {accessToken}" \
  -H "X-Buyer-Admin-Key: buyer_admin_key_a1b2c3d4e5f6"
```

### Rotate API Key

```
POST /api/v1/admin/api-keys/rotate
Headers: X-Buyer-Admin-Key: {current_key}
         Authorization: Bearer {accessToken}
```

**Response:**

```json
{
  "message": "API key rotated",
  "data": {
    "old_key": "buyer_admin_key_a1b2c3d4e5f6 (revoked)",
    "new_key": "buyer_admin_key_x9y8z7w6v5u4",
    "expires_at": null
  }
}
```

---

## Invitation Management

### Super Admin: View Pending Invitations

```
GET /api/v1/admin/invitations?status=pending
```

Returns:

- Pending invites (not yet accepted)
- Invite expiry times
- Who sent the invite

### Super Admin: Resend Invitation

```
POST /api/v1/admin/invitations/:id/resend
```

Generates new link, sends email again

### Super Admin: Cancel Invitation

```
DELETE /api/v1/admin/invitations/:id
```

Invitation link becomes invalid

---

## Audit & Security

### Audit Log

All admin actions logged:

```
GET /api/v1/admin/audit-logs?admin_id=42&action=approval
```

Returns:

- Who did what
- When
- What changed
- Admin role
- IP address

### Admin Activity

```
GET /api/v1/admin/admins/:id/activity
```

Shows:

- Last login
- Login history
- API key usage
- Actions taken
- Suspicious activity

---

## Security Best Practices

### For Super Admin

1. **Rotate Master Keys Regularly**
   - Change X-Admin-Key-1 every 90 days
   - Change X-Admin-Key-2 every 90 days
   - Store in secure vault (1Password, LastPass)

2. **Limit Super Admin Accounts**
   - Only 2-3 people maximum
   - No shared credentials
   - Use SSO if possible

3. **Monitor Admin Activity**
   - Review audit logs weekly
   - Alert on suspicious actions
   - Track API key usage

### For Role-Specific Admins

1. **Keep API Keys Secret**
   - Never commit to git
   - Don't share via email
   - Use .env files (gitignored)

2. **Rotate API Keys Regularly**
   - Every 180 days minimum
   - Immediately if compromised
   - After admin leaves company

3. **Use Strong Passwords**
   - Minimum 12 characters
   - Mix of upper, lower, numbers, symbols
   - No common words

4. **Enable Audit Trail**
   - Review your recent actions
   - Verify all approvals were yours
   - Report anomalies

---

## Onboarding Checklist

### For New Admin

- [ ] Receive invite email
- [ ] Click invite link
- [ ] Create password
- [ ] Confirm email
- [ ] Receive API key
- [ ] Save API key securely
- [ ] Test API access
- [ ] Read role documentation
- [ ] Review audit logs (understand what you can see)
- [ ] Complete compliance training

### For Super Admin Inviting

- [ ] Verify new admin identity
- [ ] Confirm role/responsibilities
- [ ] Send invitation
- [ ] Verify they received email
- [ ] Confirm account creation
- [ ] Add to team Slack/calendar
- [ ] Schedule onboarding call
- [ ] Log invitation in records

---

## Multi-Admin Scenarios

### Scenario 1: Buyer Admin Needs Approval from Financial Admin

**Flow:**

1. Buyer Admin approves buyer dispute → requests refund
2. System creates financial approval task
3. Financial Admin reviews → approves withdrawal
4. System processes payout
5. Both admins notified of outcome

### Scenario 2: Agent Admin + Financial Admin Coordination

**Flow:**

1. Agent Admin approves agent KYC
2. Agent now earns commissions
3. Financial Admin processes payouts
4. Audit log shows both actions

### Scenario 3: Removing Admin

**Flow:**

1. Super Admin suspends Buyer Admin
2. API key immediately invalid
3. Buyer Admin's session ends
4. Last activity logged
5. Access revoked from all endpoints

---

## API Endpoint Summary

### Super Admin Only

- `POST /admin/invitations` - Invite new admin
- `GET /admin/admins` - List all admins
- `PATCH /admin/admins/:id/suspend` - Suspend admin
- `PATCH /admin/admins/:id/reactivate` - Reactivate admin
- `DELETE /admin/admins/:id` - Remove admin
- `GET /admin/audit-logs` - View all audit logs
- `PATCH /admin/settings` - Change system settings

### All Admins (Role-Specific)

- `GET /admin/api-keys/current` - View your current API key
- `POST /admin/api-keys/rotate` - Rotate your API key
- `GET /admin/admins/:id/activity` - View own activity
- `POST /admin/password/change` - Change password

### Role-Specific Operations

- Buyer Admin: `/admin/buyers/*`
- Agent Admin: `/admin/agents/*`
- Financial Admin: `/admin/commissions/*`, `/payment/payout/*`
- Outreach Admin: `/admin/outreach/*`
- Inventory Admin: `/admin/inventory/*`

---

## Roles in UI

### Super Admin Dashboard

- Admin management panel
- Invite interface
- All analytics
- System settings

### Role-Specific Dashboards

- Buyer Admin: not a separate dashboard. A sub-admin lands on the one admin
  dashboard and sees a narrower set of pages, including buyer management,
  orders and disputes under an `admin/buyer/` domain folder
- Agent Admin: Agent approvals, KYC review, performance
- Financial Admin: Commissions, payouts, reports
- Outreach Admin: Campaigns, analytics, team assignments
- Inventory Admin: Products, stock, pricing

---

## Conclusion

This **role-based invitation system** provides:

- ✅ Secure onboarding (email + token)
- ✅ Fine-grained permissions (role-specific API keys)
- ✅ Scalable administration (easy to add/remove admins)
- ✅ Full audit trail (who did what, when)
- ✅ Key rotation & security (monthly reviews)
- ✅ Multi-admin coordination (approval workflows)

**Ready to implement role-based admin system! 🚀**
