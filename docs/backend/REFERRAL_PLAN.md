# Referral System: Design and Implementation Plan

Status: **the mechanism is sound, the numbers are stale.** Nothing here is built.

> **Correction, 2026-08-29.** This plan was written against a ₦1,400 unit price
> with a ₦100 spread. That product does not exist: the catalogue sells packages
> at ₦12,000 to ₦55,000, median ₦35,000. Every worked example and every reward
> size below was computed from the wrong base and **must be re-derived before
> anything is built**.
>
> What survives intact is the central idea in section 2: put a real cost on the
> product, stamp it onto the order, and compute contribution from it. That is
> still exactly right, and it is now the recommended home for the commission
> bands currently held as a name map in `agent-commission.ts`.
>
> What does not survive: the ₦1,300 default cost, the ₦100 spread, the ₦500
> welcome discount as a share of contribution, and the "35 packs to ₦50,000"
> arithmetic. A ₦50,000 order is one or two packages, not thirty-five.
>
> Current economics: `docs/business/BusinessModel.md`.

Scope: agents referring buyers, agents referring agents, buyers referring buyers, buyers referring agents. Rewards, attribution, correctness fixes, and the shared hook layer.

Every rate and amount below is an admin setting, not a constant. The defaults are the agreed values.

---

## 1. Decisions

| Question                     | Decision                                                                      |
| ---------------------------- | ----------------------------------------------------------------------------- |
| Buyer reward form            | Store credit, non-withdrawable, spendable at checkout                         |
| Buyer cashback size          | 5% of contribution on a referred buyer's delivered orders                     |
| Agent reward, referred buyer | ₦20 per delivered order, for 12 months from attribution                       |
| Welcome discount             | ₦500, once per buyer, on a first order of ₦50,000 or more                     |
| Buyer refers an agent        | ₦2,000 store credit on that agent's first actual remittance                   |
| Plus ongoing share           | 2% of that agent's confirmed direct commissions, 3 months, capped             |
| Store credit expiry          | 6 months                                                                      |
| Attribution                  | First touch, enforced by a unique constraint                                  |
| Self-referral                | Blocked                                                                       |
| Retroactive claim            | 3 days after signup, never beyond                                             |
| Agent code activation        | Only after the agent is approved                                              |
| Codes belong to              | The user, not the agent profile                                               |
| Reward timing                | Pending until delivery, confirmed on delivery, void on refund or cancellation |
| Commission units             | Integer kobo throughout                                                       |

---

## 2. Making contribution computable

You asked how to make the uncomputable computable. This is the answer, and it is a prerequisite for the 5% cashback and the 2% share.

### 2.1 The problem

Products carry only `price_kobo`, the sell price. The agent remit price is derived in `agent-commission.ts` and the landed cost is not recorded anywhere at all, so an order has no idea what its goods cost. A reward sized as a share of profit cannot be computed from a number the system does not hold.

### 2.2 The fix

**Add a cost to the product, and stamp it onto the order.**

```
product.cost_kobo        integer not null                  -- landed cost, per product
order_items.cost_kobo    integer not null                  -- stamped at order time
orders.contribution_kobo integer not null default 0        -- stamped at order time
```

Stamping matters. `order_items` already stamps `unit_price_kobo` so a later price change cannot rewrite the history of an old order. Cost gets the identical treatment, so margin reporting stays truthful over time.

### 2.3 The formula

```
contribution_kobo = Σ (unit_price_kobo - cost_kobo) × qty  +  handling_fee
```

Delivery fee is excluded, on the assumption that the zone fee covers the delivery cost. `TODO:` that assumption has never been checked against what a drop actually costs. If delivery runs at a loss, contribution is overstated and every percentage reward is slightly too generous.

Contribution is **clamped at zero** for reward purposes. A promotional product sold below cost should never produce a negative reward, and a negative multiplied by a rate is the kind of thing that quietly credits somebody.

### 2.4 Backfill

- Existing products: no safe default exists. Backfill from the supplier register once real landed costs are recorded, and leave the column not-null so a product cannot be sold before its cost is known
- Existing orders: `contribution_kobo` stays 0 and they are excluded from reward calculation. They predate the programme, and inventing a historical cost to make a report look complete would be worse than a zero
- Admin needs a cost field on the product form. `TODO:` who maintains cost per product, and how often does it change?

### 2.5 The side benefit

This closes the number one open question in the company profile. Once every order carries a contribution figure, gross margin per order, contribution margin, and whether small orders lose money all become queries rather than guesses.

