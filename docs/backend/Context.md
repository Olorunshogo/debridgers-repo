# Backend conventions, structure, and open work

Written 2026-07-25. The backend counterpart to `docs/frontend/Context.md`. It
records the current shape of `apps/debridgers-backend`, the known structural
debt, and the TODOs that have no other home.

This file absorbs `docs/backend/backend_task.md`, which was a scratch list and
has been deleted. Every item from it is either recorded below or was already
covered by `docs/backend/auth.md`, `docs/backend/kyc.md`, or
`docs/backend/wallet-stock.md`.

Companions:

- `docs/backend/auth.md` - token contract, findings, farmer-role checklist.
- `docs/backend/kyc.md` - KYC state machine and endpoints.
- `docs/backend/wallet-stock.md` - Mode 2 stock flow, wallet, commissions.
- `docs/frontend/AuthPLAN.md` - the phased plan that drove the registration
  changes recorded here.

## Current shape of the backend

NestJS, Drizzle ORM on Postgres, Zod DTOs validated through
`infrastructure/pipeline/validation.pipeline.ts`. Modules live under
`apps/debridgers-backend/src/app/`.

| Module        | Owns                                                                                                                                                              | Routes |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| `auth/`       | register, login, admin login, refresh, logout, email verification, password reset. Also `config/access-jwt.ts`, `config/refresh-jwt.ts`, `guards/`, `decorators/` | 10     |
| `admin/`      | product CRUD, inventory records, agent status, KYC review, state-manager promotion, campaigns                                                                     | 33     |
| `agent/`      | agent apply, profile, dashboard, avatar, sales reports, commissions, plus `wallet.service.ts`, `stock.service.ts`, `kyc.service.ts`                               | 16     |
| `buyer/`      | buyer-side orders, cart, addresses                                                                                                                                | 11     |
| `payment/`    | Paystack plus `safehaven.service.ts` for payouts and webhooks                                                                                                     | 8      |
| `contact/`    | contact-form submission into `leads`                                                                                                                              | 1      |
| `public/`     | unauthenticated product browse, `config/public`, outreach submit                                                                                                  | 3      |
| `commission/` | the monthly referral cron. No controller, cron only                                                                                                               | 0      |

Supporting trees, none of them role-sliced:

- `infrastructure/persistence/schemas/` - 20 Drizzle table files.
- `infrastructure/persistence/migrations/` - through `0008_fair_eternity.sql`.
- `infrastructure/` - `cloudinary/`, `config/`, `database/`, `helper/`,
  `logger/`, `pipeline/`, `redis/`, `seeders/`.
- `events/` - `event-types/` and `listeners/`, EventEmitter2 fan-out for email
  side effects.
- `notification/` - `core/` and `features/`, the email service.
- `interfaces/users/roles.type.ts` - the role union.

### Known structural debt: modules are sliced by role, not by domain

`admin/`, `agent/`, and `buyer/` are role slices. `auth/`, `payment/`,
`contact/`, `commission/`, and `public/` are domain slices. The mix is what
makes the codebase expensive to extend.

The clearest symptom is KYC, one workflow spread across three role-owned files:

- `app/agent/kyc.service.ts` - submit and read (93 lines).
- `app/agent/dto/submit-kyc.dto.ts` - the submit shape.
- `app/admin/dto/review-kyc.dto.ts` - the approve/reject shape.

There is no `kyc/` module, so nothing owns the state machine documented in
`docs/backend/kyc.md`. The same split shows up in stock: `agent/stock.service.ts`
holds the request and remit side while the fulfil side lives in
`admin/admin.service.ts` (922 lines).

Why this matters, and the reason to record it rather than just note it: **role
slicing is what makes adding a new role expensive.** A domain-sliced backend
adds a role by adding role checks. A role-sliced one adds a role by adding a
module that re-implements the domain logic already living in the other role
modules. `docs/backend/auth.md` is right that the auth machinery is genuinely
role-extensible; the module layout is the part that is not.

Not a refactor to start speculatively. Fold a domain out the next time one of
these workflows is touched substantively, KYC first since it is the smallest.

Also debt, smaller:

- `app/agent/agent.service.ts.orig` is a leftover merge artifact still on disk.
- `app/agent/agent.controller.ts` is 632 lines, almost all Swagger decorators.

