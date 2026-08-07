# Debridgers Buyer System

## Overview

The Debridgers Buyer System provides a complete marketplace experience for customers. It includes order management, wallet/payment system, buyer leaderboard, birthday recognition, referral bonuses, and comprehensive buyer analytics.

---

## Buyer Onboarding

### Registration

**Endpoint:**

```
POST /api/v1/auth/register
Body:
{
  "first_name": "Fatima",
  "last_name": "Bello",
  "email": "fatima@example.com",
  "phone": "08098765432",
  "password": "SecurePass@123",
  "role": "buyer",
  "referred_by_agent_code": "AGENT-A3F2B1C9" // optional for referral bonus
}
```

**Response:**

```json
{
  "statusCode": 201,
  "message": "Registration successful",
  "data": {
    "user": {
      "id": 123,
      "first_name": "Fatima",
      "last_name": "Bello",
      "email": "fatima@example.com",
      "phone": "08098765432",
      "role": "buyer"
    },
    "accessToken": "eyJ0eXAiOiJKV1QiLC...",
    "refreshToken": "eyJ0eXAiOiJKV1QiLC..."
  }
}
```

### Email Verification

After registration, buyer receives verification email with OTP.

```
POST /api/v1/auth/verify-email
Body: { "otp": "123456" }
```

---

## Buyer Dashboard

**Endpoint:**

```
GET /api/v1/buyer/dashboard
Headers: Authorization: Bearer {accessToken}
         X-Request-Key: {request_key}
```

**Returns:**

```json
{
  "statusCode": 200,
  "message": "Dashboard retrieved",
  "data": {
    "user_name": "Fatima Bello",
    "greeting": "Good Morning",
    "rank": 1,
    "rank_badge": "💎 VIP Customer",
    "total_spent": "₦450,500",
    "total_orders": 24,
    "wallet_balance": "₦25,000",
    "next_delivery": {
      "time": "In transit",
      "orderId": "DBR-0042",
      "itemCount": 3
    },
    "stats": [
      {
        "label": "Total Order",
        "value": "24",
        "trend": "24 total"
      },
      {
        "label": "Total Spent",
        "value": "₦450,500",
        "trend": "All time"
      },
      {
        "label": "Active Order",
        "value": "1",
        "trend": "1 in progress"
      },
      {
        "label": "Birthday Month",
        "value": "June",
        "trend": "Special discount available"
      }
    ],
    "recent_orders": [...],
    "wallet_summary": {
      "available_balance": "₦25,000",
      "pending_balance": "₦5,000",
      "total_deposited": "₦100,000"
    }
  }
}
```

---

## Buyer Leaderboard & Recognition

### Public Leaderboard

**Endpoint:**

```
GET /api/v1/public/buyers/leaderboard
```

**Returns Top Buyers by Spending:**

```json
{
  "data": [
    {
      "rank": 1,
      "buyer_id": 123,
      "name": "Fatima Bello",
      "location": "Kaduna North",
      "total_spent": "₦450,500",
      "orders": 24,
      "avg_order": "₦18,771",
      "member_since": "2025-06-10",
      "status": "verified",
      "badge": "💎 VIP Customer",
      "loyalty_months": 12
    },
    {
      "rank": 2,
      "buyer_id": 124,
      "name": "Chioma Okonkwo",
      "location": "Kaduna South",
      "total_spent": "₦380,200",
      "orders": 18,
      "avg_order": "₦21,122",
      "member_since": "2025-07-15",
      "status": "verified",
      "badge": "⭐ Valued Customer",
      "loyalty_months": 11
    }
  ],
  "your_rank": {
    "rank": 47,
    "percentile": "Top 2%",
    "badge": "🔥 Frequent Buyer"
  }
}
```

### Buyer Recognition Badges

**Tiers & Achievements:**

| Badge                  | Criteria                          | Benefits                                 |
| ---------------------- | --------------------------------- | ---------------------------------------- |
| 💎 **VIP Customer**    | Top 5 spenders, 12+ months active | Priority support, exclusive previews     |
| ⭐ **Valued Customer** | Top 20 spenders, 6+ months active | Early access to sales, special discounts |
| 🎁 **Loyal Buyer**     | 10+ completed orders              | Birthday special, loyalty rewards        |
| 🔥 **Frequent Buyer**  | 3+ orders this month              | Flash sale notifications, bonus points   |
| 🆕 **Welcome Badge**   | First-time buyer                  | Welcome discount (₦500 wallet credit)    |

