# Admin Auth Design: tiers, invites, bootstrapping

Scope: how admin accounts should be created, tiered, and revoked in Debridgers.
Companion to `docs/frontend/AdminPlan.md`. That document audits the admin surface
as built. This one answers a question it does not: where do admin accounts come
from once there is more than one.

All paths are relative to `apps/debridgers-backend/` unless stated otherwise.

---

## 1. Current state

### 1.1 How an admin exists today

| Step                       | Where                                      | Detail                                                                           |
| -------------------------- | ------------------------------------------ | -------------------------------------------------------------------------------- |
| Credentials come from env  | `src/infrastructure/seeders/seeder.ts:169` | `ADMIN_EMAIL` defaulting to `admin@debridgers.com`                               |
| Password from env          | `seeder.ts:170`                            | `ADMIN_PASSWORD` defaulting to the literal `WGxMWQP8RfIMjNWVTpJo`                |
| Lookup by lowercased email | `seeder.ts:173`                            | `select ... where lower(email) = ...`                                            |
| Hash                       | `seeder.ts:179`                            | `bcrypt.hash(password, 12)`                                                      |
| Insert if absent           | `seeder.ts:181`                            | `role: "admin"`, `is_email_verified: true`, name hardcoded to `Debridgers Admin` |
| Overwrite if present       | `seeder.ts:192`                            | resets the password of the existing row on every seeder run                      |

There is no other code path that creates a row with `role: "admin"`. Grep for
`role: "admin"` returns the seeder and nothing else. `POST /auth/register`
cannot produce one: `SELF_REGISTERABLE_ROLES` in
`src/api/v1/auth/dto/register.dto.ts:39` restricts the field and the column
default is `buyer` (`users.schema.ts:37`).

### 1.2 The role model as it stands

- `src/interfaces/users/roles.type.ts:1` defines `UserRole = "admin" | "agent" | "buyer" | "company"`.
- `src/infrastructure/persistence/schemas/users.schema.ts:16` mirrors it as the `user_role` pgEnum.
- There is exactly one admin role value. No tier, no capability, no grouping.
- `users` has no column that could stand in for a tier. The closest are
  `is_blocked` and `is_suspended` (`users.schema.ts:40`), which are account state, not authority.

### 1.3 Auth and guards

`JwtPayload` (`src/interfaces/users/jwt.type.ts`) carries `sub`, `id`, `email`,
`first_name`, `last_name`, `role`, `api_version`, `device`, `ip_address`. Both
`AuthGuard` (`src/api/shared/guards/auth.guard.ts:80`) and `RefreshGuard`
(`refresh.guard.ts:246`) rebuild `req.user` by explicit field mapping, so any
new claim has to be added in three places: the payload built in
`AuthService.generateTokens` (`auth.service.ts:568`), and both guards.

Guard inventory, six files, overlapping:

| File                                             | Mechanism                                                                            | Used by                                                                                                                                                  |
| ------------------------------------------------ | ------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `auth.guard.ts`                                  | JWT bearer verify                                                                    | everywhere, canonical                                                                                                                                    |
| `refresh.guard.ts`                               | JWT with `Refresh <token>` scheme                                                    | `POST /auth/refresh`                                                                                                                                     |
| `roles.guard.ts`                                 | reflector reads `ROLES_KEY`, compares `user.role`                                    | `AdminController`, and only there                                                                                                                        |
| `keys.guard.ts`                                  | `BaseKeysGuard` plus four subclasses, static env header compare                      | `AdminKeysGuard` used on `product.controller.ts:42,54,69,124`; `RequestKeyGuard` and `BuyerPaymentKeysGuard` used across agent, buyer, order controllers |
| `admin-keys.guard.ts`                            | duplicate standalone `AdminKeysGuard`, same class name as the one in `keys.guard.ts` | not imported anywhere                                                                                                                                    |
| `payment-keys.guard.ts` / `request-key.guard.ts` | duplicate standalone versions of the `keys.guard.ts` subclasses                      | not imported anywhere                                                                                                                                    |
| `api-key.guard.ts`                               | DB backed, SHA256 hashed key lookup via `AdminApiKeysService`                        | not in any guard chain                                                                                                                                   |

`AdminController` is protected at class level
(`src/api/v1/admin/admin.controller.ts:117`):

```ts
@UseGuards(AuthGuard, RolesGuard)
@Roles("admin")
export class AdminController {
```

with one override, `@Roles("admin", "agent")` on `POST /admin/outreach`
(`admin.controller.ts:749`). `RolesGuard` is a flat membership test:
`requiredRoles.includes(user.role)` (`roles.guard.ts:30`). There is no notion of
one admin outranking another.

Decorators in `src/api/shared/decorators/`:

- `roles.decorator.ts` sets `ROLES_KEY` metadata, typed `UserRole[]`.
- `current-user.decorator.ts` returns `req.user` typed as `JwtUser`.
- `admin-id.decorator.ts` returns `request.user?.sub ?? request.adminId`. Its own
  comment records that it used to read `request.adminId` alone, which was always
  `undefined` because `ApiKeyGuard`, the only thing that sets it, is in no chain.

### 1.4 The existing API key mechanism

`src/api/v1/admin/admin-api-keys.service.ts` is per admin, not global:

- `createApiKey` (line 38) generates `debridgers_` plus 32 random bytes hex,
  stores only `sha256(key)`, returns the plaintext once.
- `validateApiKey` (line 76) hashes and looks up an active row, stamps
  `last_used_at`, returns the owning `admin_id`.
- `deactivateApiKey` (line 127) soft deletes, scoped to `admin_id`.
- `listApiKeys` (line 109) has no `is_active` filter. This is AdminPlan F11 and
  it is still open.

The table `admin_api_keys` (`schemas/admin_api_keys.schema.ts:13`) declares
`admin_id: serial("admin_id").notNull()` with a comment saying it references
`users.id`. It is a `serial`, so it carries its own sequence default and no
foreign key. That matters here: when an admin is removed, nothing at the DB level
cascades their keys.

### 1.5 Audit logging

`admin_audit_log` already exists as a table
(`schemas/admin_audit_log.schema.ts`, migration
`migrations/0005_parallel_lady_mastermind.sql`) and `AuditLogService`
(`src/infrastructure/audit/audit-log.service.ts:31`) already implements a best
effort `record`. It is provided and exported by `audit.module.ts` and injected
into nothing. The table and the writer exist; the call sites do not.

### 1.6 Why hardcoding breaks past one admin

| Problem                                                         | Consequence                                                                                                     |
| --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| One email, one password, both in env                            | Two people sharing an admin means a shared password. Every action is attributed to user id 1.                   |
| Seeder overwrites the password on every run (`seeder.ts:192`)   | A production seed re-run silently resets the live admin password to whatever is in that environment's env file. |
| Removing an admin means editing env and redeploying             | No same day revocation. A departing admin keeps access until a deploy.                                          |
| Password rotation is a deploy                                   | Rotation should not require infrastructure access.                                                              |
| No tier                                                         | Whoever can log in can mint API keys, approve withdrawals, and edit system settings.                            |
| `admin_audit_log.admin_id` is meaningless with a shared account | Undermines F9 before it is even wired.                                                                          |

### 1.7 What AdminPlan.md constrains here

- **F7**: `packages/api-client/src/apiFetch.ts` inlines `VITE_REQUEST_KEY`,
  `VITE_PAYMENT_KEY_1`, `VITE_PAYMENT_KEY_2` into the browser bundle. Any new
  admin endpoint must authorise on the JWT alone and must not add a header
  secret the frontend has to carry.
