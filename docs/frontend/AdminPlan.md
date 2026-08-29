# Admin audit and phased remediation plan

Written 2026-08-09. Companion to `docs/frontend/Context.md`.

This file lived at `docs/frontend/AdminPlan.md` for part of its history. Earlier
notes and session transcripts refer to it by that path.

This records a live audit of the admin surface (backend `v1/admin` plus the
7 admin dashboard routes) and turns it into a phased checklist. Findings are
evidence-based: every defect below was reproduced against a running backend
on `http://localhost:4001/api/v1`, not inferred by reading code.

Tick items off as they land. Keep the evidence lines when you fix something,
so a later reader can tell what changed and why.

## Handoff: state as of 2026-08-09

Read this section first if you are picking the work up cold.

### Where we are

Phase 0 complete. Phase 1 largely complete. Repo typechecks clean
(`npx tsc -p apps/debridgers-backend/tsconfig.json --noEmit` exits 0). Nothing
is committed yet, so `git diff` shows the whole of this work.

**Fully closed, verified at runtime** against seeded data: F1, F2, F3, F4, F5,
F21, F23, F27.

**Verified at runtime for the behaviour that was reported, but the finding is
not closed:** F17, F18, F19, F20, F24. Each has a remaining item listed under
"Still open" below. Do not read these as done.

**Written and typechecked but NOT yet runtime-verified.** Do this first, it is
about 10 minutes:

| Finding  | Change                                                                                                         | How to verify                                                                             |
| -------- | -------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| F6       | `loadBanks` throws `ServiceUnavailableException` instead of a plain Error                                      | `POST /admin/agents/backfill-bank-codes` should be 503, not 500                           |
| F25      | `GET /admin/kyc?kyc_status=` filter; `kyc_status`, `bank_code`, `bank_name` added to the agent list projection | `?kyc_status=approved` should return the 3 approved agents, and `?kyc_status=bogus` a 400 |
| F30 part | revoke requires `is_active` in the predicate                                                                   | revoke twice: second call should 404                                                      |
| F30 part | upload guards a missing file                                                                                   | `POST /admin/upload` with no file should be 400, not 500                                  |

**F26 was retracted as a false finding.** Read its entry before re-testing
those two endpoints, and do not "fix" them.

**F11 was previously recorded here as fixed. It is not.** The re-revoke change
is an F30 bullet. `listApiKeys` still returns revoked keys unfiltered, which is
the whole of F11. Its entry has the detail.

### Still open

Partly done, and the unfinished half is the part an admin would notice:

- **F20** approve stamps `processed_by`, but the withdrawals list projection
  still omits it, so the payout actor remains invisible.
- **F24** the tri-state boolean parse landed; `is_blocked` is still ignored and
  the buyer detail projection still lacks `is_suspended`.
- **F17 and F18** backend done, frontend not. `products.tsx` still converts
  `measure_value` through a string and has no `weight_grams` input.
- **F19** fixed as reported. The orders-versus-wallet envelope split is
  deliberately deferred to Phase 3.

Untouched:

- **F11** revoked API keys still listed.
- **F22** no commissions list endpoint. Needs a new route plus a Phase 6 page.
- **F28** needs a decision, not a fix. `getTree(false)` returns deactivated
  nodes _and already exposes `is_active` per node_, so the admin tree can
  distinguish them. The real gaps are that there is no reactivate endpoint and
  the frontend ignores the flag. Probably a UI item, not a backend defect.
- **F29** `buyer_referral_*` settings are hardcoded service fallbacks presented
  as editable rows.
- **F30 remainder** revoked keys carry no `revoked_at`; `promote-manager` has no
  uniqueness check, so two agents can manage the same state (business rule
  unconfirmed, ask before changing); 21 decorative `// ─── x ───` separators
  across the admin files against the repo's own `// === x` convention, best left
  until Phase 4 rewrites those files anyway.
- **Phase 2 untouched**: F7, F8, F9. F7 is the only finding in this audit that
  carries ongoing risk rather than accumulating debt, so start there.

### Immediately useful context for whoever is next

- One migration was added this session: `0004_classy_virginia_dare`, applied.
  It needed a hand-edit: drizzle-kit emits a bare `SET DATA TYPE` and Postgres
  will not cast text to integer without `USING`. Expect to hand-edit any future
  type-change migration the same way.
- New file `src/infrastructure/helper/query.helper.ts` holds
  `parseOptionalBoolean`, `parseOptionalEnum`, `parsePagination`. Reuse these
  for the remaining unvalidated query params rather than writing new coercions.
- `createProduct` now uses the query builder. `listProducts` is still raw SQL
  (`SELECT * FROM product`) and is the last raw-SQL product path.
- The seeder writes `measure_value` as a number now that the column is integer.
  If you revert the migration you must revert that too.

### Environment, exactly as it stands

| Thing           | State                                                                     |
| --------------- | ------------------------------------------------------------------------- |
| Backend         | `pnpm dev:backend`, host process, `http://localhost:4001/api/v1`          |
| Swagger         | `http://localhost:4001/api/docs`, JSON at `/api/docs-json`                |
| Postgres        | docker, `debridgers-postgres-1`, port 5432, 4 migrations applied in order |
| Redis           | docker, `debridgers-redis-1`, port 6379, verified working                 |
| Admin login     | `admin@debridgers.com` / `Admin@2026!` from `.env`                        |
| Seeded accounts | `@seed.test` domain, password `Dev@2026!`                                 |

Start the infrastructure with `cd docker && docker compose up -d postgres redis`.

### Evidence for the verified fixes

Each row is evidence for one specific change, not a claim that the finding is
closed. Check the finding's own entry for that.

| Finding | Fix                                                                         | Verified by                                                              |
| ------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| F1      | hardcoded leaf literal deleted, `getLeaves_old` promoted                    | 16 leaves, none of them a parent; all 16 paths identical to the old list |
| F2      | `createProduct` on the query builder                                        | every DTO field round-trips, `category` derived from the leaf            |
| F3      | FK on `category_id` plus an existence check                                 | bad `category_id` gives 400 with a named field, not 500                  |
| F4      | rowcount checks on target, commission-paid, outreach delete                 | all three 404 on a nonexistent id; negative target 400                   |
| F5      | `ZodValidationPipe` on both category handlers                               | `POST /admin/categories {}` gives 400, was 500                           |
| F17     | `measure_value` migrated to integer, coercions removed                      | returns `typeof number`                                                  |
| F18     | `weight_grams` added to both DTOs                                           | persists on create and update                                            |
| F19     | `meta` carried by the interceptor; count shares the row WHERE               | `?status=delivered` gives `meta.total: 5`, unfiltered 25                 |
| F20     | approve stamps `processed_at` and `processed_by`                            | both set, `processed_by: 1`                                              |
| F21     | reject guards on status, not `processed_at`                                 | approve then reject returns 200                                          |
| F23     | `parsePagination` and `parseOptionalEnum` wired into orders, agents, wallet | 5 previously-500 inputs all give 400                                     |
| F24     | `parseOptionalBoolean` keeps absent distinct from false                     | buyers 5 / 1 / 4, `notabool` gives 400                                   |
| F27     | outreach pipe moved to `@Body`                                              | valid payload 201, `{}` 400                                              |

### Traps that have already caught us

1. **`getLeaves` versus `getLeaves_old`.** Resolved, but the lesson stands: the
   file had two implementations and a reviewer read the orphan, then reported the
   bug fixed when it was not. Check which function the controller actually calls.
2. **Existence is not leafness.** Checking that the old hardcoded ids existed in
   the tree passed on all 16 and proved nothing: 4 of them were intermediate
   nodes. Compare against the set of nodes that are not a parent.
3. **A 400 is not proof of correct validation, and your test data may be the
   thing that is wrong.** F27 returned 400 on valid input, a real bug. F26
   looked identical and was _invented by a bad test payload_. Always test a
   valid payload, and check it against the schema before blaming the code.
4. **`nest --watch` needs a content change.** `touch` will not trigger a
   rebuild. If a compile error is outstanding, the process on :4001 keeps
   serving a stale binary and your fix appears to do nothing. Run
   `npx tsc -p apps/debridgers-backend/tsconfig.json --noEmit` before
   concluding a change had no effect.
