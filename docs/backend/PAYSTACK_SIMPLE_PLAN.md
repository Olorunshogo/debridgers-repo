# Paystack Implementation - Simplified Plan

## ✅ Keep (Working Now)

```
✅ Automatic Commission Split via Subaccounts
   → Agent gets 100% of commission to their subaccount
   → Platform keeps remainder
   → Agent sees balance in Paystack wallet

✅ Card + Mobile Money Payments
   → Already working

✅ Webhook Handling
   → Already working
```

## 🆕 ADD (New Features)

```
1. Weekly Scheduled Withdrawals
   → Every Friday at 10 AM (configurable)
   → Only if balance > ₦5,000 (50,000 kobo)
   → Automatic bank transfer to agent's registered account

2. Admin Dashboard
   → View all transactions
   → Track payouts
   → Handle disputes/chargebacks
   → Process refunds manually

3. Dispute/Chargeback Handling
   → Listen to Paystack webhooks
   → Notify admin
   → Manual resolution option

4. Refund System
   → Admin can issue refunds
   → Reverse payment to customer
   → Deduct from agent's subaccount if commission already credited

5. Remove SafeHaven
   → Delete safehaven.service.ts
   → Remove virtual account endpoints
   → Remove bank name enquiry endpoints
```

---

## 🗄️ Database Changes (Minimal)

### Add to `agent_profiles` table:

```sql
ALTER TABLE agent_profiles ADD COLUMN (
  bank_code VARCHAR(10),           -- e.g., "011" for First Bank
  account_number VARCHAR(10),      -- 10 digits
  account_name VARCHAR(255),       -- Account holder name
  account_verified BOOLEAN DEFAULT false,
  last_withdrawal_date TIMESTAMP   -- Track last payout
);
```

### New table: `payouts` (Track weekly withdrawals)

```sql
CREATE TABLE payouts (
  id SERIAL PRIMARY KEY,
  agent_id INTEGER NOT NULL,
  subaccount_code VARCHAR(50),     -- Paystack subaccount
  amount BIGINT NOT NULL,          -- In kobo
  reference VARCHAR(100) UNIQUE,   -- Paystack transfer reference
  status VARCHAR(20),              -- pending, processing, completed, failed
  initiated_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  error_message TEXT,
  FOREIGN KEY (agent_id) REFERENCES users(id)
);
```

### New table: `refunds` (Track manual refunds)

```sql
CREATE TABLE refunds (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL,
  amount BIGINT NOT NULL,          -- In kobo
  reference VARCHAR(100) UNIQUE,   -- Paystack refund reference
  reason VARCHAR(255),
  status VARCHAR(20),              -- initiated, processing, completed, failed
  initiated_by INTEGER,            -- Admin ID
  initiated_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id),
  FOREIGN KEY (initiated_by) REFERENCES users(id)
);
```

### Modify `orders` table:

```sql
ALTER TABLE orders ADD COLUMN (
  payment_reference VARCHAR(100),  -- Paystack transaction reference
  payment_status VARCHAR(20),      -- pending, completed, failed, disputed, refunded
  refund_id INTEGER                -- Link to refunds table
);
```

---

## 🔧 Backend Services

### **1. New: PayoutService (Weekly Withdrawals)**

```typescript
// payout.service.ts - NEW

@Injectable()
export class PayoutService {
  constructor(
    private readonly db: Database,
    private readonly config: ConfigService,
  ) {
    this.secretKey = config.get<string>("PAYSTACK_SECRET_KEY");
  }

  // Run every Friday at 10 AM
  @Cron("0 10 * * 5") // Cron: Friday 10:00 AM
  async processWeeklyPayouts() {
    // 1. Get all agents with subaccounts
    const agents = await this.db
      .select()
      .from(agent_profiles)
      .where(is_not(paystack_subaccount_code, null));

    for (const agent of agents) {
      await this.processAgentPayout(agent);
    }
  }

  async processAgentPayout(agent: AgentProfile) {
    // 1. Get subaccount balance from Paystack API
    const balance = await this.getSubaccountBalance(
      agent.paystack_subaccount_code,
    );

    // 2. Check minimum threshold (₦5,000 = 50,000 kobo)
    const MIN_PAYOUT = 50000;
    if (balance < MIN_PAYOUT) {
      this.logger.log(
        `Agent ${agent.user_id}: Balance ${balance} < ${MIN_PAYOUT}, skipping`,
      );
      return;
    }

    // 3. Get agent's bank details
    const bankDetails = {
      code: agent.bank_code,
      account: agent.account_number,
      name: agent.account_name,
    };

    // 4. Initiate Paystack transfer
    const reference = await this.initiatePaystackTransfer(
      balance,
      bankDetails,
      `Weekly payout for agent ${agent.user_id}`,
    );

    // 5. Record in database
    await this.db.insert(payouts).values({
      agent_id: agent.user_id,
      subaccount_code: agent.paystack_subaccount_code,
      amount: balance,
      reference,
      status: "processing",
      initiated_at: new Date(),
    });

    this.logger.log(
      `Payout initiated for agent ${agent.user_id}: ₦${balance / 100}`,
    );
  }

  async getSubaccountBalance(subaccountCode: string) {
    // Call Paystack Subaccount API to get balance
    const res = await fetch(
      `https://api.paystack.co/subaccount/${subaccountCode}`,
      {
        headers: { Authorization: `Bearer ${this.secretKey}` },
      },
    );
    const data = (await res.json()) as { data: { balance: number } };
    return data.data.balance;
  }

  async initiatePaystackTransfer(
    amountKobo: number,
    bankDetails: BankDetails,
    reason: string,
  ) {
    const res = await fetch("https://api.paystack.co/transfer", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        source: "balance",
        type: "nuban",
        amount: amountKobo,
        recipient: {
          type: "nuban",
          account_number: bankDetails.account,
          bank_code: bankDetails.code,
        },
        reason,
      }),
    });

    const data = (await res.json()) as { data: { reference: string } };
    return data.data.reference;
  }

  // Handle Paystack transfer webhook (status updates)
  async handleTransferWebhook(payload: any) {
    const { reference, status } = payload.data;

    // Update payout record
    await this.db
      .update(payouts)
      .set({
        status: status === "success" ? "completed" : "failed",
        completed_at: new Date(),
      })
      .where(eq(payouts.reference, reference));
  }
}
```

### **2. New: RefundService (Manual Refunds)**

```typescript
// refund.service.ts - NEW

