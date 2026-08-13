# Paystack Implementation Plan (Paystack-Only, Full Features)

## 📋 Your Requirements

✅ **Agent Payouts**: Scheduled payouts to bank accounts (NOT automatic subaccount split)
✅ **Payment Methods**: Card + Mobile Money
✅ **Admin Features**: Dashboard + Dispute handling + Refund system

---

## 🏗️ Architecture Overview

```
BUYER CHECKOUT
    ↓
    ├─→ Pay with Card → Paystack
    ├─→ Pay with Mobile Money → Paystack
    └─→ Success → Create Order + Record Payment

PAYMENT SETTLEMENT
    ↓
    → Paystack receives 100% → Your wallet
    → Commission deducted from order total
    → Agent balance tracked in database

SCHEDULED AGENT PAYOUT (Daily/Weekly/Monthly)
    ↓
    → Calculate agent earnings
    → Initiate bank transfer via Paystack Transfer API
    → Track in database
    → Admin can monitor in dashboard

DISPUTES/CHARGEBACKS
    ↓
    → Webhook notification from Paystack
    → Auto-reverse order payment
    → Refund customer (or record for manual review)

CUSTOMER REFUNDS
    ↓
    → Admin initiates refund
    → Send refund request to Paystack
    → Refund goes back to customer's card/account
    → Update order status
```

---

## 🔴 BREAKING CHANGES (Current Implementation)

### **REMOVE These**

1. **SafeHaven Service** (`safehaven.service.ts`)
   - Bank name enquiry
   - Virtual account creation
   - Transfer API (replaced by Paystack)
   - Webhook handler

2. **Paystack Subaccount Split**
   - Remove automatic commission split logic
   - Remove `subaccount_code` from agent profiles
   - Commission now calculated & deducted from order total

3. **These API Endpoints**
   ```
   DELETE /api/v1/payment/name-enquiry
   DELETE /api/v1/payment/virtual-account
   DELETE /api/v1/payment/safehaven/webhook
   ```

### **CHANGE These**

1. **Agent Payout Logic**
   - Old: Automatic split via Paystack subaccounts
   - New: Manual scheduled payouts to agent bank accounts

2. **Payment Flow**
   - Old: Agent commission split at Paystack level
   - New: Commission deducted from order → Stored in agent_balance table

3. **Settlement**
   - Old: 100% to agent's subaccount, remainder to platform
   - New: 100% to platform, agent balance tracked separately

---

## 🆕 New Implementation Required

### **1. Database Changes**

#### Add to `agent_profiles` table:

```sql
- bank_code: string (e.g., "011" for First Bank)
- account_number: string (10 digits)
- account_name: string
- verified: boolean (account verified via name enquiry)
```

#### New table: `agent_balances`

```sql
CREATE TABLE agent_balances (
  id SERIAL PRIMARY KEY,
  agent_id INTEGER NOT NULL UNIQUE,
  available_balance BIGINT DEFAULT 0,      -- Can withdraw
  pending_balance BIGINT DEFAULT 0,        -- From recent sales
  total_earned BIGINT DEFAULT 0,           -- All-time earnings
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (agent_id) REFERENCES users(id)
);
```

#### New table: `payouts`

```sql
CREATE TABLE payouts (
  id SERIAL PRIMARY KEY,
  agent_id INTEGER NOT NULL,
  amount BIGINT NOT NULL,                  -- In kobo
  reference STRING UNIQUE,                 -- Paystack reference
  status ENUM('pending', 'processing', 'completed', 'failed'),
  bank_code STRING,
  account_number STRING,
  initiated_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  error_message STRING,
  FOREIGN KEY (agent_id) REFERENCES users(id)
);
```

#### New table: `refunds`

```sql
CREATE TABLE refunds (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL,
  amount BIGINT NOT NULL,
  reference STRING UNIQUE,                 -- Paystack reference
  reason STRING,
  status ENUM('initiated', 'processing', 'completed', 'failed'),
  initiated_by INTEGER,                    -- Admin ID
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id),
  FOREIGN KEY (initiated_by) REFERENCES users(id)
);
```

