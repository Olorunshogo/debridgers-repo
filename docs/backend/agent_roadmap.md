# Roadmap — Agents & Commissions, plan → completion

> **📋 START HERE:**
>
> 1. Read `AGENT.md` (layman-friendly workflows + testing checklists)
> 2. Read `wallet-stock.md` (detailed endpoint reference with examples)
> 3. This roadmap (technical status + sprint backlog)
>
> Shareable status + phase plan for the agent side of Debridgers. Sources:
> [AGENT.md](./AGENT.md) · [wallet-stock.md](./wallet-stock.md) · [kyc.md](./kyc.md) · [payments.md](./payments.md) ·
> [admin-rbac.md](./admin-rbac.md) · [api-reference.md](./api-reference.md)
>
> Legend: ✅ built (backend) · 🎨 designed, needs frontend · 🔜 next · ○ later.

---

## Where we are — done (backend)

**Agent identity & onboarding**

- ✅ Agent signup (public): email, phone, location (LGA), CV upload, password
- ✅ Application workflow: pending → approved/rejected + email notifications
- ✅ KYC submission: ID type (NIN/Passport/Drivers), ID front + selfie photos, bank details (manual review)
- ✅ KYC status tracking: pending/submitted/approved/rejected + rejection reasons

**Stock & inventory (Agent → Warehouse)**

- ✅ Products page: agent sees available stock (title, unit price ₦1,300/bag, availability)
- ✅ Order/Request page: agent enters qty → system calculates total → submits order request
- ✅ Stock request workflow: request submitted → warehouse fulfills → agent has outstanding payment
- ✅ Partial payment: agent can pay in installments (e.g., pay ₦5,000 of ₦13,000 total)
- ✅ **Payment enforcement:** Agent CANNOT sell bags until 100% paid (no credit sales allowed)
- ✅ Stock history: agent views all requests + payment status + fulfillment dates

**Sales & commissions**

- ✅ Sales reports: agent submits daily reports (bags sold + amount collected + NOTES REQUIRED)
- ✅ Auto-commission calculation: 4 types (direct + buyer_referral + agent_override + state_manager_override), target-based lifecycle
- ✅ Commission history: agents view all commissions (type, amount, status, paid date) with full tracking
- ✅ Wallet balance: available (can withdraw) + pending (awaiting confirmation after delivery) + total earned

**Payouts & bank details**

- ✅ Bank details submission: agent enters bank info (name, account number)
- ✅ Bank list loading: agents pick bank from curated list
- ✅ Payout requests: agent requests amount (balance check included)
- ✅ Balance deduction: payout amount removed from available immediately (prevents double-spend)
- ✅ Admin payout processing: admin approves → money transfers (manual Paystack transfers today)

**Dashboard & performance**

- ✅ Agent dashboard: stats (bags sold, earnings, rank, days reported)
- ✅ Public leaderboard: top 20 agents by bags sold (no auth required)
- ✅ Wallet interface: balance display + transaction history

**Admin features**

- ✅ Admin applications queue: pending applications + approve/reject
- ✅ Admin KYC review: see pending documents + approve/reject with reason
- ✅ Admin stock fulfillment: view requests + mark as fulfilled
- ✅ Admin commission marking: view pending commissions → mark as paid
- ✅ Admin payout processing: view withdrawal requests + process (Paystack manual today)
- ✅ Agent performance view: all agents + stats + set sales targets
- ✅ Commission model: 4 types with target-based calculations (direct, buyer_referral, agent_override, state_manager_override)

**Notifications & emails**

- ✅ Application status: sent on approve/reject
- ✅ KYC status: sent on approve/reject
- ✅ Stock fulfilled: sent when warehouse fulfills
- ✅ Payout completed: sent when transfer done

**Docs/design ready to hand off**: full API reference; layman-friendly workflows; testing checklists.

---

## Phase 1 — Hardened payments (bank verification + real transfers) 🔜

_Goal: agents can verify their bank account (not just save it), and payouts actually hit their bank via Paystack API._