5. **A fix on the same table is not a fix for the finding.** F11 ("revoked keys
   are still listed") was marked done on the strength of a change to the revoke
   _predicate_, which is a different defect on the same table and is filed under
   F30. Nobody re-read F11's assertion. Before ticking anything, re-read the
   finding's own claim and check the fix answers that claim.
6. **Concurrent edits.** On 2026-08-09 `admin.service.ts` was found half-edited
   by another session: `approveWithdrawal` had gained an `adminId` parameter
   that no caller passed, so the whole backend stopped compiling and the running
   process was stale. Check `git status` and typecheck before and after editing.

### Test data contract

Re-seed before any measurement, because the audit mutates records:

```bash
cd apps/debridgers-backend
pnpm db:seed:dev:reset && pnpm db:seed:dev
```

Expected counts afterwards: 7 agents, 5 buyers, 25 orders, 36 wallet
transactions, 15 commissions, 5 withdrawals, 4 stock requests, 3 inventory
records, 4 leads, 5 outreach, 11 products, 22 taxonomy nodes of which 16 leaves.
Assertions in this document are written against these numbers.

### How to test efficiently

Write one node script that exercises a whole domain and prints a table, rather
than one request per endpoint. Mint a single admin token and reuse it: parallel
logins trip the rate limiter and return 429.

That rate limiter is now real, and it is tighter than it looks. Admin login is
`@Throttle(authThrottle(3))`, so **3 attempts per 60 second window**, against 5
for the other auth routes (`api/shared/throttle.config.ts`). Earlier
degraded-fallback runs never hit it, so any assumption that logins are cheap
came from a period when throttling was not on its real path.

Two traps, both hit on 2026-08-09:

1. **A retry loop faster than the window never recovers.** Retrying login every
   15 seconds is 4 attempts per minute against a limit of 3, so it stays
   permanently throttled and eventually reports "login failed" as though the
   credentials were wrong. Space retries at **more than 60 seconds**, or wait a
   full window before the first attempt.
2. **A 429 body has no `data` key.** A script reaching straight for
   `data.access_token` dies with `KeyError: 'data'`, which reads like a broken
   response shape rather than a rate limit. Check `statusCode` first.

`AUTH_THROTTLE_LIMIT` overrides every one of these limits at once and exists for
the e2e suite. Setting it while testing by hand is legitimate and much faster
than waiting out windows.

## How to reproduce the audit

```bash
# backend on :4001, postgres up
pnpm dev:backend

# admin credentials come from .env (ADMIN_EMAIL / ADMIN_PASSWORD),
# defaults are seeded by src/infrastructure/seeders/seeder.ts
curl -X POST http://localhost:4001/api/v1/auth/admin/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@debridgers.com","password":"Admin@2026!"}'

# full route inventory
curl -s http://localhost:4001/api/docs-json | jq '.paths | keys[] | select(contains("admin"))'
```

Swagger UI is at `http://localhost:4001/api/docs`. It reports 49 admin
operations, 48 under `/admin` plus `POST /auth/admin/login`.

## Scale of the surface

| Thing                 | Count                                                      |
| --------------------- | ---------------------------------------------------------- |
| Admin endpoints       | 52 route decorators, 48 distinct operations under `/admin` |
| `admin.controller.ts` | 1119 lines                                                 |
| `admin.service.ts`    | 1169 lines                                                 |
| Admin modules         | 1 controller, 1 service, 1 module                          |
| Admin frontend routes | 7                                                          |
| Endpoints with no UI  | roughly 60 percent                                         |

## Phase 0 results

### What passed

- **Auth is solid.** All 48 admin routes return `401` unauthenticated. None
  404s, none 500s before the guard, none are missing a guard. Class-level
  `@UseGuards(AuthGuard, RolesGuard)` plus `@Roles("admin")` is applied
  consistently.
- **All 16 read endpoints return `200`**: `me`, `dashboard`, `agents`,
  `orders`, `buyers`, `kyc`, `leads`, `stock/requests`, `stock/inventory`,
  `products`, `settings`, `categories`, `categories/leaves`, `withdrawals`,
  `outreach`, `api-keys`. Latency 6ms to 65ms.
- **Not-found handling is mostly correct.** 20 of 28 probes with a
  nonexistent id returned a clean `404` or `400`.
- **Settings round-trip works.** Reading `agent_commission_rate`, writing the
  same value back, and re-reading preserves the value. An unknown key is
  correctly rejected with `400 Unknown setting key`.
- **API key lifecycle works.** Create returns a `debridgers_` prefixed key,
  list reflects it, revoke sets `is_active: false`.

### Seeded dataset (resolved)

The first sweep ran against an effectively empty database: 1 user, 0 rows in
almost every table. Those 16 passing reads proved routing, not behaviour.

`dev-seeder.ts` now provides a dataset shaped specifically at the gaps:

| Data                      | Shape                                    | Why this shape                                          |
| ------------------------- | ---------------------------------------- | ------------------------------------------------------- |
| Taxonomy                  | 22 nodes, 3 roots, 16 leaves             | Exercises the tree, and exposed the real severity of F1 |
| Products                  | 11, each attached to a leaf              | `category_id` was null on every row                     |
| Agents                    | 7, every `status` and every `kyc_status` | Status filters, KYC queue                               |
| Agents without bank codes | 3                                        | Gives `backfill-bank-codes` real targets                |
| Buyers                    | 5, one blocked, one suspended            | Moderation paths, and it exposed F24                    |
| Wallet transactions       | 36, one buyer holding 25                 | Crosses a page boundary                                 |
| Orders                    | 25, every status and payment_status      | Crosses a page boundary, filters                        |
| Commissions               | 15 across all three statuses             | Found to be unlistable, F22                             |
| Withdrawals               | 5: 2 pending, approved, rejected, paid   | State transitions, exposed F21                          |
| Stock requests            | 4 across statuses                        | Fulfil path, inventory arithmetic                       |

```bash
pnpm db:seed:dev        # build
pnpm db:seed:dev:reset  # tear down, cascades from users
```

Two design points worth keeping: the seeder refuses a non-local `DATABASE_URL`
unless `SEED_FORCE=1`, and every account uses the `@seed.test` domain so dev
data is identifiable and removable in one query.

Realistic values earned their keep immediately. `processed_at` being set on
non-pending withdrawals is what surfaced F21, a latent guard bug that an empty
database could not have exposed.

- [x] Seed a realistic dataset
- [x] Re-run the sweep against seeded data
- [ ] `POST /admin/upload` with a real multipart file (only the no-file 500 case
      is covered, see F30)
- [ ] Re-run once more after Phase 1 as the regression check

## Findings

Severity reflects impact on a live payments platform, not effort.

### F1 Category leaves are hardcoded, and the ids are actively wrong (high)

`src/api/v1/catalog/taxonomy.service.ts:120` `getLeaves()` returns a literal
array of 16 objects with ids 7 to 22. The real DB-backed implementation still
exists directly beneath it as `getLeaves_old()` at line 144, orphaned and
called by nothing.

Originally recorded as "phantom ids" because `product_categories` was empty.
Re-tested against the seeded 22-node taxonomy, and it is worse than that. The
hardcoded ids all happen to exist as _nodes_, but they are the wrong nodes:

- **4 entries are intermediate nodes, not leaves**: ids 7, 13, 17 and 20 are
  Beans, Garri, Oil and Tubers. A product can therefore be filed under "Oil"
  rather than "Palm Oil", which is the exact failure the taxonomy exists to
  prevent.
- **4 real leaves are unselectable**: the whole Rice branch (Local White,
  Ofada, Tuwo, Long Grain, ids 3 to 6) is absent from the list.
- **The names are mismapped**: the literal labels id 7 "Local White"; id 7 is
  actually Beans.

Verification note: a check that only asks "does this id exist in the tree"
passes on all 16 and concludes the bug is fixed. It is not. The check has to
compare against the set of nodes that are not a parent of any other node.

**Status: fixed and runtime-verified.**

- [x] Promote `getLeaves_old` to `getLeaves` and delete the literal
- [x] Seed the taxonomy so the tree is non-empty (dev-seeder.ts)
- [x] Verify `categories` and `categories/leaves` agree, by leaf set and not
      merely by id existence

### F2 createProduct silently discards fields (high)

`src/api/v1/admin/admin.service.ts:880` inserts via raw SQL naming only 7
columns: `name`, `unit`, `price_kobo`, `description`, `image_url`,
`sort_order`, `is_active`. The DTO in `dto/create-product.dto.ts` validates
`category`, `category_id`, `measure_value`, and `measure_unit`, and then those
four are thrown away. `weight_grams` is not in the DTO at all.

Reproduced: posting `category_id: 8`, `measure_value: 1`, `measure_unit: "kg"`,
`weight_grams: 1000` returned `201 Created` with all four as `null`. This is
consistent with all 11 existing products having `category_id: null`, so the
taxonomy has never been attachable to a product through this endpoint.

This is the worst kind of failure: valid input, success response, data
silently dropped.

**Status: fixed and runtime-verified.** `createProduct` is on the query builder
now. `listProducts` is still raw SQL and is the last raw-SQL product path (F14).

- [x] Insert every validated column, or reject columns the insert ignores
- [x] Add `weight_grams` to the DTO if the column is meant to be settable
- [ ] Regression test asserting a round-trip of every DTO field

### F3 No foreign key on product.category_id (medium)

`product` has a `category_id` column and **no** FK constraint to
`product_categories`. Dangling references are accepted with no database error,
which is why F2 and F1 could go unnoticed.

**Status: fixed and runtime-verified.** Landed in migration
`0004_classy_virginia_dare` together with F17.

- [x] Add the FK constraint in a migration
- [x] Decide the on-delete behaviour, noting `deactivateCategory` is a soft delete
      (chose `onDelete: "restrict"`; a cascade would null the taxonomy on every
      product under a soft-deleted category)
- [x] Backfill or null out any invalid `category_id` before adding the constraint

### F4 Endpoints report success for records that do not exist (medium-high)

Three endpoints returned `200` with a success message for id `999999999`:

| Endpoint                            | Response                                                       |
| ----------------------------------- | -------------------------------------------------------------- |
| `PATCH /admin/agents/:id/target`    | `200 "Target updated"` with `{agentId: 999999999, target: 10}` |
| `PATCH /admin/commissions/:id/paid` | `200 "Commission marked as paid"`                              |
| `DELETE /admin/outreach/:id`        | `200 "Record deleted"`                                         |

No existence check, and the update affected zero rows. An admin gets positive
confirmation for an action that did nothing. `commissions/:id/paid` is a money
operation, which makes this more than cosmetic.

**Status: fixed and runtime-verified.** All three 404 on a nonexistent id, and a
negative target now gives 400.

- [x] Check rows affected and throw `NotFoundException` when zero
- [x] Audit the rest of the service for the same pattern (`.returning()` plus a
      rowcount check is now the pattern throughout `admin.service.ts`)

### F5 Raw zod parse in the controller returns 500 instead of 400 (medium)

`createCategory` and `updateCategory` call `createCategorySchema.parse(body)`
directly on `@Body() body: unknown` rather than going through
`ZodValidationPipe`. A raw `ZodError` escapes and the filter renders it as
`500 Internal server error`.

Reproduced: `POST /admin/categories` with `{}` returns `500`, and
`PATCH /admin/categories/:id` returns `500`. Endpoints that use
`new ZodValidationPipe(schema)` correctly return `400`.

Client code cannot distinguish "your input was wrong" from "the server broke".

**Status: fixed and runtime-verified.** Both handlers now bind
`new ZodValidationPipe(schema)` to `@Body()`.

- [x] Move both to `ZodValidationPipe`
- [ ] Confirm the exception filter maps `ZodError` to 400 as a backstop. Still
      open, and lower value than it looks: `ZodValidationPipe` catches the parse
      itself and throws `BadRequestException`, so a raw `ZodError` only escapes
      from a `.parse()` called outside a pipe. The backstop matters as defence
      against the next such call, not for these two handlers.

### F6 backfill-bank-codes always 500s outside simulation (low-medium)

`src/api/v1/agent/bank-details.service.ts:72` `loadBanks()` throws a hardcoded
`Error("Bank lookup not yet implemented. Enable PAYMENTS_SIMULATED for
development.")` unless `this.simulated`. A documented TODO for Phase 3 of the
payments work, but it surfaces to an admin as an opaque `500`.

**Status: superseded and fully fixed.** The 503 below was the interim fix. The
bank lookup now runs against the live Paystack bank list through the shared
`PaystackBankService` (`api/v1/payment/paystack-bank.service.ts`), cached for
six hours and available to every role regardless of `PAYMENTS_SIMULATED`.
Agents can add bank details, so payouts are no longer silently blocked. The
interim behaviour is recorded below for history:

`loadBanks` threw
`ServiceUnavailableException` (`bank-details.service.ts:86`).
`POST /admin/agents/backfill-bank-codes` returned 503 with
`"Bank lookup is not available: the Paystack integration is not implemented yet."`
The real Paystack lookup is still unimplemented and remains a Phase 3 payments
item; this finding only ever asked for an honest status code.

- [x] Either implement the Paystack bank lookup or return a `501`/`503` with a clear message

### F7 Payment keys are shipped to the browser (high, pending backend audit)

`packages/api-client/src/apiFetch.ts` attaches `VITE_REQUEST_KEY`,
`VITE_PAYMENT_KEY_1`, and `VITE_PAYMENT_KEY_2` to every request. Vite inlines
any `VITE_` prefixed variable into the client bundle at build time, so these
are public strings readable in devtools, not secrets.

**Backend audit done 2026-08-09.** The headers are checked, so they are not
inert, but they authorise nothing that the JWT does not already authorise.

What checks them, and what it gates:

| Guard                   | Extra requirement                           | Where it is applied                                    |
| ----------------------- | ------------------------------------------- | ------------------------------------------------------ |
| `RequestKeyGuard`       | `X-Request-Key`, plus a JWT                 | ~25 agent routes, wallet, notifications, buyer, orders |
| `BuyerPaymentKeysGuard` | request key + both payment keys, plus a JWT | 4 buyer checkout routes                                |
| `PaymentKeysGuard`      | both payment keys, plus a JWT               | the 4 routes in F33                                    |
| `AdminKeysGuard`        | `X-Admin-Key-1` and `-2`, no JWT            | 4 `product.controller.ts` write routes                 |

**Why they exist.** The intent is a shared secret proving a request came from the
official frontend rather than a script. It is a coherent idea for a server to
server call. It cannot work from a browser, because anything the browser must
send, the user can read. Vite makes this explicit by inlining every `VITE_`
variable at build time, so all three values are literals in the shipped bundle.

**Why removing them loses nothing.** Every route above except the
`product.controller.ts` four also requires a valid JWT. An attacker reading the
bundle already has the keys, so the keys stop nobody; they only add a way for a
legitimate client to be misconfigured and get a 403. The one place they are the
_only_ check is `AdminKeysGuard` on the product write routes, and those are the
ones to fix rather than preserve.

**What it affects, and whether it is fixable.** Deleting the three headers from
`apiFetch` while the guards remain would 403 roughly 35 routes, which is most of
the agent and buyer app. So the two halves have to move together, backend first:

**Backend half done and runtime-verified 2026-08-09. Client half deliberately not
started.**

`RequestKeyGuard` is gone from 20 agent routes and the four buyer-side
controllers; `BuyerPaymentKeysGuard` is gone from the four checkout routes, whose
method-level `@UseGuards` became redundant once the class carried `AuthGuard` and
`RolesGuard`. The `product.controller.ts` four now use `AuthGuard` + `RolesGuard`

- `@Roles("admin")`.

Verified with **no key headers sent at all**:

| Probe                                              | Result                             |
| -------------------------------------------------- | ---------------------------------- |
| buyer to orders, cart, wallet, notifications       | 200 on all four                    |
| agent to `/agent/wallet`, `/agent/me`              | 200                                |
| buyer to `/agent/wallet`, agent to `/buyer/orders` | 403, F34 still holds               |
| admin to `POST /catalog/products`, no admin keys   | 400 validation, so it is reachable |
| **buyer to `POST /catalog/products`**              | **403**                            |
| **buyer to `DELETE /catalog/products/1`**          | **403**                            |
| no token to `POST /catalog/products`               | 401                                |
| no token to `/agent/leaderboard`                   | 200, still public                  |

The two bold rows are a genuine tightening. Before this, any authenticated user
holding the static admin keys could write products, and role was never checked.

Deploy-order safety confirmed rather than assumed: a request carrying the old
`X-Request-Key` returns 200, and so does one carrying a deliberately **wrong**
value. The header is not read at all, so every already-deployed client keeps
working and the frontend can be updated whenever.

- [x] Audit what the backend grants on the strength of these headers
- [x] Remove `RequestKeyGuard` and `BuyerPaymentKeysGuard` from routes that
      already carry `AuthGuard`
- [x] Put the `product.controller.ts` four behind `AuthGuard` + `RolesGuard` +
      `@Roles("admin")` before removing `AdminKeysGuard`
- [x] Delete the three headers from `apiFetch.ts`. Done, and the frontend
      typechecks clean. `VITE_REQUEST_KEY` removed from
      `debridgers-frontend/.env.example`, with a note saying why it must not come
      back. No `VITE_PAYMENT_KEY*` reference remains anywhere outside this
      document.
- [x] `PaymentKeysGuard` removed from the four payment routes. That was F33, done
      first so those routes gained `AuthGuard` before the key guard came off.
- [ ] **Rotate `REQUEST_KEY`, `PAYMENT_KEY_1`, `PAYMENT_KEY_2`.** Still
      outstanding and now unblocked, since nothing in the client sends them. The
      old values must be treated as compromised: they were in every shipped
      bundle. This is a deploy task, not a code change.
- [ ] Delete the three server-side env vars once rotation is done and nothing
      server to server sends them. Nothing in this repo does.

**Deploy note.** Backend and client changes are both in the tree now. The backend
must reach production first or not-yet-updated clients keep working anyway,
because the guards no longer read the headers. Verified: a request carrying a
deliberately wrong `X-Request-Key` returns 200. So the ordering constraint that
made this risky no longer applies.

**Correction to F8 found here:** `product.controller.ts` imported `AdminKeysGuard`
from the standalone `admin-keys.guard.ts`, not from `keys.guard.ts`. So the
standalone file was the live one and the `keys.guard.ts` subclass was dead, the
opposite of what F8 records. Two classes, one name, and the import path is the
only thing that tells them apart. Check imports, not class names, when doing F8.

**Order matters.** Backend guard removal is safe to ship on its own: the client
keeps sending headers nobody reads. Client removal first would break the app.
Re-run the Phase 0 matrix after, since this touches roughly 35 routes.

### F8 Three competing admin auth mechanisms (medium)

- `AuthGuard` + `RolesGuard`: what the controller actually uses
- `AdminKeysGuard`: static `ADMIN_KEY_1` / `ADMIN_KEY_2` from env, compared
  with `!==`, so non-constant-time and timing-leaky if it ever goes live
- `ApiKeyGuard`: DB-backed, hashed lookup, the sound one

Two are unreferenced by the admin controller. Dead auth paths are attack
surface and a trap for the next person.

**This finding undercounts the problem, corrected 2026-08-09.** There are six
guard files, not three mechanisms. `keys.guard.ts` defines `AdminKeysGuard`,
`PaymentKeysGuard`, `RequestKeyGuard` and `BuyerPaymentKeysGuard` on a shared
base, and **three of those names are defined a second time** as standalone
classes in `admin-keys.guard.ts`, `payment-keys.guard.ts` and
`request-key.guard.ts`.

The duplicates are the dead ones. The `keys.guard.ts` versions are live:
`AdminKeysGuard` guards four `product.controller.ts` write routes, and
`RequestKeyGuard` / `BuyerPaymentKeysGuard` are used across the agent, buyer and
order controllers.

So **"delete `AdminKeysGuard`" is not safe as written.** Two classes share that
name and one of them is guarding product writes. Resolve the duplicate names
before deleting anything, and check the import path at each usage rather than the
class name. This is the `getLeaves_old` trap in guard form.

- [ ] Resolve the duplicate class names first, deleting the three unreferenced
      standalone files
- [ ] Then delete or deliberately wire `AdminKeysGuard` with a constant-time compare
- [ ] Document which mechanism is canonical for which caller

### F9 No audit trail on privileged mutations (high)

`suspendAgent`, `toggleBlockBuyer`, `approveWithdrawal`, `rejectWithdrawal`,
and `markCommissionPaid` change account and money state with no record of the
acting admin. In an incident you cannot answer "who approved this withdrawal".

**F9's premise was wrong and is corrected here.** An `audit_log` table has
existed since migration 0000
(`persistence/schemas/audit_log.schema.ts`, columns `id, admin_id, action,
entity_type, entity_id, notes, created_at`). A grep for `audit_log` across `src/`
returns the schema, its index export, and migration artifacts. **Nothing writes
to it.** So the gap was never the DDL, it was the write path. The original
wording sent the next reader off to build a table that already existed.

**Status: foundation built 2026-08-09, nothing wired yet.** Added
`admin_audit_log` (richer than the orphan: jsonb `details`, `ip_address`,
`user_agent`, indexes on actor, resource and time) in migration
`0005_parallel_lady_mastermind`, generated but **not yet applied**, plus an
`AuditLogService` whose writes are try/caught so an audit failure can never take
down the request it is recording.

**Decision taken: keep `admin_audit_log`, drop the orphan `audit_log`.** Two
audit tables is worse than either one alone, and the orphan has no writers, no
rows, and no `ip`/`user_agent`/structured-detail columns, so nothing is lost.
The drop needs its own migration and should land before any write path is wired,
so the choice is never ambiguous to a reader.

- [x] Add an `admin_audit_log` table: actor id, action, target, details, timestamp
- [ ] Apply migration 0005
- [ ] Drop the orphaned `audit_log` table in migration 0006
- [ ] Write to it from every mutating admin path. This is the actual finding, and
      it is untouched. Do it before Phase 4 splits the controller into eight
      files, per the "Key decisions" note.

### F10 Inconsistent response shapes (medium)

`POST /admin/api-keys` returns `{key, keyId}` while every other create returns
`{id}`. This is not theoretical: during the audit it caused a cleanup call
reading `data.id` to silently no-op and leave a live API key active until it
was caught and revoked manually.

- [ ] Standardise identifier naming across create responses
- [ ] Standardise the envelope, since some handlers return `{message, data}` from the service and others rely on an interceptor

### F11 Revoked API keys are still listed (low)

`GET /admin/api-keys` returns inactive keys with no filter parameter. Revoke is
a soft delete setting `is_active: false`.

**Status: fixed and runtime-verified 2026-08-09.** `listApiKeys` takes an
optional tri-state `is_active` and hides revoked keys when it is absent.
Verified: the default list returns none of the four revoked keys,
`?is_active=false` returns all four, `?is_active=notabool` returns 400.

History kept because it cost time twice. The change that
landed first added `is_active` to the _revoke_ predicate
(`admin-api-keys.service.ts:130`), so re-revoking a revoked key now 404s instead
of reporting success. That is the second bullet of **F30**, not F11. `listApiKeys`
is untouched: it still selects every key for the admin with no `is_active`
filter, which is exactly what F11 describes.

Lesson, same shape as the `getLeaves_old` trap: a fix that touches the same table
as a finding is not a fix for that finding. Match the fix to the assertion.

- [ ] Add an `is_active` filter, or exclude revoked keys by default

### F12 Pagination is the exception, not the rule (medium)

Only `orders` and `buyers/:id/wallet/transactions` paginate. Unbounded:
`agents`, `buyers`, `withdrawals`, `products`, `leads`, `stock/requests`,
`categories`, `outreach`, `api-keys`, `kyc`. The frontend then filters and
searches in memory (`agents.tsx` via `useMemo`), which is fine at 50 rows and
fails at 5000.

- [ ] Shared pagination DTO applied to every list endpoint
- [ ] Server-side search and filter
- [ ] Move the frontend off in-memory filtering

### F13 Duplicate write paths to the same resources (medium)

`/api/v1/catalog/products` (POST, PATCH, DELETE, GET) exists alongside
`/api/v1/admin/products`, and `/api/v1/catalog/stock-requests` alongside
`/api/v1/admin/stock/requests`. Two ways to mutate the same tables, with F2
proving the admin path is already wrong. Divergent validation is likely.

- [ ] Decide which is canonical
- [ ] Delete or delegate the other so there is one write path per resource

### F14 Mixed data access inside one service (low)

`createProduct` and `listProducts` use raw `db.execute(sql...)`; `updateProduct`
uses the Drizzle query builder against `schema.productsTable`. The raw SQL path
is exactly where F2's dropped columns hide, because raw SQL gets no help from
the schema types.

- [ ] Standardise on the query builder unless raw SQL is genuinely required

### F15 No typed admin API client (high, architectural)

`packages/api-client` covers only `auth` and `buyer/cart`. Each of the 7 admin
pages redefines the backend's snake_case shape locally (`ApiAgent`,
`ApiAdminStats`) and hand-maps it (`mapAgent`, `mapStats`). `apiFetch` ends
with `(json as { data: T }).data`, an unchecked cast with no runtime
validation.