#### Modify `orders` table:

```sql
- agent_commission_amount: BIGINT         -- Commission deducted
- payment_reference: STRING               -- Paystack reference
- payment_status: ENUM('pending', 'completed', 'failed', 'disputed')
```

---

### **2. Backend Services to Create/Modify**

#### **A. Payment Service Updates**

```typescript
// paymentService.ts - CHANGES

// 1. Remove subaccount split logic
async initialize(dto: InitializePaymentDto) {
  // OLD: Calculate subaccount split
  // NEW: Just initialize plain Paystack payment

  const response = await fetch(`${this.baseUrl}/transaction/initialize`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${this.secretKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: dto.email,
      amount: amountKobo,
      metadata: {
        agent_id: dto.agent_id,
        type: 'agent_stock',
        ...dto.metadata
      },
      // REMOVED: split configuration
    }),
  });
}

// 2. Update webhook to credit agent balance
async handleWebhook(payload: Record<string, unknown>, signature: string) {
  // Verify webhook signature
  // On success:
  // 1. Create order
  // 2. Calculate commission: order_total * commission_rate
  // 3. Add to agent's pending_balance
  // 4. Update order status
  // 5. Send confirmation email
}

// 3. New method: Refund
async refundOrder(orderId: number, adminId: number) {
  // 1. Get order and payment reference
  // 2. Call Paystack refund API
  // 3. Create refund record
  // 4. Update order status to 'refunded'
  // 5. Deduct from agent balance
  // 6. Send notifications
}
```

#### **B. New Payout Service**

```typescript
// payoutService.ts - NEW

@Injectable()
export class PayoutService {
  // 1. Initiate Payout
  async initiatePayout(agentId: number, amountKobo: number) {
    // 1. Verify agent bank details are complete
    // 2. Call Paystack Transfer API
    // 3. Create payout record
    // 4. Move from pending_balance to processing
  }

  // 2. Get Payout Status
  async getPayoutStatus(transferReference: string) {
    // Poll Paystack API for status
    // Update payout record
  }

  // 3. Webhook Handler (Paystack sends transfer status)
  async handlePayoutWebhook(payload: Record<string, unknown>) {
    // Transfer succeeded/failed
    // Update payout record
    // Update agent balance
    // Send notification
  }

  // 4. Scheduled Job (Daily/Weekly)
  @Cron("0 10 * * *") // 10 AM daily
  async processScheduledPayouts() {
    // 1. Find agents with available_balance > threshold
    // 2. Initiate payouts for each
    // 3. Log results
  }
}
```

#### **C. New Refund Service**

```typescript
// refundService.ts - NEW

@Injectable()
export class RefundService {
  async refundOrder(orderId: number, adminId: number, reason: string) {
    // 1. Validate order (completed payment)
    // 2. Calculate refund amount (with commission reversal)
    // 3. Call Paystack refund API
    // 4. Record in refunds table
    // 5. Update agent balance (remove commission)
    // 6. Send email to buyer
  }

  async handleRefundWebhook(payload: Record<string, unknown>) {
    // Refund status update from Paystack
    // Update refunds table
  }
}
```

#### **D. New Dispute Service**

```typescript
// disputeService.ts - NEW

@Injectable()
export class DisputeService {
  async handleChargebackWebhook(payload: Record<string, unknown>) {
    // 1. Parse chargeback event
    // 2. Find affected order
    // 3. Auto-refund the payment
    // 4. Notify admin + agent
    // 5. Mark order as disputed
    // 6. Record dispute details
  }

  async resolveDispute(orderId: number, resolution: "refund" | "charge_back") {
    // Admin can manually resolve
    // Update order status
    // Send notifications
  }
}
```

---

### **3. Controller Endpoints to Create/Modify**

#### **Payment Controller Updates**

