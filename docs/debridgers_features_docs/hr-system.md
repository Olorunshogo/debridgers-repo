# Debridgers HR system

Last updated: 2026-09-09  
Branch intent: `feature/hr-system-clean` (and successors)  
Audience: any engineer picking up HR work.

This document describes what is shipped in code today, how to run it, and what is still unfinished. Prefer this over `docs/jottings/hr-system.md` (that file is a planning jotting and is stale).

---

## What this product is

A separate HR surface for Debridgers people and recruitment:

| Piece          | Path / port                                                       |
| -------------- | ----------------------------------------------------------------- |
| Frontend app   | `apps/debridgers-hr` (Vite + React Router 7), local port **5177** |
| Backend module | `apps/debridgers-backend/src/api/v1/hr/` under `/api/v1/hr`       |
| API client     | `packages/api-client/src/services/hr/`                            |
| Schemas        | `hr.schema.ts`, `hr-ops.schema.ts`                                |
| Migration      | `0030_lying_midnight.sql`                                         |
| Smoke script   | `docs/backend/apis_command/09-hr-security-smoke.sh`               |
| Job seeder     | `pnpm debridgers-backend:seed:hr-jobs`                            |

It is **not** inside `debridgers-admin`. Admins who staff hiring log into the HR app with an admin account.

---

## Roles (current policy)

| Role             | Used in HR today? | Purpose                                                 |
| ---------------- | ----------------- | ------------------------------------------------------- |
| `admin`          | Yes               | Staffing: jobs, pipeline, offers, people-ops admin APIs |
| `applicant`      | Yes               | Apply, book interview, accept/reject offer              |
| `employee`       | Yes               | Created on offer accept; contracts / employee APIs      |
| `hr`             | Enum only         | Reserved legacy name; not used for staffing gates       |
| `hiring_manager` | Enum only         | Reserved; not wired into staffing gates                 |

**Staffing is admin-only**, gated by desk:

- Super admin (`admin_tier: "super"`) can staff HR.
- Invited sub with `admin_desk: "hr"` can staff HR (same 2-header auth as other subs).
- Buyer / agent desks cannot call `/hr/admin/*` (403 from `AdminDeskGuard`).

Auth stack on authenticated HR admin routes:

`AuthGuard → AdminKeyGuard → RolesGuard → AdminDeskGuard` + `@AdminDesks("hr")`

- Super browser: JWT only.
- Sub (hr desk): JWT **plus** `X-Admin-Key` ∈ `SUPER_ADMIN_KEY_1|2` and `X-Admin-Tier: sub`. Set `VITE_ADMIN_SHARED_KEY` in the HR app to the same value.
- Applicants and employees pass through `AdminKeyGuard` (non-admin short-circuit) into `RolesGuard`.

Invite an HR admin from the main admin app: **Admin Invites → Desk = HR**.

---

## Local setup

```bash
pnpm docker:up
pnpm db:migrate
pnpm debridgers-backend:seed          # creates admin if missing
pnpm debridgers-backend:seed:hr-jobs  # Frontend / Backend / BD / Content Creator
pnpm dev:backend                      # typically PORT=4002
pnpm dev:hr                           # http://localhost:5177
```

Env that matters for HR:

| Variable                                            | Where          | Why                                                        |
| --------------------------------------------------- | -------------- | ---------------------------------------------------------- |
| `ALLOWED_ORIGINS`                                   | backend `.env` | Must include `http://localhost:5177`                       |
| `HR_APP_URL`                                        | backend `.env` | Verify / reset / login links for applicant/employee emails |
| `BUYER_APP_URL` / `AGENT_APP_URL` / `ADMIN_APP_URL` | backend `.env` | Role-specific email links (same `email-links.ts` helper)   |
| `APP_URL`                                           | backend `.env` | Fallback when a role URL is unset                          |
| `VITE_API_URL`                                      | HR app         | e.g. `http://localhost:4002/api/v1`                        |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD`                    | backend `.env` | Seeded admin; used by smoke script                         |
| Cloudinary keys                                     | backend `.env` | CV and employee doc uploads                                |

Admin login for staffing:

1. `http://localhost:5177/login`
2. Seeded `ADMIN_EMAIL` / `ADMIN_PASSWORD`
3. **Jobs & pipeline**

Applicant flow: apply on `/careers` (creates applicant with verified email on new apply), then login to the HR app.

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
Offer create also inserts a pending `hr_sign_requests` row (`kind: contract`).

**Engagement on offer create:**

| Engagement  | Salary                       | Notes          |
| ----------- | ---------------------------- | -------------- |
| `team`      | Required (`salary_kobo` > 0) | Paid track     |
| `intern`    | `salary_kobo` must be `0`    | Unpaid for now |
| `volunteer` | `salary_kobo` must be `0`    | Unpaid for now |