## Role model

Three places have to agree, and all three are the source of truth for a
different thing:

1. `src/interfaces/users/roles.type.ts` - `UserRole = "admin" | "agent" |
"buyer" | "company"`, plus the `USER_ROLES` const. This is what TypeScript
   sees.
2. `infrastructure/persistence/schemas/users.schema.ts` - the `user_role`
   Postgres enum with the same four values, and `users.role` is
   `notNull().default("buyer")`. This is what the database allows.
3. `app/auth/dto/register.dto.ts` - `SELF_REGISTERABLE_ROLES`, currently
   `[BUYER, AGENT]`. This is what a stranger with a POST request may create.

Item 3 is a security boundary and is deliberately an allow-list rather than
the full enum, so adding a value to the Postgres enum can never silently make
it self-registerable. Admin and company must never appear in it.

Enforcement is unchanged: `@Roles(...)` plus `RolesGuard` reading
`payload.role` off the access token. Details in `docs/backend/auth.md`.

## Registration: what is collected where

Superseding the old `backend_task.md` item 2, which described a single agent
signup form collecting full name, state, phone, area, email, and password.
That is no longer the shape.

**Collected at signup** (`app/auth/dto/register.dto.ts`, one shape for every
role):

- `first_name`, `last_name`, `email`, `password`
- `phone` - optional
- `role` - from `SELF_REGISTERABLE_ROLES`, defaults to buyer
- `referred_by_agent_code` - optional

`passwordRule` in the same file requires 8+ characters, an uppercase letter, a
number, and a special character.

**Moved to the agent profile** (`app/agent/dto/update-agent-profile.dto.ts`,
`PATCH /agent/profile`):

- `address`, `state`, `lga`, and overrides for `first_name`, `last_name`,
  `phone`. All optional.
- Setting `lga` re-resolves the agent's zone, per the comment on that DTO and
  `AgentService.updateProfile`.

At registration `auth.service.ts:115-119` inserts the `agent_profiles` row with
only `user_id`, `status: "pending"`, and `referred_by_agent_id`, so
`address`/`state`/`lga` start null and `kyc_status` starts at its
`not_submitted` default.

**Moved to KYC** (`app/agent/dto/submit-kyc.dto.ts`): `id_type`, bank name,
account number, account name, plus the two uploaded images. Flow in
`docs/backend/kyc.md`.

**Admin approval still gates the agent**, as the old note said:
`agent_profiles.status` defaults to `"pending"` and admin moves it through
`admin/dto/update-agent-status.dto.ts`.

**Kaduna-only is a data fact, not a validated rule.** Nothing in any DTO
restricts `state`. The only "Kaduna only" enforcement is that
`infrastructure/seeders/seeder.ts` seeds just two zones, Kaduna South and
Kaduna North. Every other Kaduna reference in the codebase is a Swagger
example. If the restriction is meant to be real, it needs a check in
`update-agent-profile.dto.ts` or a foreign key to `zones`.

**Open: two agent registration paths coexist.** `POST /agent/apply`
(`app/agent/dto/apply-agent.dto.ts`) is still wired at
`agent.controller.ts:60` and still requires `lga` and `address`, still takes
`confirm_password`, and still validates the password as a bare `min(8)` rather
than through `passwordRule`. It is the pre-unification path. Decide whether it
is retired or is a distinct admin-facing flow; leaving both live means the
weaker password rule is reachable.

**Note on `docs/frontend/AuthPLAN.md`:** its status table lists Phase 3
(backend register DTO) and Phase 6 (agent fields to profile) as "Not started".
The code contradicts that. `SELF_REGISTERABLE_ROLES`, the buyer default in
migration `0008_fair_eternity.sql`, and `update-agent-profile.dto.ts` are all
in place. Treat that table as stale, not this section.

## Contact form and campaign marketing

Old `backend_task.md` item 3, resolved as follows.

**Done.** `app/contact/dto/create-contact.dto.ts` collects exactly
`full_name`, `email`, `message`. `app/contact/contact.service.ts` inserts a row
into `leads` (`infrastructure/persistence/schemas/leads.schema.ts`, columns
`full_name`, `email`, `message`) and emits `CONTACT_SUBMITTED`, which
`events/listeners/user-listeners.ts:43` turns into a confirmation email. So
name and email are persisted, which is what the note asked for.