- **F8**: three competing admin auth mechanisms, two of them dead. Do not add a
  fourth. The invite flow rides on `AuthGuard` plus `RolesGuard`.
- **F9**: no audit writes on privileged mutations. Admin lifecycle events are
  exactly the kind of thing that trail exists for, so invite, accept, and remove
  must write to it from day one.
- **F11**: `listApiKeys` returns revoked keys. Relevant because key revocation is
  part of removing an admin, and today the list would not show a removed admin's
  keys as gone.
- **Phase 2** already owns F7, F8, F9 and "confirm rate limiting covers admin
  mutations". The invite work should attach to Phase 2 rather than open a
  parallel track.

---

## 2. The role model

### 2.1 Recommendation

**Ship a two tier enum on a new `users.admin_level` column. Keep
`users.role = "admin"` unchanged for both tiers.**

```
users.role        stays "admin" | "agent" | "buyer" | "company"
users.admin_level new nullable enum: "super_admin" | "admin", null for non admins
```

Authorisation then reads: `RolesGuard` decides "is this an admin at all",
a new `AdminLevelGuard` decides "is this admin senior enough".

### 2.2 Why not extend `user_role` with `super_admin`

This is the obvious move and it is the wrong one here. `UserRole` is a flat
membership test in every consumer:

- `RolesGuard` does `requiredRoles.includes(user.role)` (`roles.guard.ts:30`).
  A super admin whose `role` is `"super_admin"` fails `@Roles("admin")` and is
  locked out of the entire `AdminController`.
- `AuthService.loginAdmin` rejects on `user.role !== "admin"`
  (`auth.service.ts:291`). A super admin could not log in.
- The frontend routes on role. `apps/debridgers-frontend/app/routes.ts:72`
  mounts the admin dashboard under one layout keyed to the admin role.
- Every `@Roles("admin")` in the codebase would need to become
  `@Roles("admin", "super_admin")`, and every one that got missed is a silent
  lockout rather than a loud failure.

A separate column means the blast radius of adding a tier is one migration, one
guard, one JWT claim. Nothing that exists today changes behaviour.

### 2.3 Why not a permissions table now

A `permissions` / `role_permissions` / `admin_permissions` model is the correct
end state for a product with many admin shapes. It is wrong for Debridgers today:

| Against a capability table now | Detail                                                                                                                                                                                      |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| No demand for it               | There are two tiers and one organisation. A join table to express a two value distinction is machinery without a user.                                                                      |
| Every check becomes a query    | `RolesGuard` is currently synchronous and allocation free. A permission lookup makes every admin request do a DB round trip, or forces a cache with an invalidation story.                  |
| It hides the policy            | With an enum, `@MinAdminLevel("super_admin")` on a route is the policy, readable in the controller and diffable in review. With a table, the policy lives in rows that no code review sees. |
| Phase 4 will move these routes | AdminPlan Phase 4 splits `AdminController` into eight modules. Decorators travel with the handler. Table rows keyed by route string do not.                                                 |

### 2.4 Migration path to the richer model

The enum is designed to be replaced without a rewrite. Route the decision
through one function from the start:

```ts
// === Permission resolution
export type AdminCapability =
  | "admin.invite"
  | "admin.remove"
  | "apikeys.manage"
  | "settings.write"
  | "payouts.approve"
  | "commissions.mark_paid"
  | "agents.promote";

export function adminCan(
  level: AdminLevel,
  capability: AdminCapability,
): boolean {
  if (level === "super_admin") return true;
  return false;
}
```

`AdminLevelGuard` calls `adminCan`. Nothing else does. When a third tier or a
per admin grant is genuinely needed, `adminCan` gains a second argument for the
loaded grants and becomes a lookup. Call sites, decorators, and the JWT claim
are unaffected. That is the whole migration.

Signals that the enum has run out: a request for an admin who can do payouts but
not settings, or an admin scoped to one zone. Neither exists today.

---

## 3. The invite flow

**Decision: an invite issues a temporary password, not a magic link.** The
invited person receives their email address and a system generated temporary
password. That credential is valid for **30 minutes**. Within that window they
log in at the normal admin login screen and are forced to set their own
password. If the window closes first, the temporary credential is dead and a
super admin must issue a fresh invite. There is no self service resend.

### 3.1 Why a temporary password rather than a link only

| Reason                       | Detail                                                                                                                                                                                                 |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| One login path               | The invitee uses `POST /auth/admin/login`, the same endpoint every admin uses forever after. No second unauthenticated credential type to design, throttle, and audit.                                 |
| No new token surface         | A magic link needs its own token table, its own hash discipline, its own public validate endpoint. AdminPlan F8 already flags three competing admin auth mechanisms, two of them dead. This adds none. |
| Out of band confirmation     | The super admin can read the address back to the invitee and say "it is sent". A short window is workable precisely because the invite is coordinated, not cold.                                       |
| The mailbox is the weak link | A credential that sits in an inbox indefinitely is a standing risk. Thirty minutes bounds it.                                                                                                          |

This reverses the earlier position that no `users` row should exist before
acceptance. The row has to exist, because the credential is checked by
`loginAdmin` against `users.password` (`auth.service.ts:283`). A pending admin
is therefore a real `users` row that is deliberately unable to do anything, see
3.4.

### 3.2 Why 30 minutes

- The credential travels in plaintext through email. Its lifetime is the
  window in which a compromised or misdelivered inbox yields admin access.
- Password reset is already 1 hour (`auth.service.ts:374`). A reset is
  self initiated and the user is at the keyboard. An invite is coordinated by a
  second person who is also at the keyboard, so it can be tighter, not looser.
- Thirty minutes absorbs realistic SMTP queueing, the invitee finding the mail,
  switching device, and choosing a password, without leaving slack for the
  credential to sit unattended over a lunch break.
- Shorter, for example 5 or 10 minutes, breaks on ordinary mail delay and turns
  re-invites into the common case rather than the exception.
- The number lives in one constant, `ADMIN_TEMP_PASSWORD_TTL_MINUTES`, read from
  config with 30 as the default.

### 3.3 Generating the temporary password

```ts
// === Temporary admin credential
/*
 * 64 character alphabet, so one byte masked to 6 bits selects an index with no
 * modulo bias and no rejection loop. Visually ambiguous glyphs (I, O, l, o, 0,
 * 1) are excluded because the password is often read off a phone and typed on a
 * laptop.
 */
const TEMP_PASSWORD_ALPHABET =
  "ABCDEFGHJKLMNPQRSTUVWXYZ" + // 24, no I, no O
  "abcdefghijkmnpqrstuvwxyz" + // 24, no l, no o
  "23456789" + // 8
  "!@#$%^&*"; // 8

const TEMP_PASSWORD_LENGTH = 16;

export function generateTempPassword(): string {
  for (;;) {
    const bytes = crypto.randomBytes(TEMP_PASSWORD_LENGTH);
    let out = "";
    for (const b of bytes) out += TEMP_PASSWORD_ALPHABET[b & 63];

    /*
     * Redraw the whole string rather than patching a character into a fixed
     * position. Patching pins a known class at a known index and costs entropy.
     */
    if (!/[A-Z]/.test(out)) continue;
    if (!/[2-9]/.test(out)) continue;
    if (!/[!@#$%^&*]/.test(out)) continue;
    return out;
  }
}
```