| #   | Item                                                                  | Notes                                                               |
| --- | --------------------------------------------------------------------- | ------------------------------------------------------------------- |
| 1.1 | 🔜 Paystack bank verification: `GET /bank/resolve`                    | Resolve account → auto-fill name (prevents typos & fraud)           |
| 1.2 | 🔜 Update bank-details service: use real Paystack API (not simulated) | `bank-details.service.ts` currently throws "not implemented"        |
| 1.3 | 🔜 Paystack payouts: agent withdrawals → real bank transfer           | `POST /transfer` with resolved recipient codes; verify in test bank |
| 1.4 | 🔜 Payout audit trail: log who approved, when, reference number       | Paystack reference stored in `withdrawals.payout_reference`         |
| 1.5 | 🎨 Frontend: bank details UX → verify flow (resolve → confirm → save) | Show resolved name, agent confirms match before saving              |
| 1.6 | 🎨 Frontend: payout status → real-time updates (pending → completed)  | Webhook + email confirmation when money hits bank                   |

---

## Phase 2 — KYC trust hardening (3rd-party verification + rules)

| #   | Item                                                                                                    | Notes                                                              |
| --- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| 2.1 | 🔜 KYC 3rd-party integration (BVN + face recognition)                                                   | Automate ID/face verification (currently manual admin review only) |
| 2.2 | 🔜 KYC resubmission rules: agent can only resubmit after rejection (not if rejected + suspended)        | Business rule + guard on `/agent/kyc` POST                         |
| 2.3 | 🔜 KYC status webhook: notify when approved (trigger: agent can order stock) or rejected (clear reason) | Event emission + email template                                    |
| 2.4 | 🔜 Admin KYC queue sorting: pending vs resubmitted (resubmissions prioritized)                          | `kyc_status` column differentiates flow                            |
| 2.5 | 🔜 Agent KYC progress API: GET `/kyc/status` returns completion % (identity % + face % + bank %)        | Guide agents through multi-step process                            |
| 2.6 | ○ Step-up auth: OTP re-prompt on sensitive withdrawal amounts (e.g., >₦100k)                            | Deferred; low fraud pressure today                                 |

---

## Phase 3 — Operational scaling (agencies + performance mgmt)

| #   | Item                                                                                                  | Notes                                                           |
| --- | ----------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| 3.1 | 🔜 Agency support: agents belong to agencies (optional); agencies track staff + set commission splits | Schema ready; endpoint routes missing                           |
| 3.2 | 🔜 State managers: top agents promoted to manage other agents in their zone                           | `is_state_manager` flag exists; promotion/revocation logic TODO |
| 3.3 | 🔜 Sales targets: admin sets targets per agent; agent dashboard shows progress (e.g., 30/50 bags)     | Target schema exists; target-tracking query missing             |
| 3.4 | 🔜 Admin targets API: `PUT /admin/agents/:id/target`, `GET /admin/agents/:id/target-progress`         | Not yet implemented                                             |
| 3.5 | 🔜 Commission split model: agencies vs individual agents (flat 5% vs configurable per agency)         | Config table needed (`agency_commission_rates`)                 |
| 3.6 | 🎨 Agency dashboard: staff list, performance, commissions, bulk assignment                            | Backend data exists; UI not built                               |
| 3.7 | 🎨 Agent target progress UI: visual progress bar (bags → bars) + historical tracking                  | Backend queries ready                                           |

---

## Phase 4 — Financial reconciliation & transparency

| #   | Item                                                                              | Notes                                                   |
| --- | --------------------------------------------------------------------------------- | ------------------------------------------------------- |
| 4.1 | 🔜 Admin payout reconciliation: view paid/pending/failed with Paystack reference  | Dashboard widget + CSV export for Finance               |
| 4.2 | 🔜 Agent payout history: full download (PDF/CSV) of all payouts + dates + amounts | Audit trail for agents                                  |
| 4.3 | 🔜 Commission audit: view exact math for each commission (report → %) → amount    | Transparency: agent can verify their target achievement |
| 4.4 | 🔜 Failed payout recovery: retry mechanism for transfers that fail mid-transit    | Queue + retry logic (Paystack idempotency key)          |
| 4.5 | 🎨 Admin finance dashboard: total paid/pending/failed, agent ranking by earnings  | High-level metrics for leadership                       |
| 4.6 | 🎨 Agent earnings breakdown: per-source (direct sales vs referrals vs bonuses)    | If multi-source revenue model added later               |

---

## Phase 5 — Growth & incentives (retention + scaling)