**Still open.** Persisted is not the same as usable for marketing.
`infrastructure/persistence/schemas/campaigns.schema.ts` has
`target_list: campaign_target` with values `buyers | agents | all` only. There
is no `leads` audience, so no campaign can currently be sent to the people who
filled in the contact form. Either add a `leads` value to `campaign_target` and
a resolver for it, or push leads into Mailtrap as contacts the way `users` and
`agent_profiles` do via their `mailtrap_contact_id` columns. `leads` has no
such column.

## Open TODOs

### PostHog is not integrated. Genuinely open.

Grepped the whole repo case-insensitively for `posthog`: the only hit was
`docs/backend/backend_task.md` itself. No dependency in any `package.json`, no
init call, no key in `.env.example`. Nothing has been started.

Intended install path, preserved from the original note:

```bash
npx -y @posthog/wizard@latest
```

Capabilities the integration was scoped to cover, preserved verbatim in intent
so the decision is not re-derived later:

- Product analytics: events, funnels, retention, paths, cohorts, dashboards
- Session replay: watch real user sessions to see where people get stuck
- Autocapture: clicks, page views, form interactions, other UI events
- Feature flags: turn features on and off per user or segment
- Experiments: A/B tests comparing conversion or engagement
- Surveys: in-app questions
- Heatmaps: where users click and interact most
- User profiles: tie events to individual users or accounts
- Alerts and insights: detect spikes, drops, unusual behaviour
- Data warehouse and SQL-style analysis: custom queries over event data

Note that most of this list is frontend work, not backend. The wizard targets
the client app. Only server-side event capture would land here.

### Other open items

- Retire or justify `POST /agent/apply` (see registration section).
- Give `leads` a campaign audience (see contact section).
- Delete `app/agent/agent.service.ts.orig`.
- Add a `leads` audience or Mailtrap contact sync, whichever is cheaper.
- Everything in `docs/backend/auth.md` "Suggested order" is still open there;
  not duplicated here.

Unverified, and stated as such: whether the Kaduna restriction is a product
requirement at all. Checked every DTO, `zones.schema.ts`, and the seeder. No
code expresses it, and no product doc in `docs/` states it either.

## Product phasing

Preserved from `backend_task.md` item 4, with current status checked against
the code.

- **Stock and inventory (Mode 2).** Agents request beans stock from
  Debridgers, sell it themselves, then remit money back. This depends on the
  agent wallet existing first, because without a wallet the system cannot
  track what an agent owes and earns. Status: built.
  `app/agent/stock.service.ts` and `app/agent/wallet.service.ts` exist, with
  the fulfil side in `admin/admin.service.ts`. Documented in
  `docs/backend/wallet-stock.md`.
- **Referral commission cron.** Monthly auto-calculation paying 5% of a
  recruited agent's earnings to whoever recruited them. The product doc puts it
  in Phase 4 and it is not needed to launch. Status: built anyway.
  `app/commission/commission.service.ts` runs
  `@Cron(EVERY_1ST_DAY_OF_MONTH_AT_MIDNIGHT)` with `AGENT_OVERRIDE_RATE = 0.05`
  and also a `STATE_MANAGER_RATE = 0.02` override for state managers.
- **Rider app.** A separate mobile app for delivery riders, Phase 5, ignore for
  now. Status: not started, and correctly so. The only backend footprint is
  `infrastructure/persistence/schemas/riders.schema.ts` and the
  `orders.rider_id` foreign key. No module, no endpoints.

## Operational snippets

### Generate a token secret

Both `ACCESS_TOKEN_SECRET` and `REFRESH_TOKEN_SECRET` in `.env` want 64 random
bytes of hex. Run this once per secret, never reuse one for both:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

`.env.example` ships them as `change_me_64_random_hex_bytes`, so an unedited
copy is an obvious tell in a deployed environment.

### Where the token config is read

`app/auth/config/access-jwt.ts` and `app/auth/config/refresh-jwt.ts`, with
defaults `15m` and `7d` respectively. See `docs/backend/auth.md`.