### Buyer Admin: Customer Analytics

**Buyer Admin can view detailed customer metrics:**

```
GET /api/v1/admin/buyers/leaderboard?period=monthly&zone=Kaduna&limit=50
```

Returns:

- Top buyers by spending
- Customer lifetime value (LTV) by zone
- Churn risk indicators (inactive > 30 days)
- Re-engagement opportunities
- Seasonal spending patterns

---

## Birthday Wishes Campaign

### Automated Birthday Recognition

**System automatically sends personalized birthday wishes on buyer's birthday:**

**Automated Flow:**

1. **6 AM Daily Check** - Cron job identifies buyers with birthday today
2. **Personalized Message** - SMS/Email sent with buyer's name
3. **Birthday Discount** - Auto-generate 15-20% discount code valid 7 days
4. **Optional Gift** - Send ₦500 wallet credit (configurable)
5. **Track Engagement** - Log opens, clicks, code redemptions

**Birthday Message Examples:**

**SMS:**

```
🎂 Happy Birthday, Fatima! 🎉

We're celebrating YOU today with a special gift:
✨ BIRTHDAY20 - 20% off your next order

Use code at checkout. Valid for 7 days.

Thank you for being part of our community!
- Debridgers Team
```

**Email:**

```
Subject: 🎂 Happy Birthday, Fatima! Special Gift Inside

Dear Fatima,

Today is YOUR day! We want to celebrate with you.

Here's your exclusive birthday gift:
✨ 20% OFF your next order
Code: BIRTHDAY20
Valid for 7 days

Plus: ₦500 added to your wallet! 🎁

Thank you for being a loyal customer.
Shop now → [checkout link]

- Debridgers Team
```

### Birthday Discount Configuration

**Financial Admin can configure:**

```
PATCH /api/v1/admin/settings/birthday-campaign
Body:
{
  "enabled": true,
  "discount_percent": 20,
  "wallet_credit_kobo": 50000,  // ₦500
  "valid_days": 7,
  "send_time": "06:00",  // 6 AM local time
  "channels": ["sms", "email"],
  "auto_apply_code": false  // buyer manually enters code
}
```

### Birthday Campaign Endpoints

**Get upcoming birthdays (Buyer Admin):**

```
GET /api/v1/admin/buyers/birthdays?month=June&limit=50
```

Returns:

```json
{
  "data": [
    {
      "buyer_id": 123,
      "name": "Fatima Bello",
      "email": "fatima@example.com",
      "phone": "08098765432",
      "birthday": "1990-06-10",
      "age": 36,
      "total_spent": "₦450,500",
      "orders_this_year": 8,
      "status": "active",
      "message_sent": true,
      "sent_at": "2026-06-10T06:00:00Z",
      "code_used": false
    }
  ],
  "total_birthdays_today": 5
}
```

**Send manual birthday message:**

```
POST /api/v1/admin/buyers/:id/send-birthday-message
Headers: X-Buyer-Admin-Key
Body:
{
  "discount_code": "BIRTHDAY20",
  "discount_percent": 20,
  "wallet_credit_kobo": 50000,
  "message_override": "Optional custom message"
}
```

### Buyer: Birthday Preferences

**Buyers can manage birthday settings:**

```
GET /api/v1/buyer/preferences
Returns:
{
  "receive_birthday_wishes": true,
  "birthday_date": "1990-06-10",
  "age": 36,
  "preferred_channel": "sms",  // sms, email, both
  "birthday_code": "BIRTHDAY20",
  "code_used": false,
  "wallet_credit_received": true
}
```

**Update preferences:**

```
PATCH /api/v1/buyer/preferences
Body:
{
  "receive_birthday_wishes": false  // opt out
}
```

### Birthday Campaign Analytics

**Track campaign performance (Financial Admin):**

```
GET /api/v1/admin/reports/birthday-campaigns?period=monthly
```

Returns:

```json
{
  "total_buyers_with_birthdays": 342,
  "messages_sent": 342,
  "delivery_rate": "98.5%",
  "discount_codes_generated": 342,
  "code_redemptions": 187,
  "redemption_rate": "54.7%",
  "revenue_generated": "₦2,847,500",
  "avg_order_value_with_code": "₦15,224",
  "wallet_credits_issued": 342,
  "wallet_credits_spent": 289,
  "spend_rate": "84.5%"
}
```

### Birthday Impact Report

**Revenue attribution:**

```
GET /api/v1/admin/reports/birthday-impact?period=quarterly
```

Shows:

- Direct revenue from birthday discount usage
- Orders triggered by birthday message
- Wallet credit redemption patterns
- Customer retention impact (repeat orders within 30 days)
- ROI on birthday campaign

---

## Buyer Orders

**Endpoint:**

```
GET /api/v1/buyer/orders?status=delivered&page=1&limit=10
```

Returns:

- Order history with status tracking
- Delivery details & tracking
- Refund requests option
- Re-order quick actions

---

## Buyer Wallet & Payments

**Wallet Balance:**

```
GET /api/v1/buyer/wallet
```

Returns:

- Available balance
- Pending balance
- Total deposited (all-time)
- Birthday credits (if any)

**Add Funds:**

```
POST /api/v1/buyer/wallet/deposit
Body: { "amount_kobo": 50000 }  // ₦500
```

**Birthday Credit Automatic Addition:**

- When birthday message sent, wallet credit auto-added (if enabled)
- No action needed from buyer
- Shows in wallet as "Birthday Gift"

---

## Buyer Referral System

### Referral on Signup

**When registering with agent referral code:**

```
POST /api/v1/auth/register
Body:
{
  ...
  "referred_by_agent_code": "AGENT-A3F2B1C9"
}
```

**Benefits:**

- Buyer: ₦500 wallet credit (configurable)
- Agent: Referral bonus (configurable)
- Both notified of successful referral

### Referral Tracking

```
GET /api/v1/buyer/referrals
```

Shows:

- Who referred you
- Referral credits received
- Refer-a-friend link (share with others)

---

## Buyer Notifications

**Endpoints:**

```
GET /api/v1/buyer/notifications
```

Notifications for:

- Order status updates
- Payment confirmations
- Wallet transactions
- Birthday greetings
- Promotional offers
- Referral bonuses received

---

## Buyer Support & Help

**Help Center:**

```
GET /api/v1/public/help-center
```

FAQs about:

- How to order
- Payment methods
- Wallet deposits
- Birthday rewards
- Referral bonuses
- Refund policy

**Contact Support:**

- WhatsApp: Direct link
- Email: support@debridgers.com
- In-app chat (for premium members)

---

## Buyer Preferences & Privacy

**Data Preferences:**

```
GET /api/v1/buyer/privacy
```

Control:

- Marketing emails (birthday campaigns, promos, newsletters)
- SMS notifications
- Data retention
- Account deletion

---

## Key Buyer Metrics (For Analytics)

- Total active buyers
- New buyers (weekly/monthly)
- Average order value
- Total revenue
- Birthday campaign ROI
- Referral program effectiveness
- Churn rate
- Customer lifetime value (LTV)
- Repeat purchase rate

---

## Best Practices for Buyers

### Maximize Birthday Rewards

1. Ensure birthday date is updated in profile
2. Enable birthday notifications
3. Check inbox on birthday
4. Use birthday code within 7 days
5. Share experience on referral link for bonus credits

### Wallet Management

1. Maintain minimum ₦200 balance for quick checkout
2. Take advantage of birthday credits
3. Use referral bonuses for free deposits
4. Track wallet transactions for budgeting

### Loyalty Benefits

- Reach VIP status (₦400K+ spent) for priority support
- Each month active maintains loyalty streak
- Birthday month gets special recognition
- Top spenders featured on leaderboard

---

## Conclusion

The Debridgers Buyer System creates a complete marketplace experience with:

- ✅ Simple registration & onboarding
- ✅ Secure wallet & payment system
- ✅ Birthday recognition & rewards
- ✅ Referral bonus program
- ✅ Leaderboard & achievement badges
- ✅ Comprehensive order management
- ✅ Personal notifications
- ✅ Full visibility & control over preferences

**Buyer-centric features drive engagement, loyalty, and repeat purchases! 🎁**