| #   | Item                                                                              | Notes                                               |
| --- | --------------------------------------------------------------------------------- | --------------------------------------------------- |
| 5.1 | ○ Referral bonuses: agents refer other agents → bonus on their referral code      | Referral code already generated; reward logic TODO  |
| 5.2 | ○ Performance bonuses: top agents (>100 bags/mo) get bonus % on commissions       | Leaderboard exists; bonus tier rules needed         |
| 5.3 | ○ Promotion tier unlocks: Tier 1 (basic) → Tier 2 (verified) → Tier 3 (agency)    | Tier model exists in schema; progression rules TODO |
| 5.4 | ○ Agent churn tracking: inactive agents (30+ days no reports), re-engagement push | Event emission + automated emails                   |
| 5.5 | ○ Dispute resolution: agent challenges a report/commission, admin review queue    | Disputes table schema ready                         |
| 5.6 | ○ Multi-currency support: agents in other countries (changes bank verification)   | NGN-only today; geo-expansion deferred              |

---

## Backend backlog — everything NOT done (sprint-ready)

Every remaining **backend** item across the agent system, sized (S ≤ 1 day · M 2–4 days ·
L a week+) with the concrete deliverable. Frontend work is excluded here on purpose.

### Sprint A — launch blockers (bank verification + payouts + KYC clarity)

| #   | Item                                                                                                                                               | Size  | Deliverable                                                                                                                                                            |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | **Bank verification via Paystack API** — today simulated, need real account resolution                                                             | **M** | Replace `bank-details.service.ts` simulated mode: call `GET /bank/resolve` on Paystack; store resolved name; agent must confirm before save                            |
| A2  | **Paystack bank transfer for payouts** — today manual Paystack transfer, need API integration                                                      | **L** | Implement `POST /transfer` call when admin processes payout; idempotency via `reference` (deterministic `PAYOUT-${withdrawalId}`); webhook for settlement notification |
| A3  | **KYC 3rd-party automation** — ID + face verification today 100% manual admin review                                                               | **L** | Integrate BVN service + face liveness (Veriff or similar); sync results back to `kyc_status`; admin sees auto-approved/flagged items                                   |
| A4  | ✅ **Commission rate API** — done. The rate is the `agent_commission_rate` system setting, admin-editable, `AGENT_COMMISSION_RATE` as env fallback | S     | `GET/PUT /admin/payments/commission-config` (zod-validated), `payments.config` table, env fallback                                                                     |
| A5  | **Payout audit trail** — no log of who approved payouts or when                                                                                    | M     | Log each payout approval: admin user ID + timestamp + IP + Paystack reference; queryable via `/admin/withdrawals?status=paid`                                          |
| A6  | **Agent payout history export** — agents can't download/audit their own payouts                                                                    | S     | `GET /agent/withdrawals/export?format=csv\|pdf` — all payouts + dates + amounts + status                                                                               |
| A7  | **KYC status endpoint for agents** — no progress tracker on multi-step process                                                                     | S     | `GET /agent/kyc/status`: returns `{ kyc_status, progress: { identity: 100, face: 100, bank: 0 }, rejection_reason }` — guides agent through next steps                 |
| A8  | **Failed payout recovery** — Paystack transfer fails mid-transit, agent balance stuck                                                              | M     | Retry mechanism: mark payout `status='failed'`, queue for retry, after 3 failures escalate to admin queue; use Paystack idempotency keys                               |
| A9  | **Ops checklist** — Paystack environment variables, KYC provider secrets, certificate validation on prod                                           | S     | Updated deployment runbook; secrets manager integration verified                                                                                                       |

### Sprint B — trust & operational clarity

| #   | Item                                                                                                            | Size | Deliverable                                                                                                          |
| --- | --------------------------------------------------------------------------------------------------------------- | ---- | -------------------------------------------------------------------------------------------------------------------- |
| B1  | **Admin commission audit API** — agents suspicious of their 5%, need transparent math                           | M    | `GET /admin/agents/:id/commissions/:id/audit`: return { report_id, amount_collected, commission_rate, calculated }   |
| B2  | **Agency support & commission splits** — agents can belong to agencies; agencies set different commission rates | L    | `agencies` table + `agents.agency_id` + `agency_commission_rates` table; update commission calc to check agency rate |
| B3  | **State manager promotion** — promote top agents to manage other agents; revocation clears their permissions    | M    | `PUT /admin/agents/:id/promote-manager`, `/admin/agents/:id/demote-manager`; permission guard on state-mgmt actions  |
| B4  | **Sales targets & progress tracking** — admin sets target (e.g., 50 bags/month); agent sees progress            | M    | `agent_sales_targets` table + GET `/admin/agents/:id/target-progress` (returns %, bags_toward_target, etc.)          |
| B5  | **KYC resubmission rules** — reject → suspended agents can't resubmit; only rejected (not suspended) can retry  | S    | Guard on `/agent/kyc` POST: check `agent_profiles.status NOT IN ('suspended', 'rejected_final')`                     |
| B6  | **Agent inactive tracking** — identify agents with 30+ days no sales report; flag for re-engagement             | S    | Query + mark `last_activity_at`; scheduled job emits `agent.inactive` event → email campaign                         |
| B7  | **Payout reconciliation report** — Finance needs: paid/pending/failed totals, top earners, settlement status    | M    | `GET /admin/payments/payout-reconciliation?date_from=&date_to=` → CSV export + dashboard widget                      |
| B8  | **Admin RBAC for payments** — only Finance can approve payouts; only Admin can set commission rates             | S    | Permission guards on `/admin/withdrawals` POST and `/admin/payments/commission-config` PUT; add to permission matrix |