| Property           | Value                                                                                                                                  |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| Source             | `crypto.randomBytes`, the same CSPRNG as `admin-api-keys.service.ts:38` and `auth.service.ts:374`                                      |
| Alphabet           | 64 characters, unambiguous, exactly 6 bits per character                                                                               |
| Length             | 16 characters                                                                                                                          |
| Entropy            | 96 bits before the composition filter, which removes a negligible fraction                                                             |
| Composition        | Guaranteed to satisfy `passwordRule` (`register.dto.ts:4`), so nothing downstream that revalidates a password can choke on it          |
| Storage            | `bcrypt.hash(temp, 12)` into `users.password`, identical to every other password in the system (`auth.service.ts:70`, `seeder.ts:179`) |
| Plaintext lifetime | Returned once to the email sender, never logged, never persisted, never in an audit `details` payload                                  |

There is no separate temporary credential column. One password column, one
hasher, one verification path. The temporary nature is expressed by the two
state columns in 3.4, not by where the hash lives.

### 3.4 Representing "must change password"

Two columns on `users`, deliberately independent:

| Column                                                 | Meaning                                                                |
| ------------------------------------------------------ | ---------------------------------------------------------------------- |
| `must_change_password: boolean not null default false` | The gate. While true the account can authenticate and do nothing else. |
| `password_expires_at: timestamp` (nullable)            | The deadline. Null means the current password never expires.           |

Splitting them matters. An email delivered temporary password gets both: the
gate and a 30 minute deadline. A credential handed over through a secret store,
which is how staging is seeded in 5.3, gets the gate with a null deadline,
because it never travelled through a mailbox and there is nothing to time out.

Setting a password clears both in the same statement: `must_change_password`
to false, `password_expires_at` to null.

### 3.5 Blocking every admin route while the gate is set

`must_change_password` becomes a JWT claim and `AuthGuard` enforces it. It does
**not** become a fourth guard, per AdminPlan F8.

| Piece                                      | Change                                                                                                   |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| `src/interfaces/users/jwt.type.ts`         | add `must_change_password: boolean` to `JwtPayload`                                                      |
| `auth.service.ts:568` `generateTokens`     | include it in the payload                                                                                |
| `auth.guard.ts:80`, `refresh.guard.ts:246` | add it to both explicit field maps                                                                       |
| `auth.guard.ts`                            | after the field map, reject when the claim is true unless the handler carries `@AllowsPendingPassword()` |

```ts
// === Pending password escape hatch
export const ALLOWS_PENDING_PASSWORD = "allows_pending_password";
export const AllowsPendingPassword = () =>
  SetMetadata(ALLOWS_PENDING_PASSWORD, true);
```

The allow list is exactly three handlers: `POST /auth/admin/set-password`,
`GET /auth/me`, `POST /auth/logout`. Everything else, including every route on
`AdminController`, returns:

```
403 { error_code: "PASSWORD_CHANGE_REQUIRED" }
```

Properties worth stating:

- The claim is false for every buyer, agent, and company account, so this is a
  no op for the rest of the platform.
- It fails closed. A claim missing from a guard's field map arrives as
  `undefined`, which is falsy, so the correctness of the block depends on all
  three edits landing together. That is the same class of bug the `AdminId`
  decorator comment describes, and the reason the three files are listed as one
  unit.
- No DB read per request. Setting the password issues a fresh token pair with
  the claim false, so the claim is never stale in the direction that grants
  access it should not.

### 3.6 What login returns

`POST /auth/admin/login` keeps its path and its shape. The `data` object gains
three fields:

```json
{
  "message": "Admin login successful",
  "data": {
    "user": {
      "id": 7,
      "email": "new.admin@debridgers.com",
      "role": "admin",
      "admin_level": "admin"
    },
    "accessToken": "...",
    "refreshToken": "...",
    "must_change_password": true,
    "password_expires_at": "2026-08-09T14:32:00.000Z",
    "next": "set_password"
  }
}
```

- `next` is the routing instruction. The frontend switches on it rather than
  inferring from a boolean, so a future `"mfa_enrol"` costs no client change.
- `password_expires_at` lets the set password screen show a live countdown, so
  the invitee learns the window is closing before it closes.
- `sanitize` (`auth.service.ts`) must pass `admin_level` through and must keep
  excluding `password` and `refresh_token`.

### 3.7 Journey B, super admin invites a new admin

Journey A, the bootstrap of the very first super admin, is in section 5.4.
Assumes a signed in super admin. Every step names the endpoint, the database
effect, and what the person sees.

1. **Super admin opens Admins.**
   - Endpoint: `GET /admin/admins`.
   - Database: read only.
   - Sees: a table of admins with tier and state, where state is one of active,
     pending, or expired.

2. **Super admin clicks "Invite admin", enters an email, picks a tier.**
   - Endpoint: none yet, this is a client side form. Tier is a two option
     select, `admin` or `super_admin`.
   - Sees: a note that the invitee must log in within 30 minutes.

3. **Super admin submits.**
   - Endpoint: `POST /admin/admins/invite`, body `{ email, first_name, last_name, admin_level }`.
   - Guard: `AuthGuard`, `RolesGuard`, `AdminLevelGuard("super_admin")`.
   - Server rejects with 409 if the email already belongs to any `users` row
     with a password, whatever the role. One identity per email, enforced by
     `users_email_idx` on `lower(email)` (`users.schema.ts:53`).

4. **Server creates the pending admin, in one transaction.**
   - Database, `users`: new row with `role: "admin"`, the chosen `admin_level`,
     `password` set to `bcrypt(generateTempPassword(), 12)`,
     `must_change_password: true`,
     `password_expires_at: now + 30 minutes`,
     `is_email_verified: false`.
   - Database, `admin_invites`: new row, `status: "pending"`, `user_id` pointing
     at the new user, `expires_at` matching `password_expires_at`, `invited_by`
     set to the caller, `sent_count: 1`.
   - Database, `admin_audit_log`: `ADMIN_INVITED`, resource type `admin_invite`.
     `details` carries the email and the tier and never the password.

5. **Server emits `ADMIN_INVITED`.**
   - Follows the emit pattern at `auth.service.ts:385`. The listener calls a new
     `sendAdminInvite` on `notification/features/email/email.service.ts`,
     alongside `sendPasswordReset` (line 532).
   - The plaintext temporary password exists only as an argument on this call
     path and is discarded when the mail is handed off.

6. **Super admin sees the result.**
   - Response: 201 with the invite row, no password in the body.
   - Sees: the new person in the list as pending, with the expiry time and a
     "Re-invite" button. The password is never shown to the inviter either.

7. **Invitee receives the email.**
   - Contains: their email address, the temporary password, a link to
     `/auth/admin/login`, and the deadline as an absolute time.
   - Does not contain: the inviter's name or address, or any token in the URL.

8. **Invitee logs in.**
   - Endpoint: `POST /auth/admin/login`, body `{ email, password }`, throttled
     at 3 per minute as today (`auth.controller.ts:157`).
   - Database: `authAttempt` counters updated as usual. No other write.
   - Sees: an immediate redirect to `/auth/admin/set-password`, driven by
     `next: "set_password"` in the response.

9. **Invitee sets their own password.**
   - Endpoint: `POST /auth/admin/set-password`, body
     `{ current_password, new_password }`, guard `AuthGuard` plus
     `@AllowsPendingPassword()`.
   - `current_password` is the temporary one. Requiring it again means an
     unattended browser left on the set password screen cannot be used by a
     passer by.
   - Server, in one transaction: re-checks `password_expires_at > now`, bcrypt
     compares the temporary password, validates the new one against the admin
     password rule in 6.1, rejects if the new password equals the temporary one.
   - Database, `users`: `password` replaced, `must_change_password: false`,
     `password_expires_at: null`, `is_email_verified: true` (delivery of the
     temporary password proved control of the mailbox), `refresh_token` rotated.
   - Database, `admin_invites`: `status: "activated"`, `activated_at` stamped.
   - Database, `admin_audit_log`: `ADMIN_INVITE_ACTIVATED`, resource type `user`.
   - Response: a fresh token pair whose claim is now false.