```typescript
@Controller("payment")
export class PaymentController {
  // EXISTING (keep as is)
  @Post("initialize")
  initialize(@Body() dto: InitializePaymentDto) {
    // Initialize payment without subaccount split
  }

  @Post("webhook")
  webhook(@Body() payload, @Headers("x-paystack-signature") sig) {
    // Updated: Credit agent balance on success
  }

  // NEW: Refund an order
  @Post("refund/:orderId")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("admin")
  refundOrder(
    @Param("orderId", ParseIntPipe) orderId: number,
    @Body() dto: { reason?: string },
    @CurrentUser() admin: JwtPayload,
  ) {
    return this.refundService.refundOrder(orderId, admin.sub, dto.reason);
  }

  // NEW: Get refund status
  @Get("refund/:orderId")
  @UseGuards(AuthGuard)
  getRefundStatus(@Param("orderId", ParseIntPipe) orderId: number) {
    return this.refundService.getRefundStatus(orderId);
  }

  // NEW: Initiate agent payout
  @Post("payout/initiate")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("admin")
  initiatePayout(@Body() dto: { agentId: number }) {
    return this.payoutService.initiatePayout(dto.agentId);
  }

  // NEW: List payouts
  @Get("payouts")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("admin")
  listPayouts(
    @Query("status") status?: string,
    @Query("agentId") agentId?: number,
  ) {
    return this.payoutService.listPayouts({ status, agentId });
  }

  // NEW: Get agent balance
  @Get("agent/:agentId/balance")
  @UseGuards(AuthGuard)
  getAgentBalance(@Param("agentId", ParseIntPipe) agentId: number) {
    return this.payoutService.getAgentBalance(agentId);
  }
}
```

---

### **4. Environment Variables**

```bash
# Paystack API
PAYSTACK_SECRET_KEY=sk_live_...
PAYSTACK_PUBLIC_KEY=pk_live_...
PAYSTACK_WEBHOOK_SECRET=whsec_...

# Commission Configuration
AGENT_COMMISSION_RATE=30              # Percentage (0-100)
MIN_PAYOUT_AMOUNT=50000               # Minimum payout in kobo (₦500)

# Payout Schedule
PAYOUT_SCHEDULE_FREQUENCY=daily       # daily, weekly, monthly
PAYOUT_SCHEDULE_TIME=10:00            # UTC time
PAYOUT_DAY_OF_WEEK=friday             # For weekly
PAYOUT_DAY_OF_MONTH=1                 # For monthly

# Refund/Dispute Settings
AUTO_REFUND_ON_CHARGEBACK=true
CHARGEBACK_NOTIFICATION_EMAIL=admin@debridgers.com
```

---

## 📋 Implementation Tasks (In Order)

### **Phase 1: Database Setup** (2 hours)

- [ ] Create migrations for new tables (agent_balances, payouts, refunds, disputes)
- [ ] Add columns to orders table
- [ ] Add columns to agent_profiles table
- [ ] Test migrations locally
- [ ] Backup production database

### **Phase 2: Remove SafeHaven** (1 hour)

- [ ] Delete safehaven.service.ts
- [ ] Remove from payment.module imports
- [ ] Delete SafeHaven endpoints from payment.controller
- [ ] Remove env vars (SafeHaven keys)
- [ ] Update tests

### **Phase 3: Update Payment Service** (3-4 hours)

- [ ] Remove subaccount split logic
- [ ] Update webhook to credit agent balance
- [ ] Add error handling
- [ ] Add logging
- [ ] Test with Paystack test card

### **Phase 4: Implement Refund System** (3-4 hours)

- [ ] Create refundService
- [ ] Add refund endpoints
- [ ] Implement Paystack refund API calls
- [ ] Handle refund webhooks
- [ ] Add email notifications
- [ ] Test refund flow

### **Phase 5: Implement Dispute Handling** (2-3 hours)

- [ ] Create disputeService
- [ ] Handle chargeback webhooks
- [ ] Auto-refund on chargeback
- [ ] Track dispute metadata
- [ ] Notify admin

