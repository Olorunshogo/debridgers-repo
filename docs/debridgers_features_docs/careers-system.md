# Debridgers Careers system

Last updated: 2026-09-11  
Branch intent: `feature/hr-system-clean` (and successors)  
Audience: any engineer picking up careers/staffing work.

This document describes what is shipped in code today, how to run it, and what is still unfinished. Prefer this over `docs/jottings/careers-system.md` (that file is a planning jotting and is stale).

---

## What this product is

A separate careers surface for Debridgers people and recruitment:

| Piece          | Path / port                                                                                                                   |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Frontend app   | `apps/debridgers-careers` (Vite + React Router 7), local port **5177**                                                        |
| Backend module | `apps/debridgers-backend/src/api/v1/careers/` under `/api/v1/careers`                                                         |
| API client     | `packages/api-client/src/services/careers/`                                                                                   |
| Schemas        | `careers.schema.ts`, `careers-ops.schema.ts`                                                                                  |
| Migration      | `0030_lying_midnight.sql` (original tables); table/enum renames and the `hr`/`hiring_manager` role drop are a later migration |
| Smoke script   | `docs/backend/apis_command/09-careers-security-smoke.sh`                                                                      |
| Job seeder     | `pnpm debridgers-backend:seed:careers-jobs`                                                                                   |

It is **not** inside `debridgers-admin`. Admins who staff hiring log into the careers app with an admin account.

---

## Roles (current policy)

| Role        | Used in careers today? | Purpose                                                 |
| ----------- | ---------------------- | ------------------------------------------------------- |
| `admin`     | Yes                    | Staffing: jobs, pipeline, offers, people-ops admin APIs |
| `applicant` | Yes                    | Apply, book interview, accept/reject offer              |
| `employee`  | Yes                    | Created on offer accept; contracts / employee APIs      |

**Staffing is admin-only.** The UI and `@Roles("admin")` on recruitment endpoints gate on `admin` alone. Careers is a public subdomain app, not a role - there is no `hr` / `hiring_manager` role in the `UserRole` enum anymore.

Auth stack on authenticated careers routes:

`AuthGuard → AdminKeyGuard → RolesGuard`

- Browser admin: JWT only. `AdminKeyGuard` checks `users.admin_tier` is set.
- Scripts may also send `X-Admin-Key` + `X-Admin-Tier` (same as `/admin`).
- Applicants and employees pass through `AdminKeyGuard` (non-admin short-circuit) into `RolesGuard`.

---

## Local setup

```bash
pnpm docker:up
pnpm db:migrate
pnpm debridgers-backend:seed               # creates admin if missing
pnpm debridgers-backend:seed:careers-jobs  # Frontend / Backend / BD / Content Creator
pnpm dev:backend                           # typically PORT=4002
pnpm dev:careers                           # http://localhost:5177
```

Env that matters for careers:

| Variable                                            | Where          | Why                                                        |
| --------------------------------------------------- | -------------- | ---------------------------------------------------------- |
| `ALLOWED_ORIGINS`                                   | backend `.env` | Must include `http://localhost:5177`                       |
| `CAREERS_APP_URL`                                   | backend `.env` | Verify / reset / login links for applicant/employee emails |
| `BUYER_APP_URL` / `AGENT_APP_URL` / `ADMIN_APP_URL` | backend `.env` | Role-specific email links (same `email-links.ts` helper)   |
| `APP_URL`                                           | backend `.env` | Fallback when a role URL is unset                          |
| `VITE_API_URL`                                      | careers app    | e.g. `http://localhost:4002/api/v1`                        |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD`                    | backend `.env` | Seeded admin; used by smoke script                         |
| Cloudinary keys                                     | backend `.env` | CV and employee doc uploads                                |

Admin login for staffing:

1. `http://localhost:5177/login`
2. Seeded `ADMIN_EMAIL` / `ADMIN_PASSWORD`
3. **Jobs & pipeline**

Applicant flow: apply on `/careers` (creates applicant with verified email on new apply), then login to the careers app.

---

## Hiring flow (the vertical that is live end-to-end)

```
Public careers → Apply (CV + account)
      → Admin screens / pass / reject (email on reject)
      → Interview (admin schedules OR applicant self-books)
      → Offer (team paid | intern/volunteer unpaid)
      → Applicant accepts → role becomes employee + contract slot
```

### Statuses

**Application:** `received` → `screening` → `passed` | `rejected`  
Booking an interview (staff or applicant) moves the application to `passed` when it was still `received` / `screening`.

**Interview:** `scheduled` | `completed` | `no_show` | `rescheduled`

**Offer:** `sent` | `accepted` | `rejected` | `expired`  
Offer create also inserts a pending `careers_sign_requests` row (`kind: contract`).