Consequence: backend drift produces `undefined` at runtime instead of a build
error, and one shape is defined in several files with no source of truth. This
also violates the shared-types rule in `Context.md`.

- [ ] `packages/api-client/src/services/admin/`, one module per domain
- [ ] Zod-validated responses at the boundary
- [ ] camelCase types exported from the package index
- [ ] Delete the per-page `ApiXxx` interfaces and mappers

### F17 measure_value is stored as text but typed as a number everywhere (high)

The column is `text()`, every layer above it says number, and the code already
pays for the mismatch:

| Layer                 | Declares                                 | Reference                  |
| --------------------- | ---------------------------------------- | -------------------------- |
| Postgres column       | `text()`                                 | `product.schema.ts:12`     |
| Create/update DTO     | `z.number().int().min(0)`                | `create-product.dto.ts:16` |
| Service write         | coerces with `String(dto.measure_value)` | `admin.service.ts:916`     |
| Frontend `ApiProduct` | `measure_value: number`                  | `products.tsx:55`          |
| Frontend read         | `String(p.measure_value)`                | `products.tsx:198`         |
| Frontend submit       | `parseInt(form.measure_value, 10)`       | `products.tsx:249`         |

The round trip is number, `String()`, text column, string, `String()` again,
`parseInt`. Two conversions exist only to service the wrong column type, and the
frontend annotation `measure_value: number` is false at runtime because the API
returns a string. Any consumer doing arithmetic on it gets string concatenation.