---

## 3. The economics

### 3.1 What an order earns

**Stale. Re-derive before building.** Kept only to show the shape of the
calculation; every value is wrong.

| Line                   | Value as written     | Actual                                                                                |
| ---------------------- | -------------------- | ------------------------------------------------------------------------------------- |
| Buyer pays per pack    | ₦1,400               | ₦12,000 to ₦55,000, median ₦35,000                                                    |
| Agent remits per pack  | ₦1,300               | Price less banded commission, e.g. ₦41,000 on rice                                    |
| Spread per pack        | ₦100                 | ₦2,500 to ₦3,300 at a 6% procurement spread                                           |
| Handling fee per order | ₦100                 | 3% of subtotal, floor ₦500, cap ₦5,000 (corrected 2026-08-29, was written here as 2%) |
| Delivery fee           | Assumed cost-neutral | Zone base at measured trip cost, tapered, capped                                      |

### 3.2 The programme against a qualifying order

**Stale.** A ₦50,000 subtotal is one or two packages, not 35. The reward shares in the table below were computed against a ₦3,600 contribution that does not correspond to any real order, and every percentage in it is therefore meaningless until recomputed.

| Reward                             | Cost | Share of contribution |
| ---------------------------------- | ---- | --------------------- |
| Welcome discount, once             | ₦500 | 13.9%, one time only  |
| Agent, per delivered order         | ₦20  | 0.6%                  |
| Buyer cashback, 5% of contribution | ₦180 | 5%                    |

Worst case, a buyer with both an agent referrer and a buyer referrer, on their first qualifying order: ₦700 against ₦3,600, **19.4%**, and ₦500 of that never recurs. Steady state is ₦200 against ₦3,600, **5.6%**.

Raising the discount threshold from ₦7,000 to ₦50,000 is the right call. At ₦7,000 the discount was 83% of the margin it spent. At ₦50,000 it is 13.9%.

`TODO:` ₦50,000 is a large first order for a household buyer. It may fit a shop or a bulk buyer and exclude everyone else, which would make the discount effectively dead for retail. Worth watching once orders flow, and easy to lower since it is a setting.

### 3.3 The recruitment reward

A buyer who recruits an agent earns:

- **₦2,000 store credit** when that agent makes their **first actual remittance**, not on approval. Approval is cheap to obtain and proves nothing. A remittance proves the agent is real and trading
- **2% of that agent's confirmed direct commissions, for 3 months**, capped

The cap keeps this bounded. It is set at **₦2,000** per recruited agent.

Why that number. **Stale derivation, corrected 2026-08-29.** This was computed
assuming a 5% commission on a ₦1,400 product. Agent commission is actually a
flat naira amount per package, banded by product type (beans ₦1,200, rice
₦1,000, oil ₦700, else ₦400), so this whole worked example needs
re-deriving from the real bands. Not re-derived here since the correct inputs
(product mix an average agent sells) are unmeasured.

So ₦2,000 binds only on an exceptional recruit and leaves a normal one well clear. It also gives a rule that explains itself: **the most a buyer can earn from one recruitment is ₦4,000**, the ₦2,000 bounty plus ₦2,000 of share. An earlier draft suggested ₦10,000, which would have required the recruit to sell ₦10 million in three months. That is not a cap, it is decoration.

Both rewards are store credit, not cash, consistent with everything else a buyer earns.

---

## 4. Architecture

### 4.1 Codes belong to users

The central change, and what makes a future role change safe.

```
referral_codes
  id
  user_id          -> users.id
  kind             -> 'buyer_invite' | 'agent_invite'
  code             -> unique
  is_active        -> boolean
  created_at
  unique (user_id, kind)
```

Consequences:

- **Buyers get codes** from the same mechanism, with no special case
- **A role change never orphans a referral history**, because the code was never attached to the agent profile. This is the dual-role groundwork without doing dual-role now
- The two codes get **independent random suffixes**, so publishing a buyer code no longer hands out the agent recruitment code

Dual role is explicitly out of scope. `users.role` stays single-valued. The point is that when you come back to it, referral needs no rework.

### 4.2 Attribution

```
referrals
  id
  referrer_user_id -> users.id
  referred_user_id -> users.id, UNIQUE
  referred_role    -> role at signup
  code_id          -> referral_codes.id
  status           -> 'pending' | 'active' | 'expired' | 'void'
  attributed_at
  activated_at
  expires_at
```

The **unique constraint on `referred_user_id` is the first-touch rule**, enforced by the database rather than by remembering to check it. A second code can never overwrite the first.