Money is **kobo integers** everywhere (same rule as the rest of the monorepo).

---

## Backend: what exists

Module: `HrModule` → `HrController` + `HrService` + `HrPeopleService` + `HrOpsService`.

### Public

| Method | Path                        | Notes                                                                             |
| ------ | --------------------------- | --------------------------------------------------------------------------------- |
| GET    | `/hr/jobs`                  | Open jobs                                                                         |
| GET    | `/hr/jobs/:id`              | One open job                                                                      |
| POST   | `/hr/jobs/:id/applications` | Multipart apply + CV; creates applicant (`is_email_verified: true` for new users) |
| POST   | `/hr/webhooks/jotform-sign` | Public webhook (**no auth; known gap**)                                           |

### Applicant

| Method | Path                                 | Notes                                     |
| ------ | ------------------------------------ | ----------------------------------------- |
| GET    | `/hr/me/applications`                | Includes latest interview when present    |
| POST   | `/hr/me/applications/:id/interviews` | Self-schedule / reschedule                |
| GET    | `/hr/me/offers`                      |                                           |
| POST   | `/hr/offers/:id/accept`              | Flips to `employee`, creates employee row |
| POST   | `/hr/offers/:id/reject`              |                                           |

### Admin staffing

| Method         | Path                                    | Notes                                                   |
| -------------- | --------------------------------------- | ------------------------------------------------------- |
| GET/POST/PATCH | `/hr/admin/jobs`                        | List / create / update                                  |
| GET            | `/hr/admin/applications`                | Optional `?job_id=`                                     |
| GET            | `/hr/admin/applications/:id/cv`         | Signed Cloudinary download (public PDF URLs return 401) |
| PATCH          | `/hr/admin/applications/:id/screen`     | `screening` / `passed` / `rejected`                     |
| POST           | `/hr/admin/applications/:id/interviews` | Staff schedule                                          |
| PATCH          | `/hr/admin/interviews/:id`              | Feedback / reschedule                                   |
| POST           | `/hr/admin/applications/:id/offers`     | Email offer                                             |
| POST           | `/hr/admin/offers/:id/accept`           | Accept on behalf of applicant                           |

### People ops / ops (API present; UI mostly stubs)

These endpoints exist and are role-gated, but the HR frontend does not implement full UX yet:

- Directory, employee profile, admin employee update
- Leave requests + review
- Work activity reports + review
- Performance reviews + PIP
- Expenses, incidents, project reports
- Org chart
- Policies + acknowledgments
- Sign requests + employee docs upload
- Analytics (`GET /hr/admin/analytics`)

Key files:

- `hr.service.ts` — jobs, apply, screen, interviews, offers
- `hr-people.service.ts` — directory, leave, work reports
- `hr-ops.service.ts` — performance, expenses, incidents, policies, sign, analytics
- Emails in `email.service.ts` (`sendHr*`) with role-aware links via `email-links.ts`

Smoke / security matrix:

```bash
BASE_URL=http://localhost:4002/api/v1 ./docs/backend/apis_command/09-hr-security-smoke.sh
```

---

## Frontend: what exists

App: `apps/debridgers-hr`

### Live pages

| Route                                                            | Who                          | Status                                        |
| ---------------------------------------------------------------- | ---------------------------- | --------------------------------------------- |
| `/careers`                                                       | Public                       | Lists open jobs                               |
| `/careers/:id`                                                   | Public                       | Job detail + apply form                       |
| `/login`, `/verify-email`, `/forgot-password`, `/reset-password` | Auth                         | Shared ui-web auth patterns                   |
| `/hr-dashboard`                                                  | admin / applicant / employee | Overview cards by role                        |
| `/hr-dashboard/recruitment`                                      | admin                        | Create / list jobs                            |
| `/hr-dashboard/recruitment/jobs/:id`                             | admin                        | Pipeline: screen, CV, interview, offer        |
| `/hr-dashboard/applications`                                     | applicant / employee         | Status + self-schedule interview              |
| `/hr-dashboard/offers`                                           | applicant / employee         | Accept / reject                               |
| `/hr-dashboard/contracts`                                        | applicant / employee         | Employee profile contract URL + sign requests |

### Stub pages (nav exists, UI placeholder only)

| Route                       | Intended later                                 |
| --------------------------- | ---------------------------------------------- |
| `/hr-dashboard/people`      | Directory                                      |
| `/hr-dashboard/performance` | Reviews / PIP                                  |
| `/hr-dashboard/reports`     | Leave / work / expenses / incidents / projects |
| `/hr-dashboard/policies`    | Policy library                                 |
| `/hr-dashboard/analytics`   | Hiring / people metrics                        |