This must be fixed before Phase 3, because Phase 3 derives frontend types from
the Drizzle schema. Left alone, it would generate `string` into the shared
contract and make the lie permanent.

**Status: backend fixed and runtime-verified, frontend NOT done.** The column is
`integer()` as of migration `0004` and the API returns `typeof number`. The
frontend still round-trips it through a string, so the redundant conversions are
now pure noise rather than load-bearing.

- [x] Migrate `measure_value` to `integer`
- [x] Drop the `String()` coercion at `admin.service.ts:916`
- [ ] Drop the redundant `String()` and `parseInt` in `products.tsx`
      (`products.tsx:198` and `:249` are still there, and `:69` still types the
      form field as `string`)

### F18 weight_grams is an orphan column (low)

`weight_grams: integer()` exists in the table (`product.schema.ts:14`) and its
type is correct, but it appears in neither the create nor the update DTO and
nowhere in the frontend. Nothing writes it and nothing reads it.

**Status: backend fixed and runtime-verified, frontend NOT done.** Decision was
to keep the column. `weight_grams` is in both DTOs and persists on create and
update, but no input for it exists in the admin product form, so it is still
unsettable through the UI.

- [x] Shipping weight plausibly matters for delivery pricing, so confirm the
      commercial intent before dropping (kept)
- [x] Add to both DTOs
- [ ] Add the field to the product form in `products.tsx`

### F19 Pagination meta never reaches the client (high)

`getAllOrders` returns `meta: { total, page, limit, pages }` as a sibling of
`data`, but `api-response.interceptor.ts:46` lifts only `message` and `data`
out of the wrapped payload. `meta` is silently discarded.

The count query is also unfiltered:

```ts
const [{ total }] = await this.db
  .select({ total: count() })
  .from(schema.orders);
```

No `.where()`, so `total` reports every order regardless of the filters applied
to the rows. It stayed at 25 for every filtered query during testing.

The two paginated endpoints also disagree on convention, which is why only one
of them works:

```ts
// orders: meta is a SIBLING of data, so the interceptor drops it
return { message, data: rows, meta: { total, page, limit, pages } };

// wallet transactions: pagination is NESTED inside data, so it survives
return {
  message,
  data: { wallet, transactions, pagination: { page, limit, total } },
};
```

Row-level paging itself is correct on both: pages of 10/10/5 over 25 rows, 25
unique ids, no duplicates and no skips, limit clamped at 100.

**Status: the reported defect is fixed and runtime-verified. The convention split
is not.** `meta` now survives the interceptor and the count query shares the row
query's WHERE. The two endpoints still disagree on envelope shape: orders returns
a sibling `meta`, wallet transactions still nests `pagination` inside `data`
(`admin.service.ts:778`). Settle that in Phase 3, where the response contract is
centralised, rather than churning it twice.

- [ ] Decide one envelope convention for paginated responses (deferred to Phase 3)
- [x] Apply the filters to the count query
- [x] Either carry `meta` through the interceptor or nest it inside `data`

### F20 Withdrawal approval records no actor and no timestamp (high)

`approveWithdrawal` does `.set({ status: "approved" })` and nothing else. It
sets neither `processed_at` nor `processed_by`, and the method takes only `id`,
so the controller has no way to pass an admin id even if it wanted to. `reject`
sets both correctly, so the two paths disagree.

This is F9 landing on a money path: there is no way to answer who approved a
payout.

**Status: fixed and runtime-verified 2026-08-09.** Approve stamps both fields,
and `getWithdrawals` now projects `processed_by`, so the actor is both recorded
and visible where an admin actually reads it. Verified: the list carries the key.

- [x] Set `processed_at` and `processed_by` on approve
- [x] Add `processed_by` to the withdrawals list projection

### F21 The reject guard is internally inconsistent (medium)

`rejectWithdrawal` accepts status `pending` **or** `approved`, but its UPDATE
guards on `isNull(processed_at)`. Because F20 leaves `processed_at` NULL on
approve, reject-after-approve happens to work today for API-approved rows and
fails for any row that has a real `processed_at`.

Fixing F20 will therefore break approve-to-reject unless this guard is fixed in
the same change. The two findings are coupled.

**Status: fixed and runtime-verified.** Approve then reject returns 200.

- [x] Guard on `status`, consistently with the precondition, not on `processed_at`
- [x] Fix together with F20

### F22 Commissions can be marked paid but never listed (medium)

The only registered commission route is `PATCH /admin/commissions/:id/paid`.
There is no list or detail endpoint, so commission records are unreachable
through the admin API and the seeded 15 cannot be inspected.

- [ ] Add a commissions list endpoint with filters
- [ ] Add the corresponding admin UI to the Phase 6 list

### F23 Query parameters are unvalidated and 500 on bad input (medium)

Distinct from F5, which covers request bodies. Confirmed cases:

| Request                                            | Result                | Expected |
| -------------------------------------------------- | --------------------- | -------- |
| `GET /admin/orders?status=bogus`                   | 500                   | 400      |
| `GET /admin/agents?status=bogus`                   | 500                   | 400      |
| `GET /admin/orders?page=-1`                        | 500                   | 400      |
| `GET /admin/buyers/:id/wallet/transactions?page=0` | 500                   | 400      |
| `?page=abc&limit=xyz`                              | 200, limit ignored    | 400      |
| `?is_suspended=notabool`                           | 200, coerced to false | 400      |

Two mechanisms: enum query params are typed with a compile-time-only union and
cast, so any string reaches the SQL layer; and `offset = (page - 1) * limit` is
never floored at zero, so a negative page produces a negative SQL OFFSET
(`admin.service.ts:473` and `:731`).

**Status: fixed and runtime-verified for the admin surface.** All six rows above
now return 400. `query.helper.ts` provides `parseOptionalBoolean`,
`parseOptionalEnum` and `parsePagination`; they are wired into the orders, agents,
buyers, wallet and KYC handlers. The rest of the API outside `v1/admin` is
untouched, which is what Phase 5 sweeps.

- [x] Zod DTO for every query param, including enums and pagination (admin only;
      the wider sweep is Phase 5)
- [x] Clamp page to a minimum of 1 and limit to a sane maximum

### F24 GET /admin/buyers silently hides suspended buyers (high)

`admin.controller.ts:425` passes `isSuspended === "true"`. With the parameter
absent that expression is `false`, never `undefined`, so the service guard at
`:584` is always taken and always appends `eq(is_suspended, false)`.

The unfiltered buyer list therefore excludes suspended buyers, returning 4 of 5
seeded buyers while `GET /admin/dashboard` reports `total_buyers: 5`. Two admin
screens disagree about how many buyers exist, and the suspended one is
invisible to moderation.

`?is_blocked=true` is accepted and then ignored entirely; `getBuyers` has no
such parameter.

**Status: fixed and runtime-verified 2026-08-09.** All three items done.
Verified: `?is_suspended` gives 5 / 1 / 4 for absent / true / false;
`?is_blocked=true` gives 1 and `=false` gives 4, which sums to the 5 seeded
buyers; `notabool` gives 400 on both; and `GET /admin/buyers/45` now carries
`is_suspended`.

- [x] Parse tri-state booleans properly: absent, true, false
- [x] Implement `is_blocked` rather than ignoring it
- [x] Add `is_suspended` to the buyer detail projection

### F25 GET /admin/kyc only ever returns submitted (medium)

`getPendingKyc()` takes no arguments and hardcodes
`.where(eq(kyc_status, "submitted"))`. The `?status` query is silently ignored,
so approved, rejected and not_submitted agents are unlistable and there is no
KYC history view despite the route being named `/admin/kyc`.

`kyc_status` and `bank_code` are also absent from both the agent list and agent
detail projections, so KYC state and the effect of the bank-code backfill are
unobservable through the API.

**Status: fixed and runtime-verified.** `getPendingKyc` takes a `kyc_status`
filter validated through `parseOptionalEnum`, defaulting to `submitted` when
absent so existing callers keep their behaviour. `kyc_status`, `bank_code` and
`bank_name` were added to the agent list projection.

Verified: `?kyc_status=submitted` returns 2, `?kyc_status=approved` returns 3,
`?kyc_status=bogus` returns 400 naming the four legal values, and
`GET /admin/agents` carries all three new keys.

- [x] Accept a status filter
- [x] Add `kyc_status` and `bank_code` to the agent projections

### F26 RETRACTED, not a defect

Originally recorded as "Swagger documents field names the DTOs reject". It is
wrong. The `@ApiBody` blocks are correct and match the DTOs:
`promote-manager` requires `managed_state` (controller line 318) and
`kyc` requires `action` (line 835).

How the false finding happened, kept as a caution:

1. The first sweep invented request bodies `{state}` and `{status}` by
   guesswork rather than reading the `@ApiBody` blocks.
2. Those same wrong names were then written into a test brief.
3. The resulting 400s were reported as "documented bodies rejected", where
   "documented" meant the brief, not Swagger.
4. The claim was then "confirmed" by reading the DTOs, which only established
   what the correct field names are. It never established what Swagger said.

Two lessons. Confirming half a claim is not confirming the claim. And when a
request fails, check your own test data against the contract before recording a
defect against the code.

### F27 POST /admin/outreach rejects every payload (high)

`@UsePipes(new ZodValidationPipe(createOutreachSchema))` at
`admin.controller.ts:737` is method-level, so it validates **every** handler
parameter, including `@CurrentUser() user: JwtPayload`. The JWT payload is
checked against the outreach schema, fails, and the endpoint returns 400 for
every request including valid ones. The endpoint is unusable.

This corrects an earlier note in this document claiming the DTO had no pipe and
only compile-time validation. The pipe exists; it is over-applied. A `{}` probe
returning 400 was also mistaken for correct validation in the first sweep.

**Status: fixed and runtime-verified.** A valid payload returns 201 and `{}`
returns 400.

The mechanism, which is not obvious and is the whole of this finding: Nest does
not run pipes on `@Req()`, `@Res()` or `@Next()`, but it does run them on
`@Body`, `@Query`, `@Param`, `@Headers`, `@Ip` and on **custom decorators built
with `createParamDecorator`**. The outreach handler broke because `@CurrentUser()`
is a custom param decorator (`shared/decorators/current-user.decorator.ts`), so
the JWT payload was validated against the outreach schema and always failed.

The rule for review: a method-level `@UsePipes` is safe only while every
parameter is `@Body`, `@Req`, `@Res` or `@Next`. Adding a `@CurrentUser()`,
`@Param()`, `@Query()`, `@Headers()` or `@Ip()` to such a handler breaks it
silently at runtime with no compile error. Binding the pipe to `@Body()` removes
the hazard entirely, which is why that is the pattern to prefer.

**The first audit of this was wrong and was recorded here as clean. It was run
with `grep -rn "@UsePipes" | head`, which silently truncated 19 matches to 10 and
hid every instance outside `auth`, `contact` and `admin`.** The correct sweep is
F31 below. Never pipe an audit grep through `head`.

- [x] Move the pipe to the `@Body()` parameter
- [x] Audit every other `@UsePipes` for the same over-application. Redone
      properly; the result is F31, not "clean".

### F28 Deactivated categories stay in the tree (medium)

`DELETE /admin/categories/:id` soft-deletes by design, but
`GET /admin/categories` calls `getTreeResponse(false)`, which includes inactive
nodes. A category returns 200 from delete and remains visible in the tree, so
the delete looks broken from the client's point of view. Root count went 3 to 4
after a successful delete during testing.

**Decision taken 2026-08-09: this is not a backend defect. Keep returning
deactivated nodes to the admin tree.** An admin who cannot see a deactivated
category cannot reactivate it, and since `deactivateCategory` is a soft delete by
design, hiding them would strand rows with no route back. `getTree(false)`
already exposes `is_active` per node, so the API gives the client everything it
needs to tell them apart.

What is actually missing is a reactivate endpoint and a frontend that reads the
flag. Both are UI work, so this moves to Phase 6 rather than Phase 1. The buyer
facing tree must keep excluding them; only the admin tree shows both.

- [x] Decide whether the admin tree shows deactivated nodes. Yes, with `is_active`
      already on each node.
- [ ] `PATCH /admin/categories/:id/reactivate` (Phase 6)
- [ ] Frontend: render deactivated nodes muted, with a reactivate action, and
      stop offering them as a parent for new products (Phase 6)

### F29 Some settings are hardcoded service fallbacks (low)

`buyer_referral_discount_kobo` and `buyer_referral_discount_type` are returned
from hardcoded fallbacks in the service (`admin.service.ts:1004-1009`) rather
than rows in `system_settings`. `GET /admin/settings` presents them exactly
like the real stored `agent_commission_rate`, so they look editable and are not.

- [ ] Store them as real settings rows, or mark them read-only in the response

### F30 Miscellaneous confirmed defects (low)

**Status: five of six done. The sixth needs a product decision, not code.**

- [x] `PATCH /admin/agents/:id/target` accepts a negative target and persists it.
      No lower bound. **Fixed and verified:** `setAgentTarget` throws
      `BadRequestException` below zero.
- [x] Re-revoking an already-revoked API key returns 200; the where clause omits
      `is_active`. **Fixed and runtime-verified:** revoke twice gives 200 then 404.
      Note this was previously filed against F11 by mistake; F11 is about the
      _list_, not the revoke, and is now fixed separately.
- [x] Revoked keys carry no `revoked_at`, only `is_active: false`. **Fixed:**
      column added in migration 0006 and stamped on revoke.
- [x] `POST /admin/upload` with no file returns 500 from an unguarded `file.buffer`.
      **Fixed and runtime-verified:** the param is optional and guarded at
      `admin.controller.ts:137`. With no file it returns 400
      `"No file uploaded under the 'file' field."` Note this covers only the missing
      file case; the Phase 0 item for uploading a real multipart file is still open.
- [ ] `promote-manager` applies no uniqueness or demotion check, so two agents can
      both be manager of the same state. Business rule needs confirming. **Blocked on
      a product decision, do not change it unprompted.**
- [x] Decorative comment separators (`// ─── Section ───`), against the
      `// === Section` convention in this repo's own standard. **Fixed:** 66
      converted across 9 files, wider than the 21 originally counted in the admin
      files alone. `main.ts`, `agent.controller.ts`, `email.service.ts`,
      `models.ts` and three e2e specs carried them too. Bare rules with no title
      were deleted rather than converted, since a separator with nothing to
      separate is decoration. Done now rather than parked until Phase 4: it is a
      comment-only change, so it cannot conflict with a later restructure.

### F31 The F27 pipe bug also broke the entire buyer checkout (critical)

Found 2026-08-09 while re-auditing F27 properly. F27 was recorded as an
admin-only defect and its audit was recorded as clean. Both were wrong. The same
over-applied `@UsePipes` pattern was live on **seven** handlers outside the admin
surface, six of them on the buyer money path.