Guards applied at attribution:

- **Self-referral:** `referrer_user_id != referred_user_id`
- **Cycles:** walk the chain and refuse if the referrer sits downstream of the referred user
- **Approval gate:** an `agent_invite` code resolves only when its owner's agent profile is `approved`
- **Unknown code is an error, never a silent fallback.** See 5.2

`expires_at` carries the 12-month window for buyer referrals and the 3-month window for the recruitment share, so a reward engine that respects it cannot pay forever by accident.

### 4.3 The 3-day claim

`POST /referral/claim` accepts a code when **all** of these hold:

- The caller registered no more than 3 days ago
- No referral row exists for them
- Every guard in 4.2 passes

Beyond 3 days it is refused, with no admin override. That was your call and it is the right one: a retroactive claim window that stays open is an invitation to backfill attributions after the fact.

### 4.4 Rewards

```
referral_rewards
  id
  referral_id
  beneficiary_user_id
  order_id            -> nullable
  type                -> 'agent_buyer_referral' | 'buyer_cashback'
                       | 'welcome_discount' | 'agent_recruit_bounty'
                       | 'agent_recruit_share'
  amount_kobo         -> integer
  status              -> 'pending' | 'confirmed' | 'paid' | 'void'
  earned_at, confirmed_at, void_reason
  unique (referral_id, order_id, type)
```

That unique constraint is the idempotency guarantee. An order can generate only one reward of a given type for a given referral, however many times a delivery webhook fires.

Lifecycle:

- Order delivered: reward moves `pending` to `confirmed`, and only then does any balance move
- Order refunded or cancelled: reward moves to `void` with a reason. If it had already been confirmed and credited, the credit is reversed through the ledger
- **Nothing pays before delivery**

### 4.5 Store credit

```
buyer_wallets.store_credit_balance   integer not null default 0
```

Rules, enforced in one place:

- **Never withdrawable.** The withdrawal path continues to read `available_balance` only, and a spec locks that
- Spendable at checkout against `subtotal + handling`, never against the delivery fee, which is real cash leaving the business
- **Expires 6 months** after it is credited. Expiry runs as a scheduled sweep with the same idempotency treatment as the commission cron

`TODO:` expiry needs a per-grant date, so credit granted in March and credit granted in June do not expire together. That means a `store_credit_grants` ledger rather than a single balance column, with the balance as the sum of unexpired grants. Slightly more work, but a single column cannot express "expires 6 months from when it was earned" at all.

All movement goes through the `LedgerService`, with new entry types, so store credit inherits the same guarded updates, the same atomicity, and the same integer-kobo discipline as every other balance.

### 4.6 The discount at checkout

`orders` has no discount column and `createOrder` computes `subtotal + delivery + handling` with nowhere to subtract. Needs:

```
orders.discount_kobo       integer not null default 0
orders.store_credit_kobo   integer not null default 0
```

Both stamped at order time so an order stays auditable, exactly as `unit_price` and `handling_fee` already are.

Order of application: welcome discount first, then store credit against what remains of `subtotal + handling`. Neither may touch the delivery fee, and the total can never go below the delivery fee.

---

## 5. Correctness fixes

These are bugs in code running today. They ship first, alone, because they are mis-attributing live signups right now.

### 5.1 Buyer signup matches the wrong column

`auth.service.ts:652` resolves a **buyer** signup against `referral_agent_code`. It must match `referral_buyer_code`. The two codes are effectively swapped in the one place buyers use them.

### 5.2 Invalid codes silently attribute to admin

`auth.service.ts:660-674` falls back to the admin account when the code is missing **or wrong**. A typo permanently assigns that buyer to admin, the real referrer loses the link, and nobody is told.

Replacement:

- **No code:** no referral row. Not an error, and not an admin attribution
- **Unknown, inactive, or unapproved-agent code:** reject registration with a field-level error, so the typo is fixed while the user is still on the form
- Add **`GET /public/referral/validate?code=`** so the frontend validates as they type
- Rate-limit validation and signup by IP. Eight hex characters is enumerable and someone will farm valid codes

The admin fallback does not survive in any form. If unattributed signups should belong to the house, that is a reporting decision, not a database one.

### 5.3 Cron idempotency

`commission.service.ts:23` keeps no record that a period was processed. A restart on the 1st, a redeploy, or a second instance pays every override twice.