### Sprint C — scaling infrastructure (async + resilience)

| #   | Item                                                                                    | Size | Deliverable                                                                                                    |
| --- | --------------------------------------------------------------------------------------- | ---- | -------------------------------------------------------------------------------------------------------------- |
| C1  | **Async payouts** — process withdrawals in background job (don't block on Paystack)     | M    | BullMQ/pg-boss worker; `withdrawals.status='processing'` while job runs; webhook updates status to 'paid'      |
| C2  | **Paystack webhook for settlement** — notified when transfer actually clears            | M    | POST `/webhooks/paystack/transfer-settlement`; idempotency on reference; update `withdrawals.status='settled'` |
| C3  | **Retry strategy for failed transfers** — exponential backoff, max 3 attempts           | M    | Job queue with retry config; failed transfers escalate to admin alert                                          |
| C4  | **Agent payout webhook** — real-time updates to agents when their payout status changes | S    | Emit event on payout completion; Websocket or polling endpoint                                                 |
| C5  | **Rate limiting on reports** — prevent spam (max 5 reports/hour per agent)              | S    | Throttle on `/agent/report` POST; return 429 if exceeded                                                       |
| C6  | **Audit log expansion** — log all agent sensitive actions (KYC submit, payout request)  | M    | `audit_logs` table capture + query API for admins                                                              |

### Sprint D — incentives & retention (future growth)

| #   | Item                                                                            | Size | Deliverable                                                           |
| --- | ------------------------------------------------------------------------------- | ---- | --------------------------------------------------------------------- |
| D1  | Referral bonus system: agents refer other agents → bonus on commission          | M    | Referral tracking + bonus payout on referred agent's first withdrawal |
| D2  | Performance bonus tiers: >100 bags/mo → +5% commission; >200 bags → +10%        | M    | Tier rules + bonus emission on report submission                      |
| D3  | Promotion tier unlocks: Tier 1→2 (document verified), Tier 2→3 (agency invited) | L    | Tier progression rules + unlock gates on capabilities                 |
| D4  | Churn re-engagement: 30+ days inactive → reminder email + incentive offer       | M    | Scheduled job + email campaign + A/B test tracking                    |
| D5  | Dispute resolution queue: agent challenges report/commission → admin review     | L    | Disputes table + queue endpoint + resolution workflow                 |
| D6  | Multi-country expansion: agents in other countries, local bank verification     | L    | Geo columns on agent, payment provider per country                    |

> **Sprint A is the recommended first sprint** — A1-A3 are the blockers for real production payouts
> and trust (today simulation + manual work). A7 is the only small addition; rest is cleanup.
> Doing A1+A2+A3 first means agents can actually get paid & trust their bank details.

---

## Suggested order of attack

1. **Phase 1 entirely (Sprint A, B parts)** — Bank verification + real payouts are the foundation;
   everything else depends on agents trusting the system.
2. **KYC 3rd-party (A3)** next — reduces manual review burden as agent volume grows.
3. **Agency support + state managers (B2, B3)** — enables scaling: agencies manage their own teams.
4. **Phase 4 reconciliation** before Phase 3 scale-ops — Finance needs visibility; prevents disputes.
5. **Phase 5 incentives** after payouts are rock-solid — retention/growth on stable foundation.

---

## Current blockers to production

- ❌ Bank verification simulated (phase 1.1)
- ❌ Payouts manual (phase 1.3)
- ❌ KYC 100% manual review (phase 2.1)
- ⚠️ Commission rate hardcoded (phase 4.1)

**Fix order:** A1 → A2 → A3 → A5 (blockers cleared, ops checklist done).