10. **Invitee reaches the dashboard.**
    - Endpoint: `GET /admin/me`, then `GET /admin/dashboard`.
    - Database: read only.
    - Sees: the admin dashboard, with super admin only controls hidden when
      `admin_level !== "super_admin"`. That hiding is cosmetic; `AdminLevelGuard`
      is the enforcement.

11. **Super admin refreshes Admins.**
    - Endpoint: `GET /admin/admins`.
    - Sees: the person is now active rather than pending.

### 3.8 Edge cases

| Case                                                  | Behaviour                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Window expires before first login                     | Login with the correct temporary password returns 401 `TEMP_PASSWORD_EXPIRED`. The expiry check runs **after** the bcrypt compare, so a wrong password and an expired one are not distinguishable to an attacker who never had the credential, while the legitimate invitee gets an actionable message. The same request flips `admin_invites.status` to `expired` and nulls `users.password`.                                                   |
| Expired, invitee asks for help                        | There is no self service resend endpoint. The invitee contacts a super admin, who runs step 3 again.                                                                                                                                                                                                                                                                                                                                             |
| Temporary password already used                       | After activation the temporary hash no longer exists, so presenting it is an ordinary invalid credential. `admin_invites.status` is `activated` and cannot return to `pending`.                                                                                                                                                                                                                                                                  |
| Invite revoked mid window                             | `DELETE /admin/admins/invite/:id` sets `status: "revoked"`, and on `users` sets `password: null`, `admin_level: null`, `refresh_token: null`. Login then fails at the `!user.password` check (`auth.service.ts:280`). A session already opened on the temporary credential loses refresh immediately and access within 15 minutes, and `POST /auth/admin/set-password` re-reads the row and refuses in the meantime.                             |
| Logs in, then abandons without setting a password     | The session is live and useless: every admin route is 403 `PASSWORD_CHANGE_REQUIRED`. The window lives on the `users` row, not on the token, so refreshing does not extend it. Once `password_expires_at` passes, set password refuses too and the session degrades to nothing.                                                                                                                                                                  |
| Super admin re-invites while a window is still open   | This is the supported path and it is a rotation, not a duplicate. `POST /admin/admins/:id/reinvite` overwrites `users.password` with a new temporary hash, resets `password_expires_at`, bumps `sent_count` and `last_sent_at` on the same `admin_invites` row, and re-sends. The previous temporary password dies at that instant. The partial unique index on `lower(email)` where `status = 'pending'` makes a second pending row impossible. |
| Re-invite after expiry                                | Same endpoint, same row, `status` returns to `pending`.                                                                                                                                                                                                                                                                                                                                                                                          |
| Re-invite after activation                            | 409. The account is a normal admin now; use password reset.                                                                                                                                                                                                                                                                                                                                                                                      |
| Email already belongs to a buyer or agent             | 409 at invite time. Promoting an existing account to admin is a separate deliberate action, not an invite.                                                                                                                                                                                                                                                                                                                                       |
| Two super admins invite the same address concurrently | The partial unique index rejects the loser at the database. Surface it as 409.                                                                                                                                                                                                                                                                                                                                                                   |
| Pending admin never activates and is forgotten        | `GET /admin/admins` shows them as expired. `DELETE /admin/admins/:id` removes the row outright when `admin_invites.status` was never `activated`, because there is no audit history to preserve. This is the one case where a hard delete is correct, and it is why 6.3 is about removing _active_ admins.                                                                                                                                       |

### 3.9 Drizzle schema to add

Following the conventions in `schemas/`: no explicit column name argument, the
shared `timestamps` spread from `infrastructure/helper/column.helper.ts`,
`pgEnum` declared beside the table, the array form for the index callback as in
`users.schema.ts:53`, and exported `$inferSelect` / `$inferInsert` types as in
`admin_audit_log.schema.ts:33`.

`src/infrastructure/persistence/schemas/admin_invites.schema.ts`:

```ts
import {
  pgTable,
  pgEnum,
  serial,
  integer,
  text,
  timestamp,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users, lower, adminLevelEnum } from "./users.schema";
import { timestamps } from "../../helper/column.helper";

export const adminInviteStatusEnum = pgEnum("admin_invite_status", [
  "pending",
  "activated",
  "expired",
  "revoked",
]);

export const admin_invites = pgTable(
  "admin_invites",
  {
    id: serial().primaryKey().notNull(),
    /*
     * The users row exists from the moment of invite, because the temporary
     * password is verified by loginAdmin against users.password like any other
     * credential. This table is the lifecycle record, not the credential store.
     */
    user_id: integer()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    // denormalised so the admin list reads without a join
    email: text().notNull(),
    admin_level: adminLevelEnum().notNull().default("admin"),
    status: adminInviteStatusEnum().notNull().default("pending"),
    // mirrors users.password_expires_at; kept here so history survives activation
    expires_at: timestamp().notNull(),
    // null means the bootstrap CLI issued it, see section 5.3
    invited_by: integer().references(() => users.id, { onDelete: "restrict" }),
    activated_at: timestamp(),
    revoked_at: timestamp(),
    revoked_by: integer().references(() => users.id, { onDelete: "set null" }),
    // re-invite rotates the temporary password in place and bumps this
    sent_count: integer().notNull().default(1),
    last_sent_at: timestamp().defaultNow().notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("admin_invites_pending_email_idx")
      .on(lower(table.email))
      .where(sql`status = 'pending'`),
    index("admin_invites_user_id_idx").on(table.user_id),
    index("admin_invites_status_idx").on(table.status),
  ],
);

export type AdminInvite = typeof admin_invites.$inferSelect;
export type InsertAdminInvite = typeof admin_invites.$inferInsert;
```

There is no `token_hash` column. Nothing about this flow issues a token.

Additions to `src/infrastructure/persistence/schemas/users.schema.ts`:

```ts
export const adminLevelEnum = pgEnum("admin_level", ["super_admin", "admin"]);

// inside the users table definition, alongside role
/*
 * Tier within the admin role. Null for every non admin. Deliberately not a
 * user_role value: RolesGuard is a flat includes() test, so a "super_admin"
 * role would fail every existing @Roles("admin") and lock the tier out of the
 * controller it is meant to own.
 */
admin_level: adminLevelEnum(),

/*
 * The gate. While true the account authenticates and is refused everything
 * except set-password, me, and logout. Independent of the deadline below: a
 * credential handed over through a secret store gets the gate with no deadline.
 */
must_change_password: boolean().notNull().default(false),

// The deadline. Null means the current password does not expire.
password_expires_at: timestamp(),
```

`users.schema.ts` already imports `boolean`; add `timestamp` to the
`drizzle-orm/pg-core` import list.

Export `admin_invites` from `src/infrastructure/persistence/index.ts` next to
the `admin_audit_log` export at line 33.

Note on migration generation: AdminPlan records that drizzle-kit emitted a bare
`SET DATA TYPE` for `0004` and needed a hand edit because Postgres will not cast
without `USING`. These are pure additions, two enum types, three new columns
that are nullable or defaulted, and one new table, so no `USING` clause is
required, but read the generated SQL before applying it.

### 3.10 Endpoints