| Handler              | Route                                     | Extra param that broke it |
| -------------------- | ----------------------------------------- | ------------------------- |
| `createOrder`        | `POST /buyer/orders`                      | `@CurrentUser`            |
| `payOrder`           | `POST /buyer/orders/:id/pay`              | `@CurrentUser`, `@Param`  |
| `cancelOrder`        | `POST /buyer/orders/:id/cancel`           | `@CurrentUser`, `@Param`  |
| `requestRefund`      | `POST /buyer/orders/:id/refund`           | `@CurrentUser`, `@Param`  |
| `payWithMobileMoney` | `POST /buyer/orders/:id/pay/mobile-money` | `@CurrentUser`            |
| `initializePayment`  | `POST /buyer/orders/initialize-payment`   | `@CurrentUser`            |
| `initiateRefund`     | `POST /payment/refund`                    | `@CurrentUser`            |

Reproduced before the fix: `POST /buyer/orders/999999999/cancel` with the valid
body `{"reason":"probe of pipe scope"}` returned **400**
`reason: expected string, received undefined`. That message is the giveaway. The
schema was being run against the JWT payload, which has no `reason`, so a correct
request was rejected while reporting a problem with the caller's input.

**Status: fixed and runtime-verified.** Every handler now binds its pipe to
`@Body()`. The same probe returns 404 "Order not found", and a genuinely invalid
body `{"reason":"no"}` still returns 400 "Too small". Both directions checked,
because a fix that stops validating is not a fix.

- [x] Move all seven pipes to `@Body()`
- [x] Drop the now-unused `UsePipes` import from `order.controller.ts`
- [ ] Add a regression test per route. Static analysis found this, and nothing in
      the type system or the test suite would have.

How it hid for so long: `ZodValidationPipe.transform` takes only `value` and
ignores the `ArgumentMetadata` second parameter, so it cannot tell a body from a
JWT payload and validates whatever it is handed. Adding a
`metadata.type === "body"` guard there would make the whole class of bug
impossible rather than fixing it one handler at a time. Worth doing in Phase 5.

### F35 BuyerController silently shadows OrderController (high)

Found 2026-08-09 while pointing the landing shop at a working checkout.

`buyer.module.ts:28` registers `BuyerController` **before** `OrderController`.
`BuyerController` is `@Controller("buyer")` with `@Post("orders")` and
`@Post("orders/initialize-payment")`. `OrderController` is
`@Controller("buyer/orders")` with `@Post()` and `@Post("initialize-payment")`.
Both resolve to the same two paths, and Nest matches in registration order, so
**BuyerController wins and OrderController's create and initialize handlers are
unreachable**.

This is F13 made concrete, and it is worse than "two ways to do the same thing":
the two implementations had diverged in a way that matters.

|              | `OrderController` (dead)             | `BuyerController` (live)            |
| ------------ | ------------------------------------ | ----------------------------------- |
| Pricing      | trusted `price_kobo` from the client | re-priced from the product table    |
| Zone         | required in the body                 | falls back to the buyer's zone      |
| Handling fee | not applied                          | applied                             |
| Order items  | inserted in a loop, no transaction   | single insert inside a transaction  |
| Validation   | `ZodValidationPipe`                  | raw `.parse()`, so 500 on bad input |

So the dead implementation had a **client-controlled pricing bug** and the live
one did not. Anyone auditing by reading `order.controller.ts`, which is the file
whose name matches the route, would have concluded the platform could be robbed.
Anyone testing the live endpoint would have found it safe. Both would have been
right about the file they looked at and wrong about the system.

Verified after the fixes below: `POST /buyer/cart/quote` with
`{product_id: 1, qty: 2, price_kobo: 1}` returns `itemsTotalKobo: 8400000`,
which is 2 x the real 4,200,000 from the table. The claimed price is discarded.

- [x] Bind `initializeOrderPaymentSchema` to `@Body()` via `ZodValidationPipe` on
      the live handler. It used a raw `.parse()`, so a bad `delivery_time`
      returned 500. Now 400 naming the field.
- [x] Harden `OrderService.createOrder` to price from the product table too.
      It is currently unreachable, but a one-line change to the `controllers`
      array in `buyer.module.ts` would put it back in front of live traffic with
      the pricing bug intact. Defence in depth until the duplicate is deleted.
- [ ] Delete the shadowed handlers from `OrderController`, or fold the two
      controllers together. Until then the route table does not match the file
      layout, which is exactly how this hid.
- [ ] Audit the other controllers for the same collision. `buyer.module.ts`
      registers five controllers and two of them overlap; nothing proves the rest
      do not.

**Testing note:** seeded buyers use the `@seed.test` domain, and Paystack rejects
that with `"Invalid Email Address Passed"` before the transaction is created. A
checkout probe that reaches Paystack and fails on the email has passed everything
this codebase controls. Use `/buyer/cart/quote` to assert on pricing, since it
runs the same `priceBasket` path without calling Paystack.

### F34 No role enforcement outside the admin controller (high)

Audited 2026-08-09 while scoping F7, because "what breaks if the keys go" turns
out to depend entirely on what else is being enforced.

`AdminController` is the only controller in the codebase carrying `RolesGuard`
and `@Roles("admin")`. Every other protected controller uses `AuthGuard` plus a
key guard and nothing else. `AuthGuard` proves _a_ valid JWT, not _which kind_.
So on paper, a buyer's token satisfies every guard on `/agent/*`, and an agent's
token satisfies every guard on `/buyer/*`.

**Two things stop this from being an active breach today, and neither is a
deliberate control:**

1. **Ownership is derived, never accepted.** `agent.controller.ts` contains zero
   `@Param` decorators; all 25 routes resolve the subject from `@CurrentUser()`.
   The buyer routes that do take an `:id` pass `user` into the service alongside
   it, so scoping happens at the query. This part of the design is genuinely
   sound and should not be disturbed.
2. **Wrong-role requests tend to fall through to a lookup that finds nothing.** A
   buyer calling an agent route resolves to a `user_id` with no `agent_profiles`
   row and gets a 404.

That is failing safe by accident rather than by design. It holds only while every
service keeps deriving identity and never trusts a caller-supplied id, and
nothing in the type system or the tests enforces that. The first route that takes
an id without a user, or the first service that looks up by something other than
`sub`, turns a latent problem into a real one.

Note this is the opposite shape to F7. F7 is a control that looks like security
and is not. F34 is real security that exists only as a side effect.

**Status: fixed and runtime-verified 2026-08-09.** Role separation is now an
explicit control rather than an emergent property.

| Probe                                     | Result |
| ----------------------------------------- | ------ |
| buyer token to `GET /agent/wallet`        | 403    |
| buyer token to `GET /agent/commissions`   | 403    |
| agent token to `GET /buyer/orders`        | 403    |
| agent token to `GET /buyer/notifications` | 403    |
| buyer token to `GET /buyer/orders`        | 200    |
| agent token to `GET /agent/wallet`        | 200    |
| no token to `GET /agent/leaderboard`      | 200    |

Both directions were checked deliberately. A role guard that rejects everything
passes the first four rows and is still broken, so the last three matter as much.

**One implementation detail that will bite whoever touches this next.** Guards run
global, then controller, then method. `AgentController` applies `AuthGuard` per
route, not on the class, so a controller-level `RolesGuard` would evaluate
`request.user` before `AuthGuard` had set it and reject every request. So on the
agent controller `RolesGuard` is appended to each route's guard array, after
`AuthGuard`, and `@Roles("agent")` sits on the class as metadata only. The four
buyer-side controllers guard at class level already, so both go on the class
there.

The two public agent routes, `POST /agent/apply` and `GET /agent/leaderboard`,
have no `@UseGuards` at all, so `RolesGuard` never runs on them and the
class-level metadata cannot reach them. That is why they needed no override, and
why a future route added to this controller without `@UseGuards` will be public
by default. Worth revisiting as a deny-by-default arrangement.

- [x] Add `RolesGuard` and an explicit `@Roles(...)` to every protected
      controller: `@Roles("agent")` on agent, `@Roles("buyer")` on buyer, orders,
      wallet, notifications
- [x] Decide the rule for routes that legitimately serve several roles. There were
      none. Every protected route serves exactly one role, so each got a single
      role rather than a list. Revisit if admin-impersonates-buyer support is ever
      needed.
- [ ] Add a test that a buyer token is rejected by an agent route and vice versa.
      Verified by hand above, but nothing enforces it in CI yet. This is the
      assertion that keeps the property true.

### F33 The four privileged payment routes are unreachable (high)

`createSubaccount`, `payout/run-weekly`, `payout/:withdrawalId` and `refund` on
`PaymentController` carry `@UseGuards(PaymentKeysGuard)` and nothing else.

That guard is the `keys.guard.ts` version, constructed with `requireJwt: true`,
so its first act is `if (!request.user) throw new ForbiddenException("Missing JWT
token")`. `request.user` is populated by `AuthGuard`, and **`AuthGuard` is not
applied to these routes**. `ThrottlerGuard` is the only global guard
(`app.module.ts:82`), so nothing else fills it in either.

Verified 2026-08-09, all three cases return 403 `"Missing JWT token"`:

| Request                                               | Result |
| ----------------------------------------------------- | ------ |
| no keys, no JWT                                       | 403    |
| correct `X-Payment-Key` and `X-Payment-Key_2`, no JWT | 403    |
| correct keys **and** a valid admin bearer token       | 403    |

**They are dead, not exposed.** An earlier note in this session called them
publicly triggerable; that was reasoning from the guard list without testing, and
it was wrong. The static keys never get evaluated because the JWT check fails
first.

What that costs today:

- No on-demand payout. `PayoutService.runWeeklyPayouts` is also a `@Cron` job, so
  the Friday 09:00 sweep still runs in-process and agents do get paid. But the
  manual catch-up route the service comment says exists "so a missed Friday can be
  caught up" cannot be called.
- No admin-initiated refund through the API.
- No subaccount creation through this route, which is a prerequisite for paying
  an agent at all (`processWithdrawal` rejects an agent with no
  `paystack_subaccount_code`).