@Injectable()
export class RefundService {
  constructor(
    private readonly db: Database,
    private readonly config: ConfigService,
  ) {
    this.secretKey = config.get<string>("PAYSTACK_SECRET_KEY");
  }

  async refundOrder(orderId: number, reason: string, initiatedBy: number) {
    // 1. Get order with payment reference
    const order = await this.db
      .select()
      .from(orders)
      .where(eq(orders.id, orderId));

    if (!order?.payment_reference) {
      throw new BadRequestException("Order has no payment to refund");
    }

    // 2. Call Paystack refund API
    const refundReference = await this.initiatePaystackRefund(
      order.payment_reference,
      reason,
    );

    // 3. Record refund in database
    const refund = await this.db
      .insert(refunds)
      .values({
        order_id: orderId,
        amount: order.total_amount,
        reference: refundReference,
        reason,
        status: "processing",
        initiated_by: initiatedBy,
      })
      .returning();

    // 4. Update order status
    await this.db
      .update(orders)
      .set({
        payment_status: "refunded",
        refund_id: refund[0].id,
      })
      .where(eq(orders.id, orderId));

    return refund[0];
  }

  async initiatePaystackRefund(transactionReference: string, reason: string) {
    const res = await fetch(`https://api.paystack.co/refund`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        transaction: transactionReference,
        amount: 0, // 0 = full refund
        reason,
      }),
    });

    const data = (await res.json()) as { data: { reference: string } };
    return data.data.reference;
  }

  async handleRefundWebhook(payload: any) {
    const { reference, status } = payload.data;

    await this.db
      .update(refunds)
      .set({
        status: status === "success" ? "completed" : "failed",
        completed_at: new Date(),
      })
      .where(eq(refunds.reference, reference));
  }
}
```

### **3. New: DisputeService (Chargeback Handling)**

```typescript
// dispute.service.ts - NEW

@Injectable()
export class DisputeService {
  async handleChargebackWebhook(payload: any) {
    // 1. Parse chargeback details
    const { transaction, status } = payload.data;

    // 2. Find affected order
    const order = await this.db
      .select()
      .from(orders)
      .where(eq(orders.payment_reference, transaction));

    if (!order) return; // Order not found, skip

    // 3. Mark order as disputed
    await this.db
      .update(orders)
      .set({ payment_status: "disputed" })
      .where(eq(orders.id, order.id));

    // 4. Notify admin
    await this.sendAdminNotification(
      `Chargeback received for order #${order.id}`,
      order,
    );

    // 5. If agent already got commission, flag for review
    if (order.agent_commission_amount > 0) {
      await this.flagAgentForReview(order.agent_id, order);
    }
  }

  async resolveDispute(
    orderId: number,
    resolution: "refund" | "accept_charge",
    adminId: number,
  ) {
    const order = await this.db
      .select()
      .from(orders)
      .where(eq(orders.id, orderId));

    if (resolution === "refund") {
      // Refund the customer
      await this.refundService.refundOrder(
        orderId,
        "Dispute resolution",
        adminId,
      );
    }

    // Update order status
    await this.db
      .update(orders)
      .set({ payment_status: "resolved" })
      .where(eq(orders.id, orderId));
  }
}
```

---

## 🛣️ API Endpoints (New/Modified)

### **Admin Endpoints**

```typescript
// Payouts
POST   /api/v1/admin/payouts/manual        // Manually trigger payout for agent
GET    /api/v1/admin/payouts               // List all payouts
GET    /api/v1/admin/payouts/:agentId      // Agent's payout history