| Method   | Path                         | Guard                                                       | Notes                                                                                                       |
| -------- | ---------------------------- | ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `POST`   | `/admin/admins/invite`       | `AuthGuard`, `RolesGuard`, `AdminLevelGuard("super_admin")` | body: email, first_name, last_name, admin_level. Creates the pending `users` row and the temporary password |
| `GET`    | `/admin/admins`              | admin                                                       | list admins with state: active, pending, expired                                                            |
| `POST`   | `/admin/admins/:id/reinvite` | super admin                                                 | rotates the temporary password and the window on the same rows                                              |
| `DELETE` | `/admin/admins/invite/:id`   | super admin                                                 | revoke a pending invite, see 3.8                                                                            |
| `DELETE` | `/admin/admins/:id`          | super admin                                                 | remove an active admin, see 6.3                                                                             |
| `PATCH`  | `/admin/admins/:id/level`    | super admin                                                 | promote or demote, see 5.5                                                                                  |
| `GET`    | `/admin/audit-log`           | super admin                                                 | new, paginated                                                                                              |
| `POST`   | `/auth/admin/login`          | none, throttled                                             | unchanged path; response now carries `must_change_password`, `password_expires_at`, `next`                  |
| `POST`   | `/auth/admin/set-password`   | `AuthGuard`, `@AllowsPendingPassword()`, throttled          | body: current_password, new_password                                                                        |

Removed from the earlier draft of this document: `GET /auth/admin/invite/:token`
and `POST /auth/admin/accept-invite`. There is no token, so there is nothing for
an unauthenticated endpoint to validate. Every invite endpoint that remains is
either super admin guarded on `AdminController` or authenticated on
`AuthController`.

---

## 4. Permission matrix

Derived from the real handlers in `src/api/v1/admin/admin.controller.ts`. Every
route in the table below currently requires only `@Roles("admin")`, so today
every cell is "yes" for both tiers.

Principle: a normal admin runs daily operations. A super admin controls money
leaving the platform, the platform's own configuration, and who else has access.

Rows are grouped by outcome: everything both tiers can do first, then everything
reserved to a super admin. The split point is the real content of this table.

| Area                                 | Routes                                                                               | Admin | Super admin |
| ------------------------------------ | ------------------------------------------------------------------------------------ | ----- | ----------- |
| Profile                              | `GET me`                                                                             | yes   | yes         |
| Dashboard                            | `GET dashboard`                                                                      | yes   | yes         |
| Uploads                              | `POST upload`                                                                        | yes   | yes         |
| Agents read                          | `GET agents`, `GET agents/:id`                                                       | yes   | yes         |
| Agents state                         | `PATCH agents/:id/status`, `/suspend`, `/unsuspend`, `/target`                       | yes   | yes         |
| Agents KYC                           | `GET kyc`, `PATCH agents/:id/kyc`                                                    | yes   | yes         |
| Orders                               | `GET orders`, `GET orders/:id`                                                       | yes   | yes         |
| Buyers read                          | `GET buyers`, `GET buyers/:id`, `GET buyers/:id/wallet/transactions`                 | yes   | yes         |
| Buyers state                         | `PATCH buyers/:id/block`, `/unblock`, `/suspend`, `/unsuspend`                       | yes   | yes         |
| Stock                                | `GET stock/requests`, `PATCH stock/requests/:id/fulfil`, `GET/POST stock/inventory`  | yes   | yes         |
| Leads and outreach                   | `GET leads`, `GET/POST outreach`, `DELETE outreach/:id`                              | yes   | yes         |
| Products                             | `POST/GET/PATCH products`                                                            | yes   | yes         |
| Categories read and write            | `GET categories`, `GET categories/leaves`, `POST categories`, `PATCH categories/:id` | yes   | yes         |
| Withdrawals read                     | `GET withdrawals`                                                                    | yes   | yes         |
| Settings read                        | `GET settings`                                                                       | yes   | yes         |
| **Super admin only below this line** |                                                                                      |       |             |
| Agent promotion                      | `PATCH agents/:id/promote-manager`                                                   | no    | yes         |
| Bank backfill                        | `POST agents/backfill-bank-codes`                                                    | no    | yes         |
| Product delete                       | `DELETE products/:id`                                                                | no    | yes         |
| Category delete                      | `DELETE categories/:id`                                                              | no    | yes         |
| Commissions                          | `PATCH commissions/:id/paid`                                                         | no    | yes         |
| Withdrawals decide                   | `PATCH withdrawals/:id/approve`, `/reject`                                           | no    | yes         |
| Settings write                       | `PATCH settings`                                                                     | no    | yes         |
| API keys                             | `POST/GET/DELETE api-keys`                                                           | no    | yes         |
| Admin management                     | `/admin/admins/*`, new                                                               | no    | yes         |
| Audit log read                       | `GET audit-log`, new                                                                 | no    | yes         |

Reasoning on the less obvious rows:

- **`promote-manager`** grants an agent authority over other agents. Delegating
  authority is a super admin act by the same logic as inviting an admin.
- **`commissions/:id/paid`** and **withdrawals approve** are money leaving the
  platform, and AdminPlan F20 already flags that the withdrawals actor trail is
  incomplete. Restricting the tier and completing the trail are the same work.
- **`DELETE categories/:id` and `DELETE products/:id`** are destructive against
  the catalog every buyer sees. Create and update stay open so operations is not
  blocked on one person.
- **`PATCH settings`** writes `system_settings`, which drives platform wide
  behaviour.
- **API keys** are long lived bearer credentials for the whole admin API. They
  should not be mintable by the tier that cannot invite an admin, since a key is
  a durable substitute for an account.
- **`GET settings`** stays open so a normal admin can see the fee configuration
  that explains an order total.

Enforcement, matching the existing decorator style in
`src/api/shared/decorators/roles.decorator.ts`:

```ts
// === Admin tier
export const ADMIN_LEVEL_KEY = "admin_level";
export const MinAdminLevel = (level: AdminLevel) =>
  SetMetadata(ADMIN_LEVEL_KEY, level);
```

```ts
@Patch("withdrawals/:id/approve")
@MinAdminLevel("super_admin")
approveWithdrawal(...)
```

`AdminLevelGuard` goes into the class level chain in
`admin.controller.ts:117`, after `RolesGuard`. With no `@MinAdminLevel` on a
handler it returns true, exactly as `RolesGuard` returns true for absent
metadata (`roles.guard.ts:23`). That keeps the diff to the routes in the "no"
column.

---

## 5. Bootstrapping the first super admin

The invite flow in section 3 requires a super admin to start it. The first super
admin therefore cannot be invited, and something outside the invite system has
to create it exactly once. This section is the complete lifecycle: where the
first one comes from per environment, how it becomes a normal account, how it
goes on to create every other admin, and what stops the tier from being
destroyed.

### 5.1 What exists today

`src/infrastructure/seeders/seeder.ts` is the only code path that creates an
admin:

| Line            | Behaviour                                             | Problem under this design                                                                               |
| --------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `seeder.ts:169` | `ADMIN_EMAIL` defaulting to `admin@debridgers.com`    | A known address in every environment                                                                    |
| `seeder.ts:170` | `ADMIN_PASSWORD` defaulting to `WGxMWQP8RfIMjNWVTpJo` | A known password, committed in the fallback                                                             |
| `seeder.ts:182` | inserts `role: "admin"`, `is_email_verified: true`    | No `admin_level`, so after the migration this row is an admin with a null tier and cannot invite anyone |
| `seeder.ts:192` | unconditionally overwrites the password on every run  | A re-run silently resets a live admin's password to whatever that environment's env file holds          |

The admin insert sits in the same `seed()` function as the zone and product
seeding (`seeder.ts:200`, `seeder.ts:212`), which are genuinely idempotent and
safe. The first structural change is to separate them, because only one half is
safe to run anywhere.

