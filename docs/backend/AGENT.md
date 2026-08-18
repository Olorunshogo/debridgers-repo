# Agent System - Product Documentation

**Debridgers Platform | Live Production System**

---

## Table of Contents

1. [Overview](#overview)
2. [What is an Agent?](#what-is-an-agent)
3. [Agent Features (Sprints)](#agent-features-sprints)
4. [Agent Admin Dashboard](#agent-admin-dashboard)
5. [Success Requirements](#success-requirements)
6. [Testing Checklist](#testing-checklist)

---

## Overview

The **Agent System** is the field sales and distribution network for Debridgers. Agents are independent sales representatives who source grain products from our warehouse and sell them to local buyers in their area. They earn commissions on every sale and can request payouts to their bank account.

**Current Status:** ✅ LIVE IN PRODUCTION

---

## What is an Agent?

### Simple Explanation

An Agent is someone who:

- **Signs up** on Debridgers platform (like a seller account)
- **Gets approved** by the admin team
- **Orders stock** (bags of grain) from the warehouse
- **Sells** those bags to local shops, markets, or businesses
- **Makes money** by earning commission (₦300 per ₦1000 sold)
- **Requests payout** to their bank account when they have earnings

### Who Can Be an Agent?

- Individual sales professionals
- Market traders
- Farm supply retailers
- Anyone interested in grain distribution

---

## Agent Features (Sprints)

### 🟢 SPRINT 1: Agent Registration & Application

**Status:** ✅ COMPLETE & LIVE

#### What Agents Do:

1. Go to Debridgers website
2. Click "Apply as Agent"
3. Fill in basic information:
   - Full name
   - Email address
   - Phone number
   - Location (LGA - Local Government Area)
   - Physical address
   - Password
4. Upload CV/resume (PDF or image)
5. Submit application

#### What Admin Does:

1. Review application
2. Check CV and contact details
3. Approve or reject application
4. Send approval email to agent

#### Success Requirements:

- ✅ Application form submits successfully
- ✅ Agent receives confirmation email
- ✅ Admin can see pending applications in dashboard
- ✅ Agent cannot login before approval
- ✅ Email validation works (no duplicate emails)

#### Testing:

```
□ Apply with valid data → Application shows "pending"
□ Apply with same email twice → Shows error
□ Admin approves → Agent gets email notification
□ Admin rejects → Agent gets rejection email
□ Agent tries to login before approval → Access denied
```

---

### 🟡 SPRINT 2: KYC Verification (Know Your Customer)

**Status:** ✅ COMPLETE & LIVE

#### What Agents Do:

1. After approval, they log into their dashboard
2. Go to "KYC Verification" section
3. Submit identity documents:
   - **ID Type:** Choose NIN, Passport, or Driver's License
   - **ID Front Photo:** Photo of front of ID card
   - **ID Selfie:** Selfie holding their ID card
   - **Bank Details:**
     - Bank name (e.g., GTBank, Access Bank)
     - Account number (10 digits)
     - Account holder name
4. Submit for verification

#### What Admin Does:

1. Review submitted documents in dashboard
2. Check if ID is valid and clear
3. Check if selfie matches ID photo
4. Approve or reject KYC
5. If rejected, provide reason for resubmission

#### Success Requirements:

- ✅ Agent can upload multiple files simultaneously
- ✅ File validation works (only images/PDFs accepted, max 5MB)
- ✅ Admin sees all pending KYC in queue
- ✅ Admin can approve/reject with reason
- ✅ Agent notified of KYC status
- ✅ Agent cannot proceed without KYC approval

#### Testing:

```
□ Upload valid ID photos → Status shows "submitted"
□ Upload invalid file (video) → Shows error
□ Admin approves → Agent gets email
□ Admin rejects with reason → Agent sees reason
□ Agent cannot request stock before KYC approval
□ Agent can resubmit after rejection
```

---

### 🟡 SPRINT 3: Stock Management (Ordering & Inventory)

**Status:** ✅ COMPLETE & LIVE

#### What Agents Do:

1. View "Order Stock" page
2. See available products and price per unit:
   - **Price per bag:** ₦1,300 (130,000 kobo)
   - **Minimum order:** 1 bag
3. Enter quantity they want to order
4. See total amount to pay
5. Submit stock request
6. Wait for warehouse to fulfill

**Example:**

- Agent orders: 10 bags
- Cost: 10 × ₦1,300 = ₦13,000
- Status: "Pending fulfillment"

#### After Fulfillment:

1. Admin confirms stock is dispatched
2. Agent sees status change to "Fulfilled"
3. Agent can make partial payments (e.g., pay ₦5,000 first, then ₦8,000 later)

#### What Admin Does:

1. View all stock requests from agents
2. Check warehouse availability
3. Mark as "Fulfilled" when stock is dispatched
4. Track agent's payment progress

#### Success Requirements:

- ✅ Agent can place multiple stock orders
- ✅ Admin approves fulfillment
- ✅ Agent can make partial payments
- ✅ System tracks payment progress
- ✅ Agent cannot order if KYC not approved
- ✅ Cannot over-order beyond warehouse stock

#### Testing:

```
□ Agent orders 10 bags → Request shows "pending"
□ Admin fulfills → Status changes to "fulfilled"
□ Agent pays ₦5,000 of ₦13,000 → Shows ₦8,000 outstanding
□ Agent pays remaining ₦8,000 → Shows "fully paid"
□ Admin cannot over-fulfill → System prevents it
□ Stock levels update after fulfillment
```

---

### 🟢 SPRINT 4: Sales Reporting

**Status:** ✅ COMPLETE & LIVE

#### What Agents Do:

1. Go to "My Sales" section
2. At end of each day/week, submit a sales report:
   - **Bags sold:** How many bags they sold (e.g., 5)
   - **Amount collected:** Total money earned (e.g., ₦5,000)
   - **Notes:** (Optional) Where they sold, what customers, etc.
3. Submit report

**Example:**

- Sold 5 bags
- Collected ₦5,000
- Notes: "Sold to Barnawa market traders"

#### What Happens:

- System auto-calculates commission:
  - If they collected ₦5,000 → Commission = ₦250 (5%)
- Commission appears in their wallet as "pending"
- Commission becomes "available" when admin marks as paid

#### What Admin Does:

1. View all agents' sales reports
2. Verify the reports look reasonable
3. Mark commission as "paid" when confirmed

#### Success Requirements:

- ✅ Agent can submit multiple reports daily
- ✅ Commission auto-calculates correctly (5%)
- ✅ Commission tracked as "pending" → "paid"
- ✅ Agent can see all their past reports
- ✅ Admin can filter reports by agent/date

#### Testing:

```
□ Agent submits report: 5 bags, ₦5,000 → Commission shows ₦250
□ Agent submits report: 10 bags, ₦10,000 → Commission shows ₦3,000
□ Admin marks commission paid → Agent wallet updates
□ Agent can see history of all reports
□ Admin dashboard shows pending commissions
```

---

### 🟢 SPRINT 5: Wallet & Balance Tracking

**Status:** ✅ COMPLETE & LIVE

#### What Agents Do:

1. Go to "My Wallet"
2. See their balance broken down:
   - **Available Balance:** Money they can withdraw now
   - **Pending Balance:** Money waiting to be confirmed
   - **Total Earned:** All-time earnings
3. View transaction history:
   - Every report submission
   - Every payout request
   - Every payment deduction

**Example Wallet:**

```
Available Balance:  ₦50,000 (can withdraw)
Pending Balance:    ₦15,000 (waiting to be confirmed)
Total Earned:       ₦500,000 (all-time)
```

#### What Admin Does:

1. View all agents' wallet balances
2. Track total platform payouts
3. See which agents owe money (if any)
4. Monitor financial health

#### Success Requirements:

- ✅ Balance updates immediately after report
- ✅ Pending → Available when admin confirms
- ✅ Accurate commission math (never over/underpays)
- ✅ Transaction history is complete and auditable
- ✅ Agent cannot see other agents' wallets

#### Testing:

```
□ Agent submits report → Pending balance increases
□ Admin confirms → Available balance increases
□ Check math: 5% commission is always correct
□ View full history for any agent
□ No access between agents' wallets
```

---

### 🟢 SPRINT 6: Bank Details Management

**Status:** ✅ COMPLETE & LIVE (with Paystack verification)

#### What Agents Do:

1. Go to "Settings" → "Bank Details"
2. Select their bank from dropdown:
   - GTBank, Access Bank, UBA, Zenith, etc.
3. Enter their bank account number
4. System auto-verifies the account
5. Shows them the name on the account
6. Agent confirms it matches their name
7. Save bank details

**Example:**

```
Bank: Guaranty Trust Bank
Account: 0123456789
Account Holder Name: Amina Yusuf ← System auto-fills this
```

#### What Admin Does:

1. Verify all agents have valid bank details
2. See which agents are ready for payout
3. See which agents have incomplete details

#### Success Requirements:

- ✅ Bank details verified with Paystack API
- ✅ Account name auto-populates (prevents typos)
- ✅ Cannot save without valid verification
- ✅ Agent must confirm account name matches
- ✅ Admin sees complete/incomplete status

#### Testing:

```
□ Enter bank details → Paystack verifies account
□ Account name shows correctly
□ If account wrong → Shows error
□ Cannot save without verification
□ Admin dashboard shows ✅ for complete, ❌ for incomplete
□ Agent can edit if needed
```

---

### 🟢 SPRINT 7: Payout Requests (Withdrawals)

**Status:** ✅ COMPLETE & LIVE

#### What Agents Do:

1. Go to "My Wallet" → "Request Payout"
2. Enter amount they want to withdraw (e.g., ₦20,000)
3. System checks:
   - Do they have bank details? ✅
   - Do they have enough balance? ✅
4. Confirms payout request
5. Money is held (not in available balance anymore)
6. Request goes to admin for approval

**Example:**

```
Available: ₦50,000
Request: ₦20,000
After request: Available becomes ₦30,000
Status: "Pending admin approval"
```

#### What Admin Does:

1. View all payout requests in dashboard
2. Review request details:
   - Agent name
   - Amount requested
   - Bank details
3. Click "Process Payout"
4. System sends money to agent's bank via Paystack
5. Payout marked as "completed"
6. Agent notified

#### Success Requirements:

- ✅ Agent balance deducted immediately (prevents double-spend)
- ✅ Admin can approve multiple payouts
- ✅ Money actually transfers to bank account
- ✅ Payout receipt generated
- ✅ Agent notified of status (pending → completed)
- ✅ Audit trail shows who approved and when

#### Testing:

```
□ Agent requests ₦20,000 → Available balance reduced by ₦20,000
□ Request shows "pending"
□ Admin approves → Payout processed
□ Money appears in agent's bank account (real transfer)
□ Status shows "completed" with reference number
□ Agent receives email confirmation
□ Cannot over-request available balance
□ Cannot request without bank details
```

---

### 🟢 SPRINT 8: Dashboard & Performance Leaderboard

**Status:** ✅ COMPLETE & LIVE

#### What Agents Do:

1. Log into dashboard - see their stats:
   - **Bags Sold:** Total bags sold (all-time)
   - **Total Earned:** Commission earnings (all-time)
   - **Current Rank:** Their position on leaderboard
   - **Days Reported:** How many days they've submitted reports
   - **Pending Commission:** Money waiting to be confirmed
2. View "Leaderboard" - see top 20 agents:
   - Rank, Name, Location, Bags Sold

**Example:**

```
YOUR STATS:
Bags Sold: 42
Total Earned: ₦63,000
Your Rank: #3 (out of all agents)
Days Reported: 14
Pending: ₦2,000
```

#### What Admin Does:

1. View all agents' performance metrics
2. See who's top performers
3. Identify underperforming agents
4. Set sales targets for agents (e.g., "Sell 50 bags this month")
5. Promote top agents to "State Managers" (manage other agents)

#### Success Requirements:

- ✅ Dashboard updates in real-time
- ✅ Leaderboard updates when agents submit reports
- ✅ Rank is accurate and competitive
- ✅ All metrics are correct
- ✅ Admin can set targets per agent
- ✅ Admin can promote agents to manager

#### Testing:

```
□ Agent submits report → Dashboard updates immediately
□ Leaderboard reflects new sales
□ Rank changes as agents submit sales
□ Admin sets target → Agent sees it
□ Target tracking shows progress (e.g., 30/50 bags)
□ Promote agent → See "State Manager" badge
```

---

### 🟢 SPRINT 9: Notifications & Support

**Status:** ✅ COMPLETE & LIVE

#### What Agents Do:

1. Receive notifications for:
   - Application approved/rejected
   - KYC status changed
   - Stock fulfilled
   - Commission confirmed
   - Payout completed
2. Can contact support if issues

#### What Admin Does:

1. Send notifications to agents
2. Respond to agent support requests
3. Mark notifications as read/unread

#### Success Requirements:

- ✅ Notifications sent via email
- ✅ Notifications show in dashboard
- ✅ Agent can mark as read
- ✅ Support tickets created and tracked

#### Testing:

```
□ Action happens → Email sent within 1 minute
□ Notification appears in dashboard
□ Agent can mark as read
□ Support ticket is trackable
```

---

## Agent Admin Dashboard

### What is Agent Admin?

**Agent Admin** is a separate role for staff who manage the agent network. They are NOT agents themselves - they are Debridgers employees who:

- Approve/reject agent applications
- Review KYC documents
- Fulfill stock requests
- Process payouts
- Set sales targets
- Monitor performance

### Agent Admin Access

Agent Admin staff have a special dashboard with:

```
AGENT ADMIN DASHBOARD
├── Applications (Pending)
│   └── Review → Approve/Reject
├── KYC Queue (Pending)
│   └── Review documents → Approve/Reject
├── Stock Requests
│   └── View → Mark fulfilled
├── Sales Reports
│   └── View agent reports
├── Commissions
│   └── View → Mark as paid
├── Payout Requests
│   └── Review → Process payout
├── Agent Performance
│   └── View all agents, set targets
└── Settings
    └── Configure commission rates
```

### Agent Admin Workflows

#### Workflow 1: Approve New Agent

1. See pending application
2. Review agent info and CV
3. Click "Approve"
4. Agent gets email, can now login
5. Agent completes KYC next

#### Workflow 2: Review KYC Documents

1. See pending KYC submission
2. Check ID photos are clear and valid
3. Check selfie is agent holding ID
4. Check bank details are filled
5. Click "Approve" or "Reject + Reason"
6. Agent notified of decision

#### Workflow 3: Fulfill Stock Request

1. See agent's stock request (10 bags for ₦13,000)
2. Check warehouse has stock
3. Click "Mark Fulfilled"
4. Warehouse packs and ships to agent
5. Agent can now start making payments

#### Workflow 4: Process Payout

1. Agent requests ₦20,000 withdrawal
2. Admin reviews:
   - Agent status: Approved ✅
   - Bank details: Valid ✅
   - Amount: ₦20,000 (available balance ₦50,000) ✅
3. Click "Process Payout"
4. Money transfers to agent's bank (via Paystack)
5. Agent receives notification

---

## Success Requirements

### Per Agent (Application to Payout)

| Stage            | Success =                     | Testing Method               |
| ---------------- | ----------------------------- | ---------------------------- |
| **Application**  | Applied successfully          | Email confirmation           |
| **Approval**     | Can login to dashboard        | Login attempt succeeds       |
| **KYC**          | Documents uploaded & verified | Admin approves in <24hrs     |
| **Bank Details** | Verified with Paystack        | Account name shows correctly |
| **First Order**  | Stock request approved        | Status: "fulfilled"          |
| **First Sale**   | Report submitted              | Commission auto-calculated   |
| **First Payout** | Money in bank account         | Check agent's bank statement |

### For Entire System

| Metric                    | Success Target                | How to Verify                            |
| ------------------------- | ----------------------------- | ---------------------------------------- |
| **Agent Onboarding Time** | <48 hours from apply to login | Measure from app submit to first login   |
| **KYC Approval Time**     | <24 hours                     | Admin review dashboard                   |
| **Stock Fulfillment**     | <2 hours                      | Request timestamp to fulfilled timestamp |
| **Commission Accuracy**   | 100% correct (5% of sales)    | Audit: random reports and verify math    |
| **Payout Success Rate**   | 99.9% (transfers complete)    | Check bank statements vs requests        |
| **Email Delivery**        | 95%+ delivered                | Check email logs                         |
| **System Uptime**         | 99.5% or higher               | Monitoring dashboard                     |

---

## Testing Checklist

### 1. Agent Application Flow

- [ ] **Happy Path:** Complete application → Get approval email → Login works
- [ ] **Validation:** Empty fields → Shows error
- [ ] **Duplicate:** Apply with same email twice → Shows error
- [ ] **File Upload:** CV upload fails with unsupported file → Shows error
- [ ] **Approval:** Admin approves → Email sent within 1 minute
- [ ] **Rejection:** Admin rejects → Agent notified with reason

### 2. KYC Verification Flow

- [ ] **Upload Documents:** Upload ID front + selfie → Status shows "submitted"
- [ ] **File Validation:** Try to upload video → Shows error (images only)
- [ ] **File Size:** Try to upload 10MB file → Shows error (max 5MB)
- [ ] **Admin Review:** Admin sees all pending in queue
- [ ] **Approval:** Admin approves → Agent can order stock
- [ ] **Rejection:** Admin rejects with reason → Agent sees reason
- [ ] **Resubmit:** After rejection, agent can resubmit

### 3. Stock Management Flow

- [ ] **View Products:** See available products and prices
- [ ] **Place Order:** Order 10 bags → Shows ₦13,000 total
- [ ] **Admin Fulfillment:** Admin marks as fulfilled
- [ ] **Partial Payment:** Pay ₦5,000 of ₦13,000 → Shows ₦8,000 outstanding
- [ ] **Full Payment:** Pay remaining → Shows "fully paid"
- [ ] **Over-order Prevention:** Try to order 1,000 bags → Shows error (insufficient stock)

### 4. Sales Reporting Flow

- [ ] **Submit Report:** Agent submits 5 bags, ₦5,000 → Commission = ₦250
- [ ] **Math Check:** Verify 5% commission on various amounts (test: ₦1000, ₦5000, ₦10000, ₦75000)
- [ ] **Pending Status:** Commission shows as "pending"
- [ ] **Confirmation:** Admin marks paid → Status changes to "paid"
- [ ] **Multiple Reports:** Agent can submit multiple daily reports
- [ ] **History:** Agent can view all past reports with dates

### 5. Wallet & Balance Flow

- [ ] **Available Balance:** Shows correctly after report
- [ ] **Pending Balance:** Shows correctly when unconfirmed
- [ ] **Real-Time Update:** Balance updates immediately after action
- [ ] **Transaction History:** All transactions listed with dates
- [ ] **No Cross-Access:** Agent A cannot see Agent B's wallet

### 6. Bank Details Flow

- [ ] **Bank Selection:** Dropdown loads list of banks
- [ ] **Account Verification:** Enter account → Paystack verifies
- [ ] **Auto-Fill:** Account name shows correctly
- [ ] **Invalid Account:** Try invalid account number → Shows error
- [ ] **Save:** Valid details saved successfully
- [ ] **Edit:** Agent can change bank details anytime

### 7. Payout Request Flow

- [ ] **Request:** Agent requests ₦20,000 → Available balance reduced
- [ ] **Validation:** Try to request more than available → Shows error
- [ ] **Missing Bank Details:** Try request without bank info → Shows error
- [ ] **Admin Processing:** Admin approves → Payout processes
- [ ] **Real Transfer:** Money actually appears in agent's bank account
- [ ] **Email Confirmation:** Agent receives completion email
- [ ] **Status:** Shows "completed" with reference number

### 8. Dashboard & Leaderboard

- [ ] **Stats Update:** Dashboard updates immediately after report
- [ ] **Rank:** Agent sees current rank (#1, #2, #3, etc.)
- [ ] **Leaderboard:** Top 20 agents displayed correctly
- [ ] **Real-Time:** Leaderboard updates as agents submit
- [ ] **Metrics:** Bags sold, total earned, days reported are accurate
- [ ] **Admin Targets:** Admin sets target → Agent sees it and progress

### 9. Admin Dashboard

- [ ] **Applications:** See all pending, approved, rejected apps
- [ ] **KYC Queue:** See all pending KYC documents
- [ ] **Stock Requests:** See all requests with status
- [ ] **Payouts:** See all pending and completed payouts
- [ ] **Performance:** View all agents, set targets, promote to manager
- [ ] **Commission:** View and mark as paid

### 10. Security & Data Integrity

- [ ] **No Over-Payment:** Agent cannot withdraw more than balance
- [ ] **No Duplicate Payout:** Same request cannot be paid twice
- [ ] **Data Privacy:** Agent cannot access another agent's data
- [ ] **Audit Trail:** All admin actions logged (who, what, when)
- [ ] **Password Security:** Passwords hashed, cannot be reversed
- [ ] **Session Security:** Logout clears session, cannot access after logout
- [ ] **File Security:** Only image/PDF files accepted, no executables

### 11. Email Notifications

- [ ] **Application Confirmation:** Sent immediately after submit
- [ ] **Approval Email:** Sent when admin approves
- [ ] **Rejection Email:** Sent with reason when rejected
- [ ] **KYC Status:** Sent when KYC approved/rejected
- [ ] **Stock Fulfilled:** Sent when stock is ready
- [ ] **Payout Completion:** Sent when money transfers
- [ ] **Delivery Time:** All emails delivered within 1 minute

### 12. Edge Cases & Error Handling

- [ ] **Network Error:** Request fails → User sees error, can retry
- [ ] **Server Error:** System maintenance → Shows maintenance message
- [ ] **Duplicate Submit:** Agent double-clicks submit → Only submits once
- [ ] **Browser Close:** Agent closes during upload → Upload state recovered
- [ ] **Session Timeout:** Inactive for >1 hour → Logout and re-login required
- [ ] **Large Files:** Upload 100MB file → Shows error (exceeds max)

---

## Production Deployment Checklist

Before going LIVE:

- [ ] All sprints tested and working
- [ ] Bank verification with Paystack working
- [ ] Payouts via Paystack Bank Transfer working
- [ ] Email notifications working
- [ ] Database backed up
- [ ] Admin passwords reset to secure values
- [ ] SSL/TLS certificates valid
- [ ] Load testing done (100+ concurrent agents)
- [ ] Monitoring alerts set up
- [ ] Incident response plan documented
- [ ] Agent support process documented
- [ ] Commission rates finalized and in config

---

## Version History

| Version | Date       | Changes                               |
| ------- | ---------- | ------------------------------------- |
| 1.0     | 2026-08-12 | Initial documentation for live system |

---

**Document Owner:** Product Team
**Last Updated:** August 12, 2026
**Status:** ✅ PRODUCTION ACTIVE