Shared theme: same tokens as other apps (`Syne`, `Open Sans`, brand CSS vars).  
Important: this app’s spacing theme remaps named Tailwind widths. Prefer numeric max-widths (`max-w-120`) or `section-max-width`, not `max-w-md` / `max-w-3xl` (those collapse to rem spacing tokens).

---

## Important implementation notes

1. **CV viewing.** Cloudinary blocks anonymous PDF delivery (HTTP 401). Admin “View CV” calls `GET /hr/admin/applications/:id/cv` and opens a short-lived signed URL. New uploads use `resource_type: "raw"`.

2. **Email links.** Do not point all HR emails at `APP_URL=https://debridgers.com` in local. Set `HR_APP_URL=http://localhost:5177` and restart the backend.

3. **Apply sets `is_email_verified: true`** for new applicant accounts so they can log in after apply. Existing unverified applicants can be repaired on re-apply. Verify-email still exists for other auth paths.

4. **Seeders skip existing rows** by job title for HR jobs. Changing seeder copy does not rewrite DB data; use a migration for corrections to live rows.

5. **`hr` / `hiring_manager` roles** are not the staffing path. Do not reintroduce them into recruitment `@Roles` without an explicit product decision for `hr_admin`.

6. **Money.** Offer salary is kobo. UI collects naira for team offers and multiplies by 100 in the client.

---

## Still working on / next pickups

Ordered roughly by product value for the hiring vertical first, then people ops.

### High priority (finish recruitment UX)

- [ ] Admin attach / update `contract_url` after offer accept (API: `PATCH /hr/employees/:userId/docs`; HR UI missing)
- [ ] Pipeline: show interview history / feedback UI (API exists: `PATCH /hr/admin/interviews/:id`)
- [ ] Harden jotform-sign webhook (auth / signature verification)
- [ ] Clear “already passed” / empty states polish already started; keep admin feedback consistent
- [ ] Production env: `HR_APP_URL`, CORS origin for `hr.` subdomain, Cloudinary PDF delivery settings

### Medium (people ops UI on existing APIs)

- [ ] Directory UI on `/hr-dashboard/people`
- [ ] Leave + work reports UI on `/hr-dashboard/reports`
- [ ] Performance + PIP UI
- [ ] Expenses / incidents / project reports UI
- [ ] Policies + acknowledgments UI
- [ ] Analytics dashboard on `/hr/admin/analytics`

### Later (product decisions)

- [ ] Dedicated `hr_admin` role + separate dashboard (replace temporary admin staffing)
- [ ] Paid internships / volunteer stipends (engagement salary rules)
- [ ] Richer employee docs (NIN, certificates) end-to-end UX
- [ ] Jotform Sign create-request flow from HR UI (API create exists)
- [ ] Org chart visualization

### Known gaps / tech debt

- Public jotform webhook has no auth
- `06-admin.sh` still documents legacy `X-Admin-Key-1/2` header names; live guard uses `X-Admin-Key` + `X-Admin-Tier`
- People-ops UI stubs can confuse testers; nav items for stubs should stay labeled or hidden until wired
- Old `Smoke QA` jobs may still exist closed in DBs that ran security smoke scripts

---

## How a new developer should start

1. Read this file.
2. Run local setup (migrate, seed, seed HR jobs, `dev:backend`, `dev:hr`).
3. Walk the happy path as admin and as applicant (two browsers / incognito).
4. Run `09-hr-security-smoke.sh`.
5. Pick an item from **Still working on** above; prefer finishing recruitment before expanding people-ops UI.
6. Keep money in kobo; keep pricing out of HR code; keep shared UI in `packages/ui-web` / `packages/api-client`.

---

## Related paths

| Concern                 | Location                                                                      |
| ----------------------- | ----------------------------------------------------------------------------- |
| HR controller           | `apps/debridgers-backend/src/api/v1/hr/hr.controller.ts`                      |
| Schemas                 | `.../schemas/hr.schema.ts`, `hr-ops.schema.ts`                                |
| Frontend routes         | `apps/debridgers-hr/app/routes.ts`                                            |
| API client              | `packages/api-client/src/services/hr/index.ts`                                |
| Auth role dashboard map | `packages/ui-web/src/hooks/auth/auth-context.tsx`                             |
| Email deep links        | `apps/debridgers-backend/src/notification/features/email/email-links.ts`      |
| Cloudinary signed docs  | `apps/debridgers-backend/src/infrastructure/cloudinary/cloudinary.service.ts` |