### 5.2 The rule that makes the rest simple

**A `users` row is only a functioning super admin when all of these hold:**

```sql
admin_level = 'super_admin'
AND deleted_at IS NULL
AND password IS NOT NULL
AND must_change_password = false
```

Call this an **active super admin**. A super admin who was invited but never set
their own password is _not_ active, because they may never activate. Every count
and every safety rail in 5.5 uses this predicate and nothing looser. Put it in
one helper, `countActiveSuperAdmins(tx)`, and never inline the condition.

### 5.3 Per environment

|                                   | Development           | Staging               | Production                                    |
| --------------------------------- | --------------------- | --------------------- | --------------------------------------------- |
| Who creates the first super admin | `seeder.ts`           | `seeder.ts`           | one shot CLI, never the seeder                |
| Credential source                 | env, defaults allowed | env, defaults refused | generated, printed to the operator's terminal |
| `admin_level`                     | `super_admin`         | `super_admin`         | `super_admin`                                 |
| `must_change_password`            | `false`               | `true`                | `true`                                        |
| `password_expires_at`             | `null`                | `null`                | `now + 30 minutes`                            |
| Re-runnable                       | yes, idempotent       | yes, idempotent       | no, refuses once one exists                   |

**Development.** Keep the seeder and change three things: set
`admin_level: "super_admin"`, set `must_change_password: false` so a developer
is not forced through the set password screen on every fresh database, and
replace the unconditional overwrite at `seeder.ts:192` with a no op that logs
"admin already exists, leaving password alone" unless
`SEED_RESET_ADMIN_PASSWORD=true` is set explicitly. A developer wanting a second
admin uses the real invite flow: Mailtrap is already configured
(`infrastructure/config/mailtrap.config.ts`), so the temporary password is
readable in the catcher inbox within the window.

**Staging.** Same seeder, distinct `ADMIN_EMAIL`, and an `ADMIN_PASSWORD` pulled
from the deployment secret store. The seeder must **refuse to start** when
`NODE_ENV !== "development"` and `ADMIN_PASSWORD` is unset or equal to
`WGxMWQP8RfIMjNWVTpJo`, rather than silently seeding a known credential. The seeded row
gets `must_change_password: true` with a **null** `password_expires_at`. This is
the case the two column split in 3.4 exists for: the credential never touched a
mailbox so there is nothing to time out, but the person who ends up using the
account should still own their own password rather than share the deploy secret.
They set it through the same `POST /auth/admin/set-password` every invitee uses.

**Production.** Do not run the admin half of `seeder.ts` at all. Bootstrap with
a one shot CLI, run manually against the production database:

```
pnpm --filter debridgers-backend admin:bootstrap --email=founder@debridgers.com \
  --first-name=Ada --last-name=Okafor
```

- Refuses with a non zero exit if `countActiveSuperAdmins() > 0`, unless
  `--force` is passed, see 5.6.
- Takes no password argument. It calls `generateTempPassword()` from 3.3 and
  prints the plaintext **once to stdout**, then discards it. Email is
  deliberately not used: at bootstrap time SMTP delivery is unproven, and the
  operator running the command is already at a trusted terminal.
- Writes the `users` row with `role: "admin"`, `admin_level: "super_admin"`,
  `must_change_password: true`, `password_expires_at: now + 30 minutes`.
- Writes the matching `admin_invites` row with `invited_by: null`, which is why
  that column is nullable in 3.9. Null there reads as "issued by the bootstrap,
  not by a person".
- Writes `admin_audit_log` with `admin_id: null`, action
  `SUPER_ADMIN_BOOTSTRAPPED`, resource type `user`.

After the first super admin has set their own password, delete `ADMIN_EMAIL` and
`ADMIN_PASSWORD` from the production environment. Their continued presence is
the thing this design exists to remove.

### 5.4 Journey A, first super admin end to end

Production. Steps 1 to 4 are the operator at a terminal; from step 5 onward the
path is identical to any invited admin.

1. **Operator runs the bootstrap CLI.**
   - Endpoint: none. Direct database connection, run from a deploy shell.
   - Database: preflight `SELECT count(*)` using the 5.2 predicate. Aborts if
     the result is greater than zero.
   - Sees: nothing yet.

2. **CLI creates the account, in one transaction.**
   - Database, `users`: `role: "admin"`, `admin_level: "super_admin"`,
     `password: bcrypt(temp, 12)`, `must_change_password: true`,
     `password_expires_at: now + 30 minutes`, `is_email_verified: false`.
   - Database, `admin_invites`: `status: "pending"`, `invited_by: null`,
     `expires_at` matching.
   - Database, `admin_audit_log`: `SUPER_ADMIN_BOOTSTRAPPED`, `admin_id: null`.

3. **CLI prints the credential and exits.**
   - Sees: the email, the temporary password, the login URL, and the absolute
     deadline. One line each, on stdout, once.
   - The plaintext is never written to a file, a log sink, or the audit
     `details` payload.

4. **Operator hands the credential to the founding super admin,** or is that
   person. Out of band, within the window.

5. **Founding super admin logs in.**
   - Endpoint: `POST /auth/admin/login`.
   - Database: `authAttempt` counters only.
   - Sees: redirect to `/auth/admin/set-password`, driven by
     `next: "set_password"`.

6. **They set their own password.**
   - Endpoint: `POST /auth/admin/set-password`.
   - Database, `users`: new hash, `must_change_password: false`,
     `password_expires_at: null`, `is_email_verified: true`, refresh rotated.
   - Database, `admin_invites`: `status: "activated"`, `activated_at` stamped.
   - Database, `admin_audit_log`: `ADMIN_INVITE_ACTIVATED`.
   - Sees: the admin dashboard. `countActiveSuperAdmins()` is now 1.

7. **They open Admins and invite the second person.**
   - Endpoint: `GET /admin/admins`, then `POST /admin/admins/invite`.
   - The tier select offers both values. Choosing `super_admin` here is how the
     platform stops depending on one person, and it should be the first thing
     done after bootstrap.
   - From here the flow is exactly Journey B in section 3.7, steps 3 to 11.

8. **The second super admin activates.**
   - `countActiveSuperAdmins()` is now 2, which is the point at which the safety
     rails in 5.5 stop being a trap, see the note there.

### 5.5 Both tiers come from the same endpoint

There is one invite endpoint and it carries a tier field:

```
POST /admin/admins/invite  { email, first_name, last_name, admin_level }
                                                           ^ "admin" | "super_admin"
```

- Only a super admin may call it, for either value. A normal admin cannot invite
  anyone, at any tier.
- The tier is decided at invite time and written to both the `users` row and the
  `admin_invites` row. The invitee never chooses or sees a tier field.
- Changing an existing admin's tier is a different endpoint,
  `PATCH /admin/admins/:id/level`, so promotion is a deliberate act with its own
  audit entry rather than a side effect of re-inviting.

Safety rails, all enforced against the active super admin predicate in 5.2:

| Operation                                                               | Rule                                                                                                  |
| ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `PATCH /admin/admins/:id/level` demoting self                           | Refused when the caller is the only active super admin. 409 with `LAST_SUPER_ADMIN`.                  |
| `PATCH /admin/admins/:id/level` demoting another                        | Refused when it would take the count to zero. Same predicate, same error.                             |
| `DELETE /admin/admins/:id` on self                                      | Always refused. Self removal is a separate deliberate flow and does not exist yet.                    |
| `DELETE /admin/admins/:id` on the last active super admin               | Refused, `LAST_SUPER_ADMIN`.                                                                          |
| `DELETE /admin/admins/invite/:id` revoking a pending super admin invite | Allowed. A pending invite is not an active super admin, so revoking it cannot take the count to zero. |
| Promotion to `super_admin`                                              | Never blocked. Nothing in this design makes it harder to add a super admin than to lose one.          |