**Engagement on offer create:**

| Engagement  | Salary                       | Notes          |
| ----------- | ---------------------------- | -------------- |
| `team`      | Required (`salary_kobo` > 0) | Paid track     |
| `intern`    | `salary_kobo` must be `0`    | Unpaid for now |
| `volunteer` | `salary_kobo` must be `0`    | Unpaid for now |

Money is **kobo integers** everywhere (same rule as the rest of the monorepo).

---

## Backend: what exists

Module: `CareersModule` → `CareersController` + `CareersService` + `CareersPeopleService` + `CareersOpsService`.

### Public

| Method | Path                             | Notes                                                                             |
| ------ | -------------------------------- | --------------------------------------------------------------------------------- |
| GET    | `/careers/jobs`                  | Open jobs                                                                         |
| GET    | `/careers/jobs/:id`              | One open job                                                                      |
| POST   | `/careers/jobs/:id/applications` | Multipart apply + CV; creates applicant (`is_email_verified: true` for new users) |
| POST   | `/careers/webhooks/jotform-sign` | Public webhook (**no auth; known gap**)                                           |

### Applicant

| Method | Path                                      | Notes                                     |
| ------ | ----------------------------------------- | ----------------------------------------- |
| GET    | `/careers/me/applications`                | Includes latest interview when present    |
| POST   | `/careers/me/applications/:id/interviews` | Self-schedule / reschedule                |
| GET    | `/careers/me/offers`                      |                                           |
| POST   | `/careers/offers/:id/accept`              | Flips to `employee`, creates employee row |
| POST   | `/careers/offers/:id/reject`              |                                           |

### Admin staffing

| Method         | Path                                         | Notes                                                   |
| -------------- | -------------------------------------------- | ------------------------------------------------------- |
| GET/POST/PATCH | `/careers/admin/jobs`                        | List / create / update                                  |
| GET            | `/careers/admin/applications`                | Optional `?job_id=`                                     |
| GET            | `/careers/admin/applications/:id/cv`         | Signed Cloudinary download (public PDF URLs return 401) |
| PATCH          | `/careers/admin/applications/:id/screen`     | `screening` / `passed` / `rejected`                     |
| POST           | `/careers/admin/applications/:id/interviews` | Staff schedule                                          |
| PATCH          | `/careers/admin/interviews/:id`              | Feedback / reschedule                                   |
| POST           | `/careers/admin/applications/:id/offers`     | Email offer                                             |
| POST           | `/careers/admin/offers/:id/accept`           | Accept on behalf of applicant                           |

### People ops / ops (API present; UI mostly stubs)

These endpoints exist and are role-gated, but the careers frontend does not implement full UX yet:

- Directory, employee profile, admin employee update
- Leave requests + review
- Work activity reports + review
- Performance reviews + PIP
- Expenses, incidents, project reports
- Org chart
- Policies + acknowledgments
- Sign requests + employee docs upload
- Analytics (`GET /careers/admin/analytics`)

Key files:

- `careers.service.ts` — jobs, apply, screen, interviews, offers
- `careers-people.service.ts` — directory, leave, work reports
- `careers-ops.service.ts` — performance, expenses, incidents, policies, sign, analytics
- Emails in `email.service.ts` (`sendCareers*`) with role-aware links via `email-links.ts`

Smoke / security matrix:

```bash
BASE_URL=http://localhost:4002/api/v1 ./docs/backend/apis_command/09-careers-security-smoke.sh
```

---

## Frontend: what exists

App: `apps/debridgers-careers`

### Live pages

| Route                                                            | Who                          | Status                                        |
| ---------------------------------------------------------------- | ---------------------------- | --------------------------------------------- |
| `/careers`                                                       | Public                       | Lists open jobs                               |
| `/careers/:id`                                                   | Public                       | Job detail + apply form                       |
| `/login`, `/verify-email`, `/forgot-password`, `/reset-password` | Auth                         | Shared ui-web auth patterns                   |
| `/careers-dashboard`                                             | admin / applicant / employee | Overview cards by role                        |
| `/careers-dashboard/recruitment`                                 | admin                        | Create / list jobs                            |
| `/careers-dashboard/recruitment/jobs/:id`                        | admin                        | Pipeline: screen, CV, interview, offer        |
| `/careers-dashboard/applications`                                | applicant / employee         | Status + self-schedule interview              |
| `/careers-dashboard/offers`                                      | applicant / employee         | Accept / reject                               |
| `/careers-dashboard/contracts`                                   | applicant / employee         | Employee profile contract URL + sign requests |

### Stub pages (nav exists, UI placeholder only)