- Add `period` (first day of the earning month) to commissions
- `unique (agent_id, type, period)` for override types, so a double run collides instead of paying
- Wrap the run in a **Postgres advisory lock** so two instances cannot overlap
- Same treatment for the Friday payout scheduler and the new store credit expiry sweep

### 5.4 Overrides compound

The monthly base sums **all** confirmed commissions including `agent_override` rows from previous runs, so overrides pay on overrides. That is not the single-level model the docs describe.

Fix: the base sums `direct` and `buyer_referral` only.

### 5.5 Commissions are not in kobo

`commissions.amount` is `numeric(12,2)` naira, written via `String(overrideAmount / 100)` after float multiplication and rounding.

- Migrate to `amount_kobo integer not null`
- Backfill `round(amount * 100)`
- Keep the old column for one release, then drop it

New shared utility at `apps/debridgers-backend/src/api/shared/money.ts`:

```ts
// === Money
// All money is integer kobo. These are the only sanctioned conversions.

export function nairaToKobo(naira: number): number;
export function koboToNaira(kobo: number): number;
export function formatNaira(kobo: number): string;

/* Percentage of a kobo amount, rounded to whole kobo. Integer in, integer out,
   so a rate can never put a fraction of a kobo into a balance. */
export function percentOfKobo(kobo: number, percent: number): number;
```

Every rate calculation goes through `percentOfKobo`. That is what stops the next unit bug.

### 5.6 Hardcoded override rates

`AGENT_OVERRIDE_RATE` and `STATE_MANAGER_RATE` become settings, read through `SystemSettingsService` with the percent-to-fraction conversion in one place.

### 5.7 Two more found while auditing

- **Codes regenerate on every approval.** `admin.service.ts:256-266` mints new codes each time status is set to approved, silently invalidating every link already shared. Generate once, on first approval only
- **No collision retry.** A four-byte random code against a unique constraint surfaces as a raw database error during approval. Retry on conflict

---

## 6. Settings, and why they need a registry first

Every rate and amount here is admin-editable. That is the requirement. The settings layer as built cannot carry it.

### 6.1 The problem

Adding one setting today means editing six places:

- The `SETTING_DEFAULTS` map, `admin.service.ts:34`
- The hardcoded `allowed` whitelist array inside `updateSetting`
- A new `if (key === ...)` validation block in the same function
- The hardcoded response object in `getSettings`
- A `useState` plus hand-written validation in `settings.tsx`, duplicating the backend rule in a second language
- The `PlatformSettings` interface

Twelve new settings through that shape is seventy-two edits, with every validation rule written twice and free to drift apart. The commission unit bug was precisely that failure: one rule, two places, two different opinions about whether a number was a percent or a fraction.

### 6.2 The fix: one declarative registry

`apps/debridgers-backend/src/api/v1/settings/settings-registry.ts`

```ts
// === Types

export type SettingKind = "percent" | "kobo" | "months" | "enum" | "boolean";

export interface SettingDescriptor {
  key: string;
  kind: SettingKind;
  defaultValue: string;
  label: string;
  group: string;
  help?: string;
  min?: number;
  max?: number;
  options?: readonly string[];
  /* Money-affecting settings require an explicit confirmation in the UI. */
  sensitive?: boolean;
}

export const SETTINGS_REGISTRY: readonly SettingDescriptor[] = [ ... ];
```

Everything then derives from that one array:

- `updateSetting` validates from the descriptor. The `if` chain and the whitelist both disappear, because an unknown key is one that is not in the registry
- Defaults materialise from the registry, replacing `SETTING_DEFAULTS`
- `getSettings` builds its response from the registry, so a new setting appears without touching the endpoint
- A new **`GET /admin/settings/schema`** serves the registry to the frontend
- The admin UI renders controls generically from that schema, grouped by `group`, with min, max, and options enforced from the same descriptor the backend validates against

Adding a setting becomes **one registry entry**, and the validation rule exists exactly once for both sides.

This is the same seam as `RoleSignupConfig` and `RolePaymentConfig`: a declarative table plus a generic renderer, which is a pattern this codebase has already proven twice.

### 6.3 Guardrails

- `min` and `max` on every numeric setting, so a fat-fingered `500` in a percent field is refused rather than paying five times the order value
- `sensitive: true` on anything that moves money, gated behind an explicit confirmation
- The audit log already records who changed a setting. `TODO:` extend it to record the **previous** value alongside the new one, so a bad change can be traced and reverted rather than merely attributed

### 6.4 The registry contents