Two implementation notes:

- All three mutating operations call the same helper,
  `assertNotLastSuperAdmin(tx, targetId)`. One predicate, one error, one place a
  test can point at.
- The count and the mutation must share a transaction with the candidate rows
  locked, either `SELECT ... FOR UPDATE` over the super admin rows or a
  `serializable` transaction. Without that, two concurrent demotions each see a
  count of 2, both pass, and the tier is emptied. This is the only genuine race
  in the design and it is worth the explicit lock.
- The rails are why step 8 of Journey A matters. With exactly one super admin,
  that person cannot demote or remove themselves, which is correct but leaves
  the platform with a single point of failure. Inviting a second super admin
  immediately after bootstrap is operational guidance, not an optional extra.

### 5.6 If every super admin is lost

Possible in practice: the sole super admin leaves, loses their credential, or
the account is compromised and blocked. The rails in 5.5 prevent this happening
through the API, but not through direct database access or a person simply
becoming unreachable.

Recovery is the bootstrap CLI with an explicit flag:

```
pnpm --filter debridgers-backend admin:bootstrap --force --email=...
```

- `--force` skips only the "no super admin exists" preflight. Everything else is
  identical: generated temporary password, 30 minute window, forced set password
  on first login, `SUPER_ADMIN_BOOTSTRAPPED` audit entry with `admin_id: null`.
- It requires production database credentials, so the authority to recover the
  tier is the authority to reach the database. That is the correct boundary.
- It does not demote or delete anyone. If an old super admin needs demoting, the
  recovered super admin does it through `PATCH /admin/admins/:id/level` and the
  action is audited.

What is deliberately **not** built: a recovery email, a break glass link, or any
self service path back into the top tier. Any such path is a permanent second
route into the highest privilege in the system, and it would be the weakest one.
Document the CLI in the runbook and leave it there.

---

## 6. Security

### 6.1 Passwords

Compose, do not fork. `passwordRule` from
`src/api/v1/auth/dto/register.dto.ts:4` stays the base: minimum 8 characters,
one uppercase, one digit, one special character.

`adminPasswordRule` extends it and is used by `POST /auth/admin/set-password`:

- Raise the minimum to 12. It is one `.min()` on a schema that otherwise
  composes `passwordRule`.
- Reject a password containing the local part of the email.
- Reject a password equal to the temporary one. Without this the set password
  step can be satisfied by pasting the credential that just arrived by email,
  which defeats the whole window.

Hashing stays `bcrypt` at cost 12 for both the temporary password and the chosen
one, matching `auth.service.ts:70` and `seeder.ts:179`. `token-hash.ts:3`
documents why refresh tokens use SHA256 while passwords stay on bcrypt. The
temporary password is a password, not a token, so it stays on bcrypt: it is
verified by the same `bcrypt.compare` in `loginAdmin` (`auth.service.ts:283`)
and gains nothing from a special case.

### 6.2 JWT and session

Two claims must reach the guards without a DB read, so both go in the token:
`admin_level` for the tier gate and `must_change_password` for the pending
password gate. The same three edits carry both, and all of them have to land
together:

| File                                          | Change                                                                                                                                                                 |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/interfaces/users/jwt.type.ts`            | add `admin_level: AdminLevel \| null` and `must_change_password: boolean` to `JwtPayload`                                                                              |
| `src/api/v1/auth/auth.service.ts:568`         | include both in the payload built by `generateTokens`, and widen the `user` parameter type, which today declares only `id`, `email`, `first_name`, `last_name`, `role` |
| `auth.guard.ts:80` and `refresh.guard.ts:246` | add both to the explicit field maps                                                                                                                                    |

Both guards rebuild `req.user` field by field, so a claim added to the payload
and not to the maps verifies fine and then arrives as `undefined` at the guard.
For `admin_level` that fails closed. For `must_change_password` an `undefined` is
falsy and therefore fails **open**, which is why 3.5 lists the three files as a
single unit rather than three independent changes. This is the same class of bug
the `AdminId` decorator comment describes, with a worse failure direction.

`generateTokens` is also the point where setting a password clears the gate: the
new token pair is issued from the freshly updated row, so the claim is false
from that instant. A token minted before the change still carries `true`, which
denies access it should now allow. Harmless, and resolved by the refresh the set
password response already returns.

Access tokens default to 15 minutes and refresh to 7 days
(`auth.service.ts:589`). Consider a shorter refresh window for admins, since 7
days is the outer bound on how long a demotion takes to bite.

### 6.3 Revocation

Removing an **active** admin is not a delete. `admin_audit_log.admin_id` is
`onDelete: "set null"` (`admin_audit_log.schema.ts:17`), so deleting the row
anonymises their entire history. A never activated pending admin is the
exception noted in 3.8: no history exists, so a hard delete is correct there.

`DELETE /admin/admins/:id` on an active admin should:

1. Refuse if the target is the last active super admin, per the shared
   `assertNotLastSuperAdmin` helper in 5.5.
2. Refuse if the target is the caller. Self removal is a separate deliberate flow.
3. Set `admin_level` to null and `role` to a non privileged value, or add an
   `is_active` style flag. Keep the row.
4. Clear `refresh_token` (`users.schema.ts:49`), which is what
   `AuthService.logout` already does (`auth.service.ts:356`). This kills refresh
   but not the outstanding access token, so the window is up to 15 minutes.
5. Deactivate every `admin_api_keys` row for that admin. Without this the removed
   admin keeps a working credential indefinitely, because `validateApiKey`
   (`admin-api-keys.service.ts:76`) checks only `is_active` on the key and never
   looks at the owning user. This is the highest severity item in this section.
6. Revoke any invites they issued that are still pending, applying the full
   revoke behaviour from 3.8 to each: `status: "revoked"`, and on the invited
   `users` row `password: null`, `admin_level: null`, `refresh_token: null`.
   A departing super admin must not leave live temporary credentials behind.
7. Audit entry `ADMIN_REMOVED`.

Note that `admin_api_keys.admin_id` is a bare `serial` with no foreign key
(`admin_api_keys.schema.ts:13`), so step 5 has to be explicit application code.
Converting that column to a proper `integer` reference with a cascade is a
worthwhile small migration alongside this work.

To close the 15 minute access token gap properly, `AdminLevelGuard` can read the
current level from the database on tier gated routes only. Those are a minority
of routes and the ones where staleness costs the most, so the round trip is
affordable there and avoidable everywhere else.

### 6.4 Audit logging

This is F9 with a concrete first set of call sites. `AuditLogService` already
exists and is injected nowhere, so admin lifecycle can be its first consumer.

| Action                     | Resource type  | Notes                                                                                      |
| -------------------------- | -------------- | ------------------------------------------------------------------------------------------ |
| `ADMIN_INVITED`            | `admin_invite` | details carry the email and the tier                                                       |
| `ADMIN_REINVITED`          | `admin_invite` | details carry `sent_count` after the bump                                                  |
| `ADMIN_INVITE_REVOKED`     | `admin_invite` |                                                                                            |
| `ADMIN_INVITE_EXPIRED`     | `admin_invite` | written by the login attempt that discovers the expiry, `admin_id` set to the pending user |
| `ADMIN_INVITE_ACTIVATED`   | `user`         | the invitee set their own password                                                         |
| `ADMIN_LEVEL_CHANGED`      | `user`         | details carry before and after                                                             |
| `ADMIN_REMOVED`            | `user`         |                                                                                            |
| `SUPER_ADMIN_BOOTSTRAPPED` | `user`         | `admin_id` null, written by the CLI                                                        |

`details` must never contain the temporary password, its hash, or any password.
The invite path never logs the plaintext at any level, including debug.
`ip_address` and `user_agent` come off the request; `AuthService.extractIp`
already exists for the first. The bootstrap CLI has no request, so both are
null there.

### 6.5 Rate limiting

`@Throttle(authThrottle(n))` is the established mechanism
(`src/api/shared/throttle.config.ts`), currently 5 per minute on login and
forgot password, 3 on admin login (`auth.controller.ts:157`).

| Endpoint                          | Limit                          | Reason                                                                                                                                               |
| --------------------------------- | ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST /auth/admin/login`          | 3 per minute per IP, unchanged | already set at `auth.controller.ts:157`. This is now also the temporary password's brute force ceiling, on top of the existing `authAttempt` lockout |
| `POST /auth/admin/set-password`   | 5 per minute per IP            | matches reset password. The endpoint is authenticated, so the throttle is a backstop, not the control                                                |
| `POST /admin/admins/invite`       | 10 per hour per admin          | limits use of the platform as a mail relay                                                                                                           |
| `POST /admin/admins/:id/reinvite` | 3 per hour per invite          | needs a per resource counter, not per IP, so this one is service level rather than `@Throttle`                                                       |