| Route                            | Intended later                                 |
| -------------------------------- | ---------------------------------------------- |
| `/careers-dashboard/people`      | Directory                                      |
| `/careers-dashboard/performance` | Reviews / PIP                                  |
| `/careers-dashboard/reports`     | Leave / work / expenses / incidents / projects |
| `/careers-dashboard/policies`    | Policy library                                 |
| `/careers-dashboard/analytics`   | Hiring / people metrics                        |

Shared theme: same tokens as other apps (`Syne`, `Open Sans`, brand CSS vars).  
Important: this app's spacing theme remaps named Tailwind widths. Prefer numeric max-widths (`max-w-120`) or `section-max-width`, not `max-w-md` / `max-w-3xl` (those collapse to rem spacing tokens).

---

## Important implementation notes

1. **CV viewing.** Cloudinary blocks anonymous PDF delivery (HTTP 401). Admin "View CV" calls `GET /careers/admin/applications/:id/cv` and opens a short-lived signed URL. New uploads use `resource_type: "raw"`.

2. **Email links.** Do not point all careers emails at `APP_URL=https://debridgers.com` in local. Set `CAREERS_APP_URL=http://localhost:5177` and restart the backend.

3. **Apply sets `is_email_verified: true`** for new applicant accounts so they can log in after apply. Existing unverified applicants can be repaired on re-apply. Verify-email still exists for other auth paths.

4. **Seeders skip existing rows** by job title for careers jobs. Changing seeder copy does not rewrite DB data; use a migration for corrections to live rows.

5. **Staffing is admin-only.** There is no `hr` / `hiring_manager` role to reintroduce - careers is a subdomain app, not a role. A future dedicated staffing role would need a fresh product decision and its own enum migration.

6. **Money.** Offer salary is kobo. UI collects naira for team offers and multiplies by 100 in the client.

---

## Still working on / next pickups

Ordered roughly by product value for the hiring vertical first, then people ops.

### High priority (finish recruitment UX)

- [ ] Admin attach / update `contract_url` after offer accept (API: `PATCH /careers/employees/:userId/docs`; careers UI missing)
- [ ] Pipeline: show interview history / feedback UI (API exists: `PATCH /careers/admin/interviews/:id`)
- [ ] Harden jotform-sign webhook (auth / signature verification)
- [ ] Clear "already passed" / empty states polish already started; keep admin feedback consistent
- [ ] Production env: `CAREERS_APP_URL`, CORS origin for `careers.` subdomain, Cloudinary PDF delivery settings

### Medium (people ops UI on existing APIs)

- [ ] Directory UI on `/careers-dashboard/people`
- [ ] Leave + work reports UI on `/careers-dashboard/reports`
- [ ] Performance + PIP UI
- [ ] Expenses / incidents / project reports UI
- [ ] Policies + acknowledgments UI
- [ ] Analytics dashboard on `/careers/admin/analytics`

### Later (product decisions)

- [ ] Paid internships / volunteer stipends (engagement salary rules)
- [ ] Richer employee docs (NIN, certificates) end-to-end UX
- [ ] Jotform Sign create-request flow from careers UI (API create exists)
- [ ] Org chart visualization

### Known gaps / tech debt

- Public jotform webhook has no auth
- `06-admin.sh` still documents legacy `X-Admin-Key-1/2` header names; live guard uses `X-Admin-Key` + `X-Admin-Tier`
- People-ops UI stubs can confuse testers; nav items for stubs should stay labeled or hidden until wired
- Old `Smoke QA` jobs may still exist closed in DBs that ran security smoke scripts

---

## How a new developer should start

1. Read this file.
2. Run local setup (migrate, seed, seed careers jobs, `dev:backend`, `dev:careers`).
3. Walk the happy path as admin and as applicant (two browsers / incognito).
4. Run `09-careers-security-smoke.sh`.
5. Pick an item from **Still working on** above; prefer finishing recruitment before expanding people-ops UI.
6. Keep money in kobo; keep pricing out of careers code; keep shared UI in `packages/ui-web` / `packages/api-client`.

---

## Related paths

| Concern                 | Location                                                                      |
| ----------------------- | ----------------------------------------------------------------------------- |
| Careers controller      | `apps/debridgers-backend/src/api/v1/careers/careers.controller.ts`            |
| Schemas                 | `.../schemas/careers.schema.ts`, `careers-ops.schema.ts`                      |
| Frontend routes         | `apps/debridgers-careers/app/routes.ts`                                       |
| API client              | `packages/api-client/src/services/careers/index.ts`                           |
| Auth role dashboard map | `packages/ui-web/src/hooks/auth/auth-context.tsx`                             |
| Email deep links        | `apps/debridgers-backend/src/notification/features/email/email-links.ts`      |
| Cloudinary signed docs  | `apps/debridgers-backend/src/infrastructure/cloudinary/cloudinary.service.ts` |