**Status: fixed and runtime-verified 2026-08-09.** All four now use
`@UseGuards(AuthGuard, RolesGuard)` + `@Roles("admin")`, matching
`AdminController`, and `PaymentKeysGuard` is gone from this controller.

| Probe                                         | Result                         |
| --------------------------------------------- | ------------------------------ |
| admin to `POST /payment/payout/run-weekly`    | 200, `{attempted: 0, paid: 0}` |
| admin to `POST /payment/subaccount/38`        | 201, real subaccount created   |
| admin to `POST /payment/payout/999999`        | 404 "Withdrawal not found"     |
| admin to `POST /payment/refund` with `{}`     | 400 naming `order_id`          |
| buyer to `POST /payment/payout/run-weekly`    | 403                            |
| no token to `POST /payment/payout/run-weekly` | 401                            |

Reachability was the assertion, so the 404 and the 400 are passes: the request
reached the service and was rejected on its merits rather than at the door.

**This was not only a latent problem.** `apps/debridgers-frontend/app/routes/
dashboards/admin/payouts.tsx:216` already calls `POST /payment/payout/run-weekly`.
That button has been returning 403 for every admin who pressed it. Whoever built
the page had no way to tell the guard was misconfigured rather than their own
call being wrong.

`processWithdrawal` and `initiateRefund` take `@CurrentUser() admin` and pass
`admin.sub` into the service. That plumbing was written all along and was
receiving `undefined`; it started working the moment `AuthGuard` was applied.

- [x] `@UseGuards(AuthGuard, RolesGuard)` + `@Roles("admin")`
- [x] Drop `PaymentKeysGuard` from these four routes
- [x] Re-test all four for reachability
- [ ] These are exactly the paths F9's audit log exists for. Wire them when F9's
      write path lands.
- [ ] `POST /payment/initialize` still has **no guard at all**, not even the keys.
      It is called from `landing/shop.tsx:138`, so it may be intentional for guest
      checkout. Confirm the intent before changing it; if guests are meant to
      reach it, it needs rate limiting and an amount check rather than a guard.

### F32 admin_api_keys.admin_id is a serial, not a foreign key (high)

`admin_api_keys.schema.ts:13` declares `admin_id: serial("admin_id").notNull()`
with the trailing comment `// References users.id`. It references nothing. This
is F3's shape again: a comment asserting a constraint that the schema does not
have.

Two consequences, the second is a security issue:

- `serial` carries its own sequence default, so an insert that omits `admin_id`
  silently receives the next sequence value instead of failing. The key is then
  owned by whatever user id that number happens to hit.
- There is no FK and nothing cascades, and `validateApiKey`
  (`admin-api-keys.service.ts:76`) checks only the key's own `is_active`, never
  the state of the owning user. **A removed, blocked or suspended admin's API
  keys keep authenticating indefinitely** unless the removal path happens to
  deactivate them by hand.

Pairs with F11: revoked keys are still listed, and now orphaned keys still work.

- [ ] Change `admin_id` to `integer` with a real FK to `users.id`, in a migration
- [ ] Decide the on-delete behaviour, consistent with the F3 reasoning
- [ ] Make `validateApiKey` join the owning user and reject inactive owners
- [ ] Audit existing rows for `admin_id` values that hit no real user

### F16 Migration numbering collision (resolved 2026-08-09, keep the rule)

`feature/frontend-develop` and `develop_backend` both created a migration
numbered `0002`. Resolved by keeping both and renumbering ours to
`0003_famous_scalphunter` with its content byte-identical so its hash is
preserved.

The rule that makes this dangerous, from `drizzle-orm` `pg-core/dialect.js:62`:

```js
if (!lastDbMigration || Number(lastDbMigration.created_at) < migration.folderMillis) {
```

Drizzle applies a migration only when its timestamp is newer than the single
most recently applied row, and **ignores hashes entirely for that decision**. A
migration whose `when` is older than what is already applied is skipped
silently and permanently, with no error.

That is exactly what had happened locally: the `attempts` migration was applied
at `1786212528031` while the payments migration was `1786212321006`, so
`payments` would never have been created. Fixed by applying the payments SQL and
recording it in order.

- [x] Journal renumbered, timestamps monotonic, `drizzle-kit generate` reports no drift
- [x] Local DB reconciled, 4 rows in order, `payments` present
- [ ] Agree a convention: after any merge touching migrations, verify timestamps
      are ascending and `db:generate` reports no changes before starting the backend

## Phases

Ordering rationale is in "Key decisions" below. Do not reorder Phase 3 ahead of
or behind its neighbours without reading that section.

### Phase 0 Live endpoint matrix

Establish what actually works before changing anything.

- [x] Enumerate all admin routes from Swagger
- [x] Unauthenticated sweep, confirm every route is guarded
- [x] Authenticated read sweep of all 16 GET endpoints
- [x] Not-found sweep across 28 parameterised endpoints
- [x] Settings round-trip and API key lifecycle
- [x] Seed realistic data
- [x] Re-run the full sweep against seeded data, four domains in parallel
- [x] Record the findings in this document (F19 to F30)
- [ ] `POST /admin/upload` with a real multipart file

**Outcome: 30 findings, roughly 45 WORKS / 21 BROKEN / 17 SUSPECT across 66
probes.** Auth is the strongest area (48/48 guarded). Input validation and
"did the write actually happen" are the weakest.

Lesson for re-runs: verify the right property. A check that asked only whether
the hardcoded category ids existed in the tree passed on all 16 and wrongly
concluded F1 was fixed. The ids exist; they are the wrong nodes. Assert against
the computed leaf set, not mere existence. Similarly, three separate endpoints
returned 400 for reasons that were recorded as "correct validation" and were
actually F26 and F27.

**Achieves:** a factual baseline separating "broken" from "works but has no UI",
and a regression baseline for Phases 3 to 5.

### Phase 1 Fix what is broken

Only the defects above. No refactoring in the same commits.

Closed, fixed and runtime-verified:

- [x] F1 hardcoded category leaves
- [x] F2 createProduct dropping fields, bar a regression test
- [x] F3 FK on `category_id`
- [x] F4 false success responses
- [x] F5 zod 500s
- [x] F21 the coupled reject guard
- [x] F23 query param validation and offset clamping
- [x] F27 outreach pipe misapplied, endpoint was fully unusable

Written and typechecked, awaiting runtime verification:

- [x] F6 backfill-bank-codes returns 503
- [x] F25 KYC status filter and the missing agent projections

Also closed and verified since:

- [x] F11 revoked keys hidden unless `?is_active=false`
- [x] F20 withdrawal actor, stamped and projected
- [x] F24 tri-state parse, `is_blocked` filter, `is_suspended` on buyer detail
- [x] F28 decided: keep deactivated nodes in the admin tree. The remaining work
      is a reactivate endpoint and UI, both moved to Phase 6.

- [x] F17 `measure_value` to `integer`, backend and frontend. The form holds it
      as a string because an input yields a string; that conversion is the form
      boundary, not the redundancy the finding described.
- [x] F18 `weight_grams` in both DTOs and in the product form
- [x] F22 commissions list endpoint with filters and pagination
- [x] F29 `buyer_referral_*` materialised as real rows, and writes validated
- [x] F30 five of six, see its entry

**Phase 1 is complete except one item, which is a decision rather than code.**

- [ ] **F30, `promote-manager` uniqueness.** Two agents can be manager of the
      same state. Whether that is a defect depends on a business rule nobody has
      stated. Needs an answer before any code moves, so it is not "remaining
      work" in the usual sense.

Deliberately moved rather than dropped:

- **F19's envelope split to Phase 3.** The reported defect is fixed and
  verified. Standardising the orders-versus-wallet response shape belongs with
  the phase that centralises response contracts, or it gets done twice.
- **F28's reactivate endpoint and UI to Phase 6.** The decision was taken here;
  the remaining work is a route plus a screen.
- **F2's round-trip regression test to Phase 5.** There is no test harness for
  this yet, and adding one for a single assertion pre-empts the validation
  sweep that will want it anyway.
- ~~F26 Swagger bodies that contradict the DTOs~~ **retracted, not a defect.**
  Read its entry before re-testing `promote-manager` or `kyc`, and do not
  "fix" them.

Order for what remains: verify F6 and F25 first, since they are written and a
failure there changes the plan. Then F20's list projection and F24's two items,
which are the remaining cases of an admin being shown wrong or missing data.
F17 and F18's frontend halves pair naturally with the Phase 6 products work.
F11 is small and self-contained. F28 and F30's `promote-manager` bullet both
need a product decision before any code moves.

The schema changes in F3, F17, and F18 landed as one migration,
`0004_classy_virginia_dare`, applied. It needed a hand-edit: drizzle-kit emits a
bare `SET DATA TYPE` and Postgres will not cast text to integer without `USING`.
Expect to hand-edit any future type-change migration the same way.

**Achieves:** a working admin API at the current architecture. Kept separate
from refactoring so a regression here is unambiguously a bad fix rather than a
bad restructure.

### Phase 2 Security hardening

- [x] F34 explicit `@Roles` on every protected controller, verified both
      directions. Done first because it is purely additive and because F7 removes
      a control, so something real had to replace it before anything came off.
- [x] F7 static key headers removed from backend guards and from the client.
      `adminApiFetch` in `products.tsx` was a third instance the finding never
      named, shipping `VITE_ADMIN_KEY_1/2`; it is gone and CORS is down to
      `Content-Type` and `Authorization`.
- [x] F33 the four dead payment routes are reachable and admin-only
- [x] F8 the four dead static key guard files deleted. See "still open" below for
      the one guard deliberately kept.
- [x] F9 audit writes on withdrawal approve and reject, commission paid, agent
      suspend, buyer block and unblock, and setting update. Verified: rows land
      with the acting admin, action, resource id and details.
- [x] F32 real FK on `admin_api_keys.admin_id`, and `validateApiKey` now joins
      the owner and rejects blocked, suspended or non-admin owners.

**Still open in Phase 2. Three items, precisely:**