Two notes specific to the temporary password model:

- Brute forcing a 96 bit credential inside a 30 minute window is not a real
  threat. The login throttle and `authAttempt.checkAttemptAllowed`
  (`auth.service.ts:265`) already cover it, and no new mechanism is needed.
- Re-invite still needs the per invite cap enforced in the service against
  `sent_count` and `last_sent_at`, since an IP throttle does not stop one
  determined super admin mail bombing one address. It also has a real cost here
  that it did not have in the link model: every re-invite invalidates the
  previous temporary password, so an accidental double click locks out an
  invitee who is mid login.

The AdminPlan Phase 2 item "confirm rate limiting covers admin mutations"
covers the rest of `AdminController`, which is currently unthrottled.

---

## 7. Phased plan

Slots into the existing Phase 1 to 6 structure in AdminPlan.md. Nothing here
belongs in Phase 1, which is about making the current API correct.

### Phase 2a, tier without invites

Lands independently. No user visible change.

- [ ] `admin_level` enum and nullable column on `users`, migration reviewed by hand
- [ ] Seeder sets `admin_level: "super_admin"`, stops overwriting the password
- [ ] `admin_level` through `JwtPayload`, `generateTokens`, `AuthGuard`, `RefreshGuard`
- [ ] `countActiveSuperAdmins` helper per the predicate in 5.2
- [ ] `adminCan` and `AdminLevelGuard`, added to the class chain at `admin.controller.ts:117`
- [ ] `@MinAdminLevel("super_admin")` on the rows marked "no" in section 4
- [ ] `GET /admin/me` returns `admin_level` so the frontend can hide controls it cannot use

**Achieves:** two tiers enforced server side, with exactly one admin account.
Safe because the only existing admin is a super admin, so behaviour is unchanged.

### Phase 2b, audit call sites

Merges with the existing F9 line item. Do this before invites so the invite flow
has somewhere to write.

- [ ] Inject `AuditLogService` into `AdminService`
- [ ] Write from `suspendAgent`, `toggleBlockBuyer`, `approveWithdrawal`, `rejectWithdrawal`, `markCommissionPaid`
- [ ] `GET /admin/audit-log`, super admin only, paginated

### Phase 2c, the pending password gate

Lands before invites, because the gate is what makes a temporary credential safe
to issue. With no invites yet it is dead code that changes nothing.

- [ ] `must_change_password` and `password_expires_at` columns on `users`
- [ ] Both claims through `JwtPayload`, `generateTokens`, `AuthGuard`, `RefreshGuard`, as one commit
- [ ] `@AllowsPendingPassword()` decorator and the `AuthGuard` block returning `PASSWORD_CHANGE_REQUIRED`
- [ ] `loginAdmin` returns `must_change_password`, `password_expires_at`, `next`
- [ ] `loginAdmin` rejects an expired temporary credential **after** the bcrypt compare
- [ ] `adminPasswordRule` per section 6.1
- [ ] `POST /auth/admin/set-password`, allow listed, transactional
- [ ] Test: an account with the gate set gets 403 on every `AdminController` route

### Phase 2d, invites

- [ ] `admin_invites` schema, migration, index export
- [ ] `generateTempPassword` per section 3.3, with a test that the composition filter holds
- [ ] `AdminInvitesService`: invite, reinvite, revoke, activate, list
- [ ] Super admin endpoints on `AdminController`; set password on `AuthController`
- [ ] `ADMIN_INVITED` event, listener, `sendAdminInvite` on the email service
- [ ] Throttles per section 6.5, including the service level re-invite cap
- [ ] Audit writes per section 6.4
- [ ] Test: every edge case row in section 3.8

### Phase 2e, revocation completeness

- [ ] `DELETE /admin/admins/:id` implementing all seven steps in 6.3
- [ ] `PATCH /admin/admins/:id/level` with the rails in 5.5
- [ ] `assertNotLastSuperAdmin` in a locking transaction, with a concurrency test
- [ ] Migrate `admin_api_keys.admin_id` from `serial` to a referencing `integer`
- [ ] Fix F11 while in that file, since removal depends on the key list being truthful

### Phase 2f, frontend

Depends on Phase 3's typed client if it has landed, otherwise uses the current
fetch path.

- [ ] `routes/auth/admin-set-password.tsx` beside the existing admin login route
- [ ] Admin login redirects on `next: "set_password"` rather than on a boolean
- [ ] Countdown on the set password screen driven by `password_expires_at`
- [ ] `routes/dashboards/admin/admins.tsx`: list, invite with a tier select, re-invite, revoke, remove
- [ ] Hide super admin controls when `admin_level !== "super_admin"`, treating it as cosmetic only
- [ ] Handle 403 distinctly from 401, and `PASSWORD_CHANGE_REQUIRED` distinctly from `AdminLevelGuard`

### Phase 2g, production bootstrap

- [ ] Split `seeder.ts` so reference data and the admin insert are separately invokable
- [ ] Seeder sets `must_change_password` per the environment table in 5.3
- [ ] Refuse to seed an admin outside development when the password is unset or default
- [ ] Bootstrap CLI per section 5.3, including `--force` per 5.6
- [ ] Remove `ADMIN_EMAIL` and `ADMIN_PASSWORD` from non development environments
- [ ] Runbook entry for total super admin loss

---

## 8. Open questions

- Is `company` (`roles.type.ts:1`) a live role? If suppliers get their own
  portal, admin tiering should not accidentally become the model for that too.
- Does a super admin need to be able to log in as a normal admin for support?
  If yes, impersonation is its own design with its own audit requirements, and
  it should not be bolted onto the tier.
- Should expired pending admins be swept? Section 3.8 leaves the row in place
  with a dead credential and shows it as expired in the list. A nightly job that
  hard deletes never activated rows older than some period would keep the table
  tidy, but nothing breaks without it.
- Should an ordinary admin's password expire on a schedule the same way the
  temporary one does? The columns now support it. Recommend not doing it: forced
  rotation on a fixed clock is discredited, and the machinery exists for the
  invite case only.

Resolved since the first draft, kept here so the reasoning is not re-litigated:

- Demoting the last super admin is blocked by the same predicate and the same
  error as removing them. See 5.5.
- Invites do not create a token or a magic link. See 3.1.
