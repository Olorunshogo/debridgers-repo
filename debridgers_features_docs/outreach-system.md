# Debridgers Outreach System

## Overview

The Debridgers Outreach System is designed to help the team track, manage, and analyze customer engagement activities across different regions. It combines field outreach recording with automated batch reminders, analytics, and coverage insights to maximize customer acquisition and retention.

---

## Core Features

### 1. **Outreach Record Management**

- Manual recording of customer visits & interactions
- Capture contact details, shop info, product interest
- Track which team member conducted the visit
- Historical record of all outreach activities

### 2. **Batch Friendly Reminders** (NEW)

- Automatic batch SMS/email reminders to potential customers
- Friendly tone: "Hi [name], we have your number at Debridgers..."
- Scheduled delivery (daily/weekly batches)
- Track reminder delivery status

### 3. **Coverage Analytics**

- State-level coverage tracking
- Zone-level breakdown
- Area performance metrics
- Revisit tracking

### 4. **Team Reminders**

- Automated reminders to Debridgers team for next outreach
- Schedule outreach campaigns
- Assign to team members
- Track completion

---

## System Architecture

### Database Schema

```
┌──────────────────────────────────────────────┐
│        Outreach Records Table                │
│  ├─ id (PK)                                  │
│  ├─ shop_name (business name)                │
│  ├─ owner_name (contact person)              │
│  ├─ phone (potential customer)               │
│  ├─ lga (Local Govt Area - state)            │
│  ├─ area (zone/neighborhood)                 │
│  ├─ address (physical location)              │
│  ├─ product_interest (what they want)        │
│  ├─ quantity (estimated interest)            │
│  ├─ notes (how heard, special notes)         │
│  ├─ collected_by (agent/admin:id)            │
│  ├─ visit_date (when visited)                │
│  └─ timestamps (created_at, updated_at)      │
└──────────────────────────────────────────────┘
        ↓
┌──────────────────────────────────────────────┐
│    Outreach Reminders Table (NEW)            │
│  ├─ id (PK)                                  │
│  ├─ outreach_record_id (FK)                  │
│  ├─ reminder_type (sms/email)                │
│  ├─ message (friendly reminder text)         │
│  ├─ scheduled_at (when to send)              │
│  ├─ sent_at (actually sent)                  │
│  ├─ status (pending/sent/failed)             │
│  ├─ provider (SMS gateway, Mailtrap)         │
│  ├─ provider_ref (tracking reference)        │
│  ├─ delivery_status (delivered/bounced)      │
│  └─ timestamps                               │
└──────────────────────────────────────────────┘
        ↓
┌──────────────────────────────────────────────┐
│   Outreach Analytics Table (NEW)             │
│  ├─ id (PK)                                  │
│  ├─ state (LGA name)                         │
│  ├─ zone (area name)                         │
│  ├─ total_visits                             │
│  ├─ revisit_count                            │
│  ├─ total_reminders_sent                     │
│  ├─ reminder_success_rate                    │
│  ├─ total_sales (from this area)             │
│  ├─ last_visited_date                        │
│  ├─ needs_attention (boolean)                │
│  ├─ period (daily/weekly/monthly)            │
│  └─ timestamps                               │
└──────────────────────────────────────────────┘
        ↓
┌──────────────────────────────────────────────┐
│   Team Outreach Reminders Table (NEW)        │
│  ├─ id (PK)                                  │
│  ├─ team_member_id (FK to users)             │
│  ├─ assigned_state (LGA to visit)            │
│  ├─ assigned_zone (area to visit)            │
│  ├─ target_visits (goal: how many)           │
│  ├─ scheduled_date (when to do outreach)     │
│  ├─ status (pending/in_progress/completed)   │
│  ├─ completion_date (actually done)          │
│  ├─ visits_completed (actual count)          │
│  ├─ notes (feedback from visit)              │
│  └─ timestamps                               │
└──────────────────────────────────────────────┘
```

---

## API Endpoints

### Recording Outreach

**Create Outreach Record**

```
POST /api/v1/admin/outreach
Headers: X-Admin-Key-1, X-Admin-Key-2 (or JWT for agents)
Body:
{
  "full_name": "Musa Ibrahim",
  "phone": "08012345678",
  "shop_name": "Ibrahim Grains Store",
  "lga": "Kaduna North",
  "area": "Barnawa Market",
  "product_interest": "Maize bags",
  "estimated_quantity": 10,
  "how_heard": "Word of mouth",
  "notes": "Very interested, needs credit terms",
  "visit_date": "2026-06-10"
}
```

Response:

```json
{
  "statusCode": 201,
  "message": "Outreach record saved",
  "data": {
    "id": 45,
    "shop_name": "Ibrahim Grains Store",
    "owner_name": "Musa Ibrahim",
    "phone": "08012345678",
    "lga": "Kaduna North",
    "area": "Barnawa Market",
    "product_interest": "Maize bags",
    "quantity": 10,
    "collected_by": "admin:1",
    "visit_date": "2026-06-10",
    "created_at": "2026-06-10T14:30:00Z"
  }
}
```

**List All Outreach Records**

```
GET /api/v1/admin/outreach
```

Returns all records sorted by newest first

**Delete Outreach Record**

```
DELETE /api/v1/admin/outreach/:id
```

---

### Batch Friendly Reminders (NEW)

**Send Batch Reminders**

```
POST /api/v1/admin/outreach/reminders/batch
Headers: X-Admin-Key-1, X-Admin-Key-2
Body:
{
  "outreach_ids": [45, 46, 47, 48],
  "reminder_type": "sms",           // or "email"
  "message_template": "friendly",   // friendly, urgent, follow_up
  "scheduled_at": "2026-06-11T09:00:00Z",
  "batch_name": "June Batch 1"
}
```

**Get Reminder Template**

```
GET /api/v1/admin/outreach/reminders/templates/:type
```

Returns message templates:

- `friendly`: "Hi [name], we have your number at Debridgers..."
- `urgent`: "Last chance! Stock available for..."
- `follow_up`: "Following up on your interest..."

**Track Reminder Status**

```
GET /api/v1/admin/outreach/reminders/batch/:batchId/status
```

Returns:

```json
{
  "batch_id": 12,
  "batch_name": "June Batch 1",
  "total_reminders": 15,
  "sent": 14,
  "failed": 1,
  "delivered": 12,
  "bounced": 2,
  "success_rate": "93%",
  "scheduled_at": "2026-06-11T09:00:00Z",
  "completed_at": "2026-06-11T09:05:30Z"
}
```

---

### Coverage Analytics (NEW)

**Get State Coverage**

```
GET /api/v1/admin/outreach/analytics/states
```

Returns:

```json
{
  "data": [
    {
      "state": "Kaduna",
      "total_visits": 47,
      "unique_shops": 42,
      "revisits": 5,
      "reminders_sent": 42,
      "reminder_success_rate": 0.95,
      "total_sales": 2150000,
      "last_visited": "2026-06-10T14:30:00Z",
      "needs_attention": false,
      "trend": "📈 increasing"
    }
  ]
}
```

**Get Zone Coverage** (within a state)

```
GET /api/v1/admin/outreach/analytics/zones?state=Kaduna
```

Returns per-zone breakdown:

```json
{
  "state": "Kaduna",
  "zones": [
    {
      "zone": "Barnawa Market",
      "visits": 12,
      "revisits": 2,
      "reminders_sent": 11,
      "delivery_rate": 0.91,
      "sales": 580000,
      "last_visited": "2026-06-10",
      "coverage": "Good",
      "priority": "maintain"
    },
    {
      "zone": "Narayi",
      "visits": 4,
      "revisits": 0,
      "reminders_sent": 4,
      "delivery_rate": 1.0,
      "sales": 180000,
      "last_visited": "2026-06-05",
      "coverage": "Low",
      "priority": "HIGH - needs attention"
    }
  ]
}
```

**Coverage Heatmap Report**

```
GET /api/v1/admin/outreach/analytics/heatmap?period=monthly
```

Returns areas ranked by:

- Coverage most (visited most)
- Revisited most (loyal customers)
- Needs attention (low visits, high potential)
- Best sales (highest revenue)

```json
{
  "period": "June 2026",
  "coverage_most": [{ "zone": "Barnawa Market", "visits": 12, "rank": 1 }],
  "revisited_most": [{ "zone": "Barnawa Market", "revisits": 2, "rank": 1 }],
  "needs_attention": [
    { "zone": "Narayi", "visits": 4, "risk": "HIGH", "days_since_visit": 5 }
  ],
  "best_sales": [{ "zone": "Barnawa Market", "sales": 580000, "rank": 1 }]
}
```

---

### Team Outreach Reminders (NEW)

**Assign Outreach Campaign to Team**

```
POST /api/v1/admin/outreach/team-reminders
Headers: X-Admin-Key-1, X-Admin-Key-2
Body:
{
  "state": "Kaduna",
  "zones": ["Barnawa Market", "Narayi"],
  "assigned_team": [2, 3, 5],      // agent/team member IDs
  "target_visits": 15,              // goal per zone
  "scheduled_date": "2026-06-12",
  "priority": "HIGH",
  "notes": "Focus on new customers in Narayi"
}
```

**Get Team Outreach Schedule**

```
GET /api/v1/admin/outreach/team-reminders
```

Returns upcoming assignments:

```json
{
  "data": [
    {
      "id": 8,
      "team_member": "Amina Yusuf",
      "state": "Kaduna",
      "zones": ["Barnawa Market", "Narayi"],
      "target_visits": 15,
      "scheduled_date": "2026-06-12",
      "status": "pending",
      "visits_completed": 0,
      "priority": "HIGH",
      "reminder_sent_at": "2026-06-11T18:00:00Z",
      "created_at": "2026-06-10T10:00:00Z"
    }
  ]
}
```

**Mark Outreach Campaign Completed**

```
PATCH /api/v1/admin/outreach/team-reminders/:reminderId
Body:
{
  "status": "completed",
  "visits_completed": 16,
  "notes": "Exceeded target, very positive response in Narayi"
}
```

---

## Workflow: Complete Outreach Cycle

### Phase 1: Pre-Outreach Planning

```
1. Admin reviews coverage analytics
   - Identify low-coverage zones (needs attention)
   - Identify high-performing zones (maintain)
   - Set targets

2. Admin creates team reminder
   POST /admin/outreach/team-reminders
   - Assign agents to zones
   - Set visit targets
   - Send notification to team
```

### Phase 2: Field Outreach

```
1. Agent/team member goes to assigned zone
2. Visits shops, collects info
3. Records each visit
   POST /admin/outreach
   - Customer name, phone, interest
   - Visit date
   - Notes on interaction

4. Agent tracks progress
   GET /admin/outreach/team-reminders/:reminderId
   - How many visits done
   - Any customer feedback
```

### Phase 3: Follow-up Reminders

```
1. Admin waits 2-3 days after outreach
2. Sends batch friendly reminders
   POST /admin/outreach/reminders/batch
   - Select outreach records from recent visits
   - Use friendly message template
   - Schedule for business hours
   - "Hi [name], we have your number at Debridgers..."

3. Tracks reminder delivery
   GET /admin/outreach/reminders/batch/:batchId/status
   - Delivery rate
   - Failed reminders (retry)
```

### Phase 4: Analysis & Next Steps

```
1. Admin reviews coverage analytics
   GET /admin/outreach/analytics/heatmap
   - Which zones got covered most
   - Which need more attention
   - Which generate most sales

2. Identify priority areas
   - "Needs attention" zones = less than 2 visits/month
   - "Best sales" zones = repeat visits
   - Schedule next outreach

3. Repeat cycle
```

---

## Message Templates

### Friendly Reminder

```
"Hi [shop_name/owner_name], 👋

We have your number at Debridgers!

We're building the best supply network for [product_interest].
Your shop in [area] is perfect for what we're doing.

Ready to chat? Reply with 'YES' or call us at [number].

- Debridgers Team"
```

### Urgent Follow-up

```
"LAST CHANCE! 🚨

[shop_name] - Limited stock alert!

[product_interest] bags available right now at [quantity] units.
We know you need these.

Confirm order today: Call [number] or reply 'ORDER'

- Debridgers"
```

### Follow-up Reminder

```
"Hi [owner_name],

Just following up on our visit to [shop_name]!

You mentioned interest in [product_interest] (qty: [quantity]).
We have stock ready for you.

Schedule delivery: [link_or_number]

Thanks,
Debridgers"
```

---

## Analytics Metrics

### Coverage Metrics

- **Total Visits**: Sum of all visits in an area
- **Unique Shops**: Count of distinct shops visited
- **Revisit Rate**: % of shops visited more than once
- **Coverage %**: (Visited shops / Total target shops) × 100

### Reminder Metrics

- **Delivery Rate**: Sent / Successfully delivered
- **Bounce Rate**: Failed deliveries / Total sent
- **Response Rate**: Replies / Delivered reminders
- **Conversion Rate**: Sales / Delivered reminders

### Sales Metrics

- **Revenue by Zone**: Total orders from each area
- **Revenue by State**: Total orders from each state
- **RPV** (Revenue Per Visit): Total sales / Total visits
- **High-value Zones**: Top 5 zones by revenue

### Team Performance

- **Visits Completed**: Actual vs Target
- **Average Visits/Day**: Visits per agent per day
- **Coverage Speed**: Days to reach all zones
- **Quality Score**: Repeat visits / Total visits

---

## Admin Dashboard

The analytics dashboard shows:

```
┌─────────────────────────────────────────────────────────┐
│            OUTREACH ANALYTICS DASHBOARD                  │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  📊 This Month's Performance                            │
│  ├─ Total Visits: 142                                   │
│  ├─ Unique Shops: 127                                   │
│  ├─ Reminders Sent: 118                                 │
│  ├─ Delivery Rate: 94%                                  │
│  └─ Total Sales: ₦8.5M                                  │
│                                                          │
│  🗺️  State Coverage                                     │
│  ├─ Kaduna: 87 visits ✅ (Good)                        │
│  ├─ Lagos: 32 visits 🟡 (Fair)                         │
│  ├─ Kano: 23 visits 🔴 (Low)                           │
│  └─ [View Details]                                      │
│                                                          │
│  🔥 Top Performing Zones                                │
│  ├─ 1️⃣  Barnawa Market (580K sales)                    │
│  ├─ 2️⃣  Naira Street (450K sales)                      │
│  └─ 3️⃣  Central Market (380K sales)                    │
│                                                          │
│  ⚠️  Needs Attention                                    │
│  ├─ Narayi: Last visited 5 days ago                     │
│  ├─ Sabon Tasha: Only 2 visits this month               │
│  └─ [Assign Outreach Campaign]                          │
│                                                          │
│  📅 Upcoming Team Reminders                             │
│  ├─ Amina Yusuf - Barnawa (12 visits) - Due June 12    │
│  ├─ Ibrahim Hassan - Narayi (15 visits) - Due June 12  │
│  └─ [View All]                                          │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## Best Practices

### For Field Outreach

1. **Record Immediately**: Capture info right after visit, not later
2. **Be Detailed**: Include shop type, owner mood, specific interests
3. **Follow-up Notes**: What might make them convert?
4. **Visit Frequency**: Target areas 2-3 times per month
5. **Know Your Zone**: Study area demographics before visiting

### For Reminders

1. **Timing**: Send 2-3 days after initial visit (give them time to think)
2. **Business Hours**: 9-11 AM or 3-5 PM for SMS/calls
3. **Personal Touch**: Use their name, mention their shop, reference their interest
4. **Frequency**: 2-3 reminders per customer over 2 weeks
5. **Monitor Response**: Track which templates get best response

### For Analytics

1. **Weekly Reviews**: Check coverage trends every Monday
2. **Monthly Planning**: Based on insights, plan next month's zones
3. **Focus on Outliers**: Why do some zones convert better?
4. **Celebrate Wins**: Share top performers, replicate their techniques
5. **Learn from Gaps**: Why are some areas underperforming?

---

## Integration Points

### SMS Reminders

- Provider: Twilio / AWS SNS
- Template customization
- Delivery tracking
- Auto-retry on failure

### Email Reminders

- Provider: Mailtrap (existing)
- HTML templates
- Tracking opens/clicks
- Batch scheduling

### CRM Integration (Future)

- Sync outreach data to customer CRM
- Link visits to sales
- Customer journey tracking
- Predictive analytics

### Reporting Integration (Future)

- Export to CSV/PDF
- Google Sheets sync
- Real-time Looker Studio dashboards
- Automated team reports

---

## Deployment Timeline

| Phase   | Task                              | Timeline |
| ------- | --------------------------------- | -------- |
| Phase 1 | Outreach record system (existing) | ✅ Live  |
| Phase 2 | Batch reminder system             | Week 1-2 |
| Phase 3 | Analytics dashboard               | Week 2-3 |
| Phase 4 | Team reminder assignment          | Week 3   |
| Phase 5 | Testing & refinement              | Week 4   |
| Phase 6 | Training & launch                 | Week 5   |

---

## Error Handling

### Reminder Failures

- **Phone number invalid**: Mark for manual follow-up
- **SMS gateway down**: Queue for retry next hour
- **Email bounced**: Remove from future campaigns
- **Rate limiting**: Spread batch over time slots

### Analytics Issues

- **Missing location data**: Show "Unknown Zone" summary
- **Incomplete visits**: Include partial data with flag
- **Future dates**: Filter out, only use completed visits

---

## Security & Privacy

### Data Protection

- Phone numbers encrypted in database
- Reminders use secure SMS gateway
- Email delivery through verified provider
- Audit log all outreach activities

### Consent

- Customer must have given phone number
- Friendly reminder tone (not aggressive)
- Easy opt-out mechanism
- Comply with telemarketing regulations

---

## Future Enhancements

1. **AI-powered Insights**
   - Predict which customers likely to buy
   - Recommend best visit times per area
   - Suggest product recommendations per zone

2. **Mobile App**
   - Offline record capture
   - GPS location tagging
   - Photo attachments
   - Real-time sync

3. **Customer Portal**
   - Self-serve signup after reminder
   - Track order status
   - Reorder history
   - Referral bonuses

4. **Advanced Analytics**
   - Cohort analysis
   - Customer lifetime value
   - Churn prediction
   - Territory expansion recommendations

---

## Conclusion

The Debridgers Outreach System combines manual field engagement with smart automation and analytics. By tracking every customer interaction, sending personalized reminders, and analyzing coverage patterns, we can grow our customer base efficiently and intelligently.

**Key Success Factors:**

- ✅ Regular field outreach (consistent)
- ✅ Timely friendly reminders (warm)
- ✅ Data-driven decisions (smart)
- ✅ Team coordination (aligned)
- ✅ Analytics review (informed)

**Ready to outreach at scale! 🚀**