### **Phase 6: Implement Scheduled Payouts** (4-5 hours)

- [ ] Create payoutService
- [ ] Implement Paystack Transfer API integration
- [ ] Setup cron job for scheduled payouts
- [ ] Add payout status tracking
- [ ] Handle payout webhooks

### **Phase 7: Admin Dashboard** (6-8 hours)

- [ ] Transaction list (buyers & payouts)
- [ ] Settlement records
- [ ] Dispute/chargeback list
- [ ] Refund history
- [ ] Agent balance tracking
- [ ] Export to CSV

### **Phase 8: Testing & Deployment** (2-3 hours)

- [ ] End-to-end testing
- [ ] Load testing
- [ ] Staging environment
- [ ] Production deployment
- [ ] Monitoring setup

---

## 📊 Total Effort Estimate

| Phase                | Hours           | Days             |
| -------------------- | --------------- | ---------------- |
| 1. Database Setup    | 2               | 1 day            |
| 2. Remove SafeHaven  | 1               | Same day as #3   |
| 3. Update Payments   | 3-4             | 1 day            |
| 4. Refund System     | 3-4             | 1 day            |
| 5. Dispute Handling  | 2-3             | 1 day            |
| 6. Scheduled Payouts | 4-5             | 1-2 days         |
| 7. Admin Dashboard   | 6-8             | 2 days           |
| 8. Testing & Deploy  | 2-3             | 1 day            |
| **TOTAL**            | **24-30 hours** | **~1.5-2 weeks** |

---

## 💻 Frontend Changes Needed

### **Buyer Checkout** (Minimal changes)

- ✅ Already working (just verify payment methods show)
- No virtual account needed

### **Agent Dashboard** (New)

- [ ] View available balance
- [ ] View pending commissions
- [ ] View payout history
- [ ] Bank account settings

### **Admin Dashboard** (New)

- [ ] Transaction history
- [ ] Payout management
- [ ] Dispute tracking
- [ ] Refund management
- [ ] Settlement records

---

## 🎯 Paystack Webhook Events to Handle

```
✅ charge.success       → Create order, credit agent
✅ charge.failed        → Mark order as failed
✅ transfer.success     → Mark payout as completed
✅ transfer.failed      → Mark payout as failed, notify admin
✅ refund.created       → Record refund
✅ refund.processed     → Mark refund as completed
✅ chargeback.created   → Auto-refund, notify admin
✅ chargeback.resolved  → Update dispute status
```

---

## 🚀 What I Need From You

**To start immediately:**

1. **Paystack API Keys** (test first)

   ```
   PAYSTACK_SECRET_KEY=sk_test_...
   PAYSTACK_PUBLIC_KEY=pk_test_...
   PAYSTACK_WEBHOOK_SECRET=whsec_...
   ```

2. **Database Access** (to run migrations)
   - Staging database for testing
   - Production database backup plan

3. **Decisions**:
   - [ ] Min payout amount? (e.g., ₦500 = 50000 kobo)
   - [ ] Payout frequency? (daily/weekly/monthly)
   - [ ] Auto-refund on chargeback? (yes/no)
   - [ ] Commission rate final? (currently 30%)

4. **Timeline Preference**:
   - [ ] Do it all at once (2 weeks)
   - [ ] Phase by phase (payment first, then payouts, then dashboard)

---

## ⚠️ Important Notes

### **Breaking Change Notice**

This is a significant architectural change from the current SafeHaven + Subaccount approach. Will require:

- Database migration
- API changes
- Frontend updates
- Testing

### **Agent Communication**

Before deploying, agents need to know:

- They no longer get automatic commission splits
- Commission is calculated and credited to their balance
- They initiate payouts (or admin schedules them)
- Payout timing (24-48 hours to their bank)

### **Backup Plan**

- Keep SafeHaven logic in separate branch
- Test thoroughly before removing
- Have rollback plan ready

---

**Ready to proceed?** Send me the Paystack keys and we can start with Phase 1!