| Key                                   | Kind    | Default | Meaning                                                                                                                                                                   |
| ------------------------------------- | ------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `agent_commission_rate`               | percent | 5       | Superseded 2026-08-29: direct agent commission is now a flat naira amount per package, banded by product type, held in `agent-commission.ts`, not this percentage setting |
| `agent_override_rate_percent`         | percent | 5       | Recruiter share of a recruited agent                                                                                                                                      |
| `state_manager_override_rate_percent` | percent | 2       | State manager share                                                                                                                                                       |
| `buyer_referral_commission_kobo`      | kobo    | 2000    | ₦20 per delivered order                                                                                                                                                   |
| `buyer_referral_window_months`        | months  | 12      | How long that ₦20 runs                                                                                                                                                    |
| `buyer_referral_discount_kobo`        | kobo    | 50000   | ₦500 welcome discount                                                                                                                                                     |
| `buyer_referral_min_order_kobo`       | kobo    | 5000000 | ₦50,000 minimum to qualify                                                                                                                                                |
| `buyer_cashback_rate_percent`         | percent | 5       | Buyer cashback, share of contribution                                                                                                                                     |
| `agent_recruit_bounty_kobo`           | kobo    | 200000  | ₦2,000 on first remittance                                                                                                                                                |
| `agent_recruit_share_percent`         | percent | 2       | Share of recruited agent's commissions                                                                                                                                    |
| `agent_recruit_share_months`          | months  | 3       | Window for that share                                                                                                                                                     |
| `agent_recruit_share_cap_kobo`        | kobo    | 200000  | ₦2,000 cap per recruited agent                                                                                                                                            |
| `store_credit_expiry_months`          | months  | 6       | Credit lifetime from grant                                                                                                                                                |

Every `percent` value converts to a fraction through the single conversion already centralised in `SystemSettingsService`, generalised from `getAgentCommissionRate` to work for any percent key. Every `kobo` value is validated as a non-negative integer. No caller ever sees a raw string.

---

## 7. Policy answers

**Suspended agent**, reversible: keep accruing, hold everything at `pending`, pay nothing. Reinstatement releases the held rewards. If the suspension becomes permanent, they void.

**Deactivated agent**, permanent: stop future accrual from the deactivation date, and **honour already-confirmed earnings**. That money was earned before the decision, and withholding it turns a payout dispute into a legal one. Referred buyers stay attributed for reporting and generate nothing further. They are not reassigned.

**Buyers referring both agents and buyers:** one code table, two code kinds, one attribution service. The `referred_role` on the referral row selects the reward rule. Nothing else in the system branches on who the actor is.

---

## 8. The hook layer

Mirrors `RoleSignupConfig` and `RolePaymentConfig`, a pattern already proven twice here.

- `packages/ui-web/src/types/referral-config.ts` defines `RoleReferralConfig`: endpoints, labels, reward mapper
- `packages/ui-web/src/hooks/referral/referral-adapter.tsx` provides `ReferralAdapterProvider`, mounted in `root.tsx` beside the auth and payment adapters
- Hooks: `useReferralCode`, `useReferralStats`, `useReferralLink`, `useReferralRewards`, `useStoreCredit`

A role supplies only its endpoints and its copy. Buyer and agent dashboards render the same referral surface with no hook changes.

**The shareable link.** Nothing captures `?ref=` today, so sharing means typing a code into a field, which is where most referral programmes lose their conversion. `useReferralLink` captures the parameter on any landing route, persists it across the signup flow, and pre-fills the form.

---

## 9. Delivery order

Each phase ships with its own e2e specs. Every item here is a money path.

| Phase | Content                                                                | Risk                            |
| ----- | ---------------------------------------------------------------------- | ------------------------------- |
| 0     | Correctness fixes 5.1 to 5.7. No new features                          | Low, fixes live mis-attribution |
| 1     | `money.ts`, kobo migration, settings registry and generic admin UI     | Low                             |
| 2     | `cost_kobo` on products and order items, `contribution_kobo` on orders | Medium, migration plus admin UI |
| 3     | Schema: codes, referrals, rewards, store credit grants, order columns  | Medium                          |
| 4     | `ReferralService`: attribution, guards, validate endpoint, 3-day claim | Medium                          |
| 5     | Reward engine on delivery and refund hooks                             | High, pays money                |
| 6     | Checkout discount and store credit spend                               | High, moves money               |
| 7     | Hooks, adapter, dashboards, shareable link                             | Low                             |

Phase 0 is independently shippable and I would ship it on its own, before anything else.

---

## 10. Open items, and how each one is resolved