- [ ] **Rotate `REQUEST_KEY`, `PAYMENT_KEY_1`, `PAYMENT_KEY_2`, `ADMIN_KEY_1`,
      `ADMIN_KEY_2` and delete them from every `.env`.** These shipped inside
      published browser bundles, so treat all five as compromised. Nothing reads
      them any more, so rotation cannot break anything. **This is a deploy task,
      not a code change, and needs whoever holds the environment secrets.**
- [ ] **Decide what happens to `api-key.guard.ts`.** It is the only sound key
      mechanism, DB-backed and hashed, and it is in no guard chain, so the
      `POST/GET/DELETE /admin/api-keys` endpoints mint keys that authenticate
      nothing. Two coherent options, pick one: wire the guard onto the routes
      that are meant to accept machine callers, or delete the guard **and** the
      three endpoints together. Deleting the guard alone leaves a key-minting UI
      for keys that do nothing, which is worse than either.
- [ ] **Confirm rate limiting covers admin mutations.** Known so far: admin login
      is throttled and the global default is 1000/minute, which is effectively no
      limit for mutations. Decide the intended limit for destructive admin
      routes, then assert it.

**Achieves:** closes a live credential exposure, removes two dead auth paths,
and makes privileged actions attributable.

**Why here:** F7 is live exposure. F9 is one insertion point today and eight
after Phase 4 splits the controller.

### Phase 3 Typed admin API client

Nothing in this phase has started.

- [ ] `services/admin/` modules per domain in `packages/api-client`
- [ ] Response schemas derived from the Drizzle schema via `drizzle-zod`
- [ ] Types exported from the package index, camelCase at the boundary
- [ ] Replace the unchecked cast in `apiFetch` with validation. It still ends
      `return (json as { data: T }).data`, which is F15.
- [ ] Strip `ApiXxx` interfaces and mappers from all 7 pages
- [ ] F10 standardise response shapes while the contract is being centralised
- [ ] **F19 remainder, moved here from Phase 1.** Orders returns `meta` as a
      sibling of `data`; buyer wallet transactions nest `pagination` inside
      `data`. Pick one envelope and apply it to both. The count-query and
      interceptor bugs F19 originally described are already fixed and verified;
      only the convention split is left, and it belongs to whichever phase
      centralises response shapes so it is not done twice.

**Achieves:** one definition per shape, runtime validation, and drift that fails
loudly. Largest single phase and the highest leverage.

**Best available option:** `zod` and `drizzle-zod` are already dependencies, so
response contracts can be generated from the schema rather than retyped by
hand. Prefer that over hand-written mirrors.

### Phase 4 Split the admin controller

Nothing in this phase has started.

- [ ] Break `v1/admin` into agents, buyers, orders, stock, catalog, payouts, settings, api-keys
- [ ] Controller, service, and DTO folder per module, sharing one guard set
- [ ] F13 collapse the duplicate `catalog` write paths
- [ ] **F35 delete the shadowed handlers.** `buyer.module.ts` registers
      `BuyerController` before `OrderController`, and both declare
      `POST /buyer/orders` and `POST /buyer/orders/initialize-payment`.
      `OrderController`'s versions are unreachable dead code. Read F35 before
      touching either file: the two implementations had diverged, and the dead
      one carried a client-controlled pricing bug. Both are now safe, so this is
      cleanup rather than a fix, but leaving two implementations of a money path
      is how the next person gets it wrong.
- [ ] F14 standardise on the query builder. `listProducts` is the last raw-SQL
      product path.
- [ ] Re-run the Phase 0 matrix, every row must match

**Achieves:** reviewable files, parallel work without the merge collisions that
produced F16, and a home for per-domain tests.

**Why after Phase 3:** the typed client makes backend file moves invisible to
the frontend. Reversed, every move ripples into the pages.

### Phase 5 Validation and pagination sweep

Nothing in this phase has started, apart from the admin-surface query params
already done under F23.

- [ ] Zod DTO on every body and query, replacing `@Body("key")`, `@Body("name")`,
      `@Body("reason")`, `@Body("target")`, and `@Body() body: unknown`
- [ ] **Make `ZodValidationPipe` reject anything that is not a body.** Its
      `transform` ignores the `ArgumentMetadata` second parameter, so it happily
      validates a JWT payload or a route param. A `metadata.type === "body"`
      guard would have made F27 and F31 impossible instead of fixing them one
      handler at a time. Do this before the sweep below, not after.
- [ ] Re-audit every `@UsePipes` after that guard lands. **Run the grep without
      `| head`**: truncation is what hid F31's seven broken handlers the first
      time.
- [ ] **F2's round-trip regression test, moved here from Phase 1.** Assert every
      DTO field survives a product create. There is no harness for this yet,
      which is why it waits for the phase that needs one anyway.
- [ ] F12 pagination, server-side search and filter
- [ ] Frontend off in-memory filtering

**Achieves:** no unvalidated input reaching services, and list endpoints that
survive data growth.

**Note:** adding pagination is a breaking response-shape change, which is why it
follows Phase 3 centralising those shapes.

### Phase 6 Build the missing admin UI

Ordered by likely value. Nothing in this phase has started.

- [ ] Orders list and detail, no page exists at all
- [ ] KYC review, blocks agent onboarding
- [ ] Buyer moderation: block, unblock, suspend, unsuspend, wallet transactions
      (`buyers.tsx` is read-only at 179 lines against 5 backend mutations)
- [ ] Stock requests and inventory
- [ ] Agent detail, promote-manager, set target
- [ ] Categories CRUD, frontend currently only reads `categories/leaves`
- [ ] **F28 remainder, moved here from Phase 1.** Add
      `PATCH /admin/categories/:id/reactivate`, render deactivated nodes muted
      with a reactivate action, and stop offering them as a parent for new
      products. The decision is already taken in F28: the admin tree keeps
      returning deactivated nodes and each carries `is_active`. Do not "fix" the
      API to hide them.
- [ ] Commissions list page against `GET /admin/commissions`, which exists now
      with status, type and agent filters plus pagination
- [ ] Leads
- [ ] API keys create/list/revoke, `commissions/:id/paid`, `upload`,
      `backfill-bank-codes`. Hold this one until Phase 2 decides what happens to
      `api-key.guard.ts`; building a UI to mint keys that authenticate nothing
      would be work spent either way the decision goes.

**Achieves:** admins can use what is already built.

**Why last:** written before Phase 3, each of these pages would duplicate the
pattern Phase 3 removes, roughly doubling the eventual cleanup.

### Phase 6 is the last phase in this document

There is no Phase 7. Work that surfaced during the audit but sits outside this
plan's scope is recorded where it belongs rather than appended here:

- **Buyer checkout payment-method modal, abandoned-order recovery, and the
  "forgotten orders" endpoint** are specified in `docs/frontend/TASKS.md` under
  "Unpaid order recovery". The modal itself is built and verified; the recovery
  items are not.
- **Admin tiering, invites, and bootstrapping the first super admin** are
  specified in `docs/frontend/AdminAuthDesign.md`, which carries its own phased
  plan. None of it is built.

If you are picking this up cold, read the "Handoff" section at the top of this
file first, then the phase you are starting. Every finding entry carries a
**Status** line; trust that over any summary, including this one.

## Key decisions

- **Phase 0 before everything.** Roughly 60 percent of these endpoints have no
  UI, so some had never run. F1 and F2 were both found this way and neither is
  obvious from reading the code alone.
- **Phase 3 before Phase 4 and Phase 6.** The typed client is the seam that
  makes both cheap. This is the ordering to defend.
- **Fixes never share commits with refactors,** to preserve bisect.
- **Generate types from Drizzle rather than hand-writing them.** The
  dependencies are installed and F2 shows what hand-maintained mirrors cost.
- **Audit logging in Phase 2, not later.** One insertion point now, eight after
  the split.
- **Seed data before trusting read results.** An `array[0]` response has proved
  almost nothing.

## Environment notes

- Backend serves `http://localhost:4001/api/v1`, Swagger at `/api/docs`.
- Redis timed out through the **first** part of the audit, when there was no
  redis service in `docker-compose.yml` and the app ran on its degraded no-cache
  fallback (`Redis degraded, skipping cache for 30s`). A redis service was added
  and it is now up and verified. Findings recorded before that point did not
  exercise cache or throttling on their real path, so re-check any cache-adjacent
  behaviour rather than trusting those observations.
- `PAYMENTS_SIMULATED` no longer gates the bank lookup. `PaystackBankService`
  now calls the live Paystack bank list for every role, with a 6-hour cache.
  See F6.
- Both apps typecheck clean. Nothing here is a compile error; the weaknesses are
  at runtime boundaries, which is precisely why `strict` mode passing is not
  sufficient evidence of correctness.

## Cleanup performed during the audit

Test artefacts were created and removed. Recorded for transparency:

- Product `ZZ_PHASE0_PROBE` (id 12) created to prove F2, deleted, products back to 11.
- API key `ZZ_PHASE0_PROBE` (id 1) created to test the lifecycle, revoked. Note it
  remains listed as `is_active: false`, which is F11 and is still open.
- `agent_commission_rate` written back to its existing value of 30, verified unchanged.
- API keys `ZZ_P0_B` (ids 2, 3) and `ZZ_VERIFY_F30` (id 4) created while verifying
  the double-revoke fix. All revoked. Since F11 now hides revoked keys by default
  they no longer appear in `GET /admin/api-keys`, but the rows are still there.
- Orders 103 and 104 created on `buyer1@seed.test` while proving the pricing fix.
  Order 104 was paid from the wallet, so `buyer_wallets.id = 16` was topped up to
  5,000,000 kobo by hand first and now sits at 3,740,000. Re-seed to reset.
- **Not cleaned up:** verifying F33 called `POST /payment/subaccount/38` against
  agent 38 (`agent1@seed.test`) and it succeeded, creating a real Paystack
  subaccount `ACCT_iyt4wiy923pg5xj`. Harmless on a simulated or test Paystack
  account, but worth knowing this route has a live side effect and is not a safe
  reachability probe. Use `POST /payment/payout/:id` with a nonexistent id
  instead, which fails at the lookup.
- Mutation probes used id `999999999` so no real record could be affected.