// Refunds
POST   /api/v1/admin/refunds               // Initiate refund for order
GET    /api/v1/admin/refunds               // List all refunds
GET    /api/v1/admin/refunds/:orderId      // Refund status for order

// Disputes
GET    /api/v1/admin/disputes              // List disputes/chargebacks
PATCH  /api/v1/admin/disputes/:orderId     // Resolve dispute

// Webhooks (Paystack)
POST   /api/v1/payment/webhook             // Payment success/failure
POST   /api/v1/payment/transfer/webhook    // Transfer (payout) status
POST   /api/v1/payment/refund/webhook      // Refund status
POST   /api/v1/payment/dispute/webhook     // Chargeback notification
```

---

## 📊 Implementation Tasks

### **Phase 1: Remove SafeHaven** (1 hour)

- [ ] Delete `safehaven.service.ts`
- [ ] Remove from `payment.module.ts`
- [ ] Delete endpoints: `/name-enquiry`, `/virtual-account`, `/safehaven/webhook`
- [ ] Remove env vars
- [ ] Test

### **Phase 2: Database Setup** (1 hour)

- [ ] Create payouts table
- [ ] Create refunds table
- [ ] Modify agent_profiles (add bank details)
- [ ] Modify orders (add payment_reference, payment_status, refund_id)

### **Phase 3: Scheduled Payouts** (4 hours)

- [ ] Create `PayoutService`
- [ ] Implement `@Cron` for weekly payouts
- [ ] Call Paystack Subaccount balance API
- [ ] Call Paystack Transfer API
- [ ] Handle transfer webhooks
- [ ] Add endpoints for manual payouts
- [ ] Test with Paystack sandbox

### **Phase 4: Refund System** (3 hours)

- [ ] Create `RefundService`
- [ ] Add refund endpoints
- [ ] Call Paystack refund API
- [ ] Handle refund webhooks
- [ ] Test refunds

### **Phase 5: Dispute Handling** (2 hours)

- [ ] Create `DisputeService`
- [ ] Handle chargeback webhooks
- [ ] Notify admin
- [ ] Add dispute resolution endpoint
- [ ] Test with Paystack

### **Phase 6: Admin Dashboard** (4 hours)

- [ ] Transaction list
- [ ] Payout history (by agent, status, date)
- [ ] Refund management
- [ ] Dispute tracking
- [ ] Agent balance view

### **Phase 7: Testing & Deployment** (2 hours)

- [ ] End-to-end testing
- [ ] Staging deployment
- [ ] Production deployment
- [ ] Monitoring

---

## 📋 Total Effort

| Phase                | Hours        |
| -------------------- | ------------ |
| 1. Remove SafeHaven  | 1            |
| 2. Database          | 1            |
| 3. Scheduled Payouts | 4            |
| 4. Refunds           | 3            |
| 5. Disputes          | 2            |
| 6. Admin Dashboard   | 4            |
| 7. Testing           | 2            |
| **TOTAL**            | **17 hours** |

**Timeline**: ~1 week (5 working days)

---

## 🎯 Environment Variables

```bash
# Paystack
PAYSTACK_SECRET_KEY=sk_live_...
PAYSTACK_PUBLIC_KEY=pk_live_...
PAYSTACK_WEBHOOK_SECRET=whsec_...

# Payout Settings
MIN_PAYOUT_AMOUNT=50000           # ₦5,000 in kobo
PAYOUT_SCHEDULE_CRON=0 10 * * 5   # Friday 10 AM UTC
PAYOUT_DAY_NAME=friday

# Commission (existing)
AGENT_COMMISSION_RATE=30
```

---

## 🚀 What I Need From You

1. **Paystack Keys** (for testing)

   ```
   PAYSTACK_SECRET_KEY
   PAYSTACK_PUBLIC_KEY
   PAYSTACK_WEBHOOK_SECRET
   ```

2. **Agent Bank Details** (how do agents provide?)
   - Form during signup?
   - Separate page in dashboard?
   - Admin input?

3. **Payout Schedule** (or use Friday 10 AM default?)

   ```
   Weekly: Every Friday?
   Or: Every Monday?
   Or: Monthly on 1st?
   ```

4. **Confirmation**:
   - Min payout = ₦5,000? ✓ (confirmed)
   - Keep automatic subaccount split? ✓ (confirmed)
   - Weekly payouts? ✓ (confirmed)

---

## ✅ Checklist Before Starting

- [ ] You have Paystack business account
- [ ] You have API keys (test mode)
- [ ] You can access production database
- [ ] You have backup of current database
- [ ] Team understands timeline (~1 week)

**Ready to start Phase 1?**