Every item below has a designed resolution. Nothing here is an unanswered question that would stall the build.

### 10.1 Store credit expiry: a grants ledger

**Resolution: build it. The extra work is small because `LedgerService` already exists.**

```
store_credit_grants
  id
  user_id           -> users.id
  source_reward_id  -> referral_rewards.id, nullable
  amount_kobo       integer   -- original grant, never mutated
  remaining_kobo    integer   -- decremented as it is spent
  status            -> 'active' | 'exhausted' | 'expired'
  granted_at
  expires_at
  index (user_id, status, expires_at)
```

- **Spendable balance** is `sum(remaining_kobo)` where the grant is active and unexpired. No denormalised total on `buyer_wallets`, so there is one source of truth and no cached figure to drift. If that ever becomes slow, a cached column maintained inside the same transaction can be added later
- **Spending** draws down grants in `expires_at` ascending order, soonest to expire first, which is the order that favours the buyer. Each decrement is a guarded update (`remaining_kobo >= amount`), the same discipline the ledger already uses for wallets, so two concurrent checkouts cannot spend the same credit twice
- **Expiry** is a daily sweep flipping active grants past `expires_at` to `expired`. Naturally idempotent, and it takes the same advisory lock as the other crons
- **Clawback on a voided reward:** reduce that grant's `remaining_kobo` toward zero. If the buyer already spent it, take back what is left and log the shortfall. Do not chase the difference or create a negative balance. These amounts are around ₦180, and a buyer who sees their credit go negative after a refund they did not cause is a support problem worth more than the money

### 10.2 Who maintains `cost_kobo`

**Resolution: the product carries it, and it drives agent remittance too, so it is not new work.**

`stock_requests` stores `amount_to_remit`. That was hardcoded to ₦1,300 per unit until 2026-08-29 and now derives from the product's price less its banded commission. So the remit price is already a real business decision made on every stock request. What is still missing is the landed cost behind it.

Invert it:

```
product.cost_kobo  -> the single source of truth
stock_requests.amount_to_remit = quantity × product.cost_kobo
orders/order_items.cost_kobo   = stamped from product.cost_kobo at order time
```

One number per product, set once, feeding **both** what an agent remits and what contribution is worth.

Resolution order when reading a cost:

1. The product's own `cost_kobo`, if an admin has set one
2. Otherwise refuse the sale rather than guessing. A platform-wide default cost is what produced the ₦1,300 problem in the first place

**Staleness guard:** the admin product list shows when each cost was last updated and flags anything untouched beyond a configurable age. That directly addresses a stale cost quietly distorting cashback, by making the staleness visible rather than silent.

`TODO:` deriving cost automatically from fulfilled stock receipts is the natural next step. It used to be circular, because `amount_to_remit` was computed from an assumed ₦1,300; it now derives from the product price, so the circle is broken on that side. What is still missing is a real **landed** cost entered once, which is what this section provides and what the supplier register produces.

### 10.3 Does the delivery fee cover the delivery

**Resolution: make it measurable instead of arguable.**

Add `orders.delivery_cost_kobo`, nullable, recorded after the drop. An admin report then compares fee charged against cost incurred per zone. Nullable because it will not always be filled in, and a partial sample still answers the question.

Until there is data, contribution continues to exclude the delivery fee, which is the conservative assumption: if delivery actually turns a small profit, rewards are slightly understated, which is the safe direction to be wrong in.

### 10.4 Does ₦50,000 lock out household buyers

**Resolution: instrument it, then decide from data.**

Log every first order against whether it qualified, and add a first-orders-by-subtotal-band report. If most first orders land under ₦50,000, the discount is dead for retail and the threshold comes down. It is a setting, so that adjustment is a form field, not a release.

### 10.5 Audit log should record the previous value

**Resolution: no migration needed. I was wrong about this one.**

`admin_audit_log.details` is already `jsonb`, and its column comment literally reads "before/after values or request payload". The column was designed for this and is simply not being populated on setting updates.

The fix is to read the current value inside `updateSetting` before writing, and record `{ before, after }` into `details`. A few lines, no schema change, and it makes a bad settings change revertable rather than merely attributable.

---

## 11. What I need from you

Nothing blocks Phase 0. For the later phases:

- Confirm the grants ledger in 10.1 is acceptable scope. It is my recommendation and the only way 6 month expiry works
- Confirm cost lives on the product per 10.2. Agent remittance already follows the product price rather than a hardcoded ₦1,300; what this adds is the **landed cost**, which is what contribution needs and what the commission bands should eventually key off
