# Frontend conventions and compliance audit

Written 2026-07-25. This is debridgers' equivalent of Stayar's
`docs/frontend/Context.md` + `docs/Screens/Admin/Docs/context.md`, named to
match so knowledge transfers between the two repos.

Read this before touching `apps/debridgers-frontend` or any of the shared
packages. It locks in the standard and records where the code currently
violates it.

Source of the standard: Stayar's enforced rules, read directly from
`Stayar-V2/docs/Screens/Admin/Docs/context.md` (Rules 1-4 and the nine-item
style checklist), `docs/frontend/Context.md`, `docs/Screens/PRCorrections.md`
(real PR review feedback), and `docs/Screens/CODEREVIEW.md`. Stayar was read
read-only and was not modified.

## Current shape of the app

- `apps/debridgers-frontend` - React Router v7 framework mode, `app/`
  directory, central route table in `app/routes.ts`, SSR build output,
  Vercel + Dockerfile deploy targets.
- One app, four route groups: `landing`, `auth`, `dashboards/buyer`,
  `dashboards/agent`, `dashboards/admin`. Each dashboard group has its own
  `layout.tsx`.
- 39 route files, ~16,000 lines under `app/`.
- Shared packages: `packages/ui-web` (27 files, in use), `packages/ui-app`
  (12 files), `packages/api-client` (6 files, in use), `libs/shared-theme`,
  `libs/shared-utils`.
- Import counts from the app: `@debridgers/api-client` 33, `@debridgers/ui-web`
  17, `@debridgers/ui-app` 0.

## The standard

### Rule 1 - Pages are bare. Composition only.

A route file contains routing glue, local UI state, and composition of
imported components. Nothing else. No component function definitions, no
inline mock-data arrays, no type declarations, no helper functions, no static
table-column definitions.

Everything else moves to `app/components/<feature>/`, one folder per
feature, each with an `index.ts` barrel, **top level, never nested inside
`routes/`**.

This is the single most-violated rule in Stayar and it is the single
most-violated rule here.

### Rule 2 - One component per file. Always.

Repo-wide, no exceptions. A route file that exports or defines a second
component is a violation.

### Rule 3 - Check `packages/ui-web` before writing anything

`packages/ui-web/src/index.ts` is the manifest. Read it before writing any
input, button, select, switch, search box, pagination control, or card.
Hand-rolling something that already exists there is a review finding.

Currently exported and frequently re-invented in page files: `base-input-field`,
`dash-text-input`, `dash-email-input`, `dash-password-input`, `dash-number-input`,
`dash-date-input`, `dash-select`, `dash-select-input`, `dash-search-input`,
`dash-switch-input`, `dash-textarea-input`, `submit-button`, `button-primary`,
`button-secondary`, `pagination`, `product-card`, `primary-link`,
`secondary-link`, `whatsapp-link`, `app-logo`.

If you build something that is not page-specific, it belongs in `ui-web` and
must be exported from `src/index.ts`. Page-specific one-offs stay with the
page's feature folder.

### Rule 4 - Forms are RHF + Zod. No bare `useState` on a validated field.

Any field with a validation rule goes through `react-hook-form` +
`zodResolver`. Generic field schemas live in
`packages/ui-web/src/schemas/generics.ts`. Whole-form schemas live in
`packages/ui-web/src/schemas/<feature>/` and compose the generics rather than
redeclaring them. Never declare a schema inline in a component file.

### Rule 5 - Spacing is `gap`, never margin

No `mt-*`/`mb-*` between siblings. Wrap the group in a `flex flex-col gap-N`
or a `grid gap-N` instead. Adding a wrapper `div` is the point, not a
workaround.

`space-y-N` is **not** an acceptable substitute. It compiles to margin-top on
children, so it is the same disallowed mechanism under a different name.

Legitimate exceptions, and only these three: `mt-auto` (flex push-to-end),
negative offsets like `-mt-px` (border-overlap trick), and margin on an
`absolute`-positioned element, where `gap` does not apply.

### Rule 6 - Layout stacking switches at `lg:`, not `md:`

Any utility that flips `flex-col` to `flex-row`, or `grid-cols-1` to
`grid-cols-N`, uses `lg:`. Using `md:` creates a dead zone between 768px and
1024px where the sidebar is still in mobile mode but the content has already
crammed itself into a desktop layout.

Generic padding bumps (`md:px-*`, `md:py-*`) are breathing room, not a layout
switch, and may stay on `md:`.

### Rule 7 - `useState<Type>(...)` explicit generic on every call

Not just booleans. Every primitive and every non-literal initial value too.
Matches the global typing rule and Stayar's checklist item 3.

### Rule 8 - Comment syntax

- Single-line: `//`.
- Multi-line: one `/* ... */` block, never stacked `//` lines.
- JSX children: `{/* ... */}`, and only there.
- Section separators: `// === Section Name`. Never decorative rules.

`app/routes.ts` already uses `// === Landing Page Routes` correctly. That is
the house style.

### Rule 9 - Naming, exports, and where things live

- `app/components/<feature>/` - feature components, with an `index.ts` barrel.
- `app/hooks/` - app-wide UI hooks.
- `app/contexts/` - React contexts.
- `app/types/` - shared types.
- `app/utils/` - reusable functions. Any formatter or mapper not tied to one
  page's JSX belongs here, or in `libs/shared-utils` if more than one app
  could want it.
- Currency and dates go through one shared formatter built on
  `Intl.NumberFormat`, with the locale as a defaulted parameter, never a
  hardcoded `"en-NG"` and never a string-concatenated naira sign. This was an
  explicit PR correction in Stayar.

### Rule 10 - Accessibility floor

- Every `<img>` gets a real descriptive `alt`. `alt=""` only for genuinely
  decorative images with adjacent descriptive text, never as a lazy fix.
- Every icon-only button gets a real `aria-label` describing the specific
  action, not a generic verb.
- `type="button"` on every non-submit button.
- A clickable `div` becomes a real `<button type="button">` unless it contains
  a nested interactive element, in which case use `role="button"` +
  `tabIndex={0}` + an Enter/Space `onKeyDown`.

### Rule 11 - Motion comes from the shared variants file

Never declare an inline `initial`/`animate`/`exit` object, a one-off
`Variants`, or a bare `transition={{ duration: ... }}` in a component or page.
Import from `packages/ui-web/src/lib/motion/variants.ts`.

It exports timing tokens (`motionDuration`, `motionEase`), spring presets
(`springPanel` for surfaces, `springPop` for small lively elements), and named
variants (`fadeVariants`, `fadeUpVariants`, `fadeDownVariants`,
`dialogPanelVariants`, `backdropVariants`, `successPanelVariants`,
`swappedContentVariants`, `staggerItemVariants`, `staggerDelay`).

If a genuinely new motion is needed, add it there and name it after the job it
does, not the values it uses. Uniform motion is what makes an interface read as
deliberate rather than assembled, and a shared file is the only version of that
which survives more than one contributor.

### Rule 12 - Dialogs go through the engine

`packages/ui-web/src/lib/dialog/` owns responsive bottom-sheet-on-mobile and
centered-on-desktop layout, backdrop and Escape dismissal (both suppressed
mid-submission), stacking, focus trap and restore, body scroll lock, a blocking
loading overlay, and auto-close on route change.

Never build a bespoke `useState`-driven modal in a page again. Register the
dialog in `app/providers/dialog-registry.ts` and call
`triggerDialog('KEY', props)`.

Every submitting dialog uses `useDialogSubmission` for its
`idle`/`submitting`/`error`/`success` lifecycle rather than its own loading and
error `useState` pair. On success, render `DialogSuccessPanel` and hold the
dialog open for `DIALOG_SUCCESS_CLOSE_DELAY_MS` before closing. Closing the
instant a promise resolves reads as if nothing happened.

**Reference implementation: `REQUEST_PAYOUT`.** Copy its shape -
`packages/ui-web/src/components/agent/agent-request-payout-dialog.tsx`
(presentation), `app/components/dialogs/RequestPayoutDialog.tsx` (glue),
one line in `app/providers/dialog-registry.ts`, and
`triggerDialog("REQUEST_PAYOUT", {...})` at the call site.

Known debt: ten files still hand-roll `fixed inset-0` modals (`AuthModal`,
`AuthSuccessModal`, `buyer/orders`, `buyer/wallet`, `buyer/help`, `agent/help`,
`DashboardLayout`, and the landing overlays). Migrate them one at a time as
each is touched. `AuthModal` is the best next candidate - it has all four
states already.

### Rule 14 - Commit messages are one line with a conventional prefix

One line. No body, no bullet list, no `Co-Authored-By`, no trailer of any kind.
Imperative mood: "this commit will...".

Prefixes, per `CONTRIBUTING.md`: `feat:`, `fix:`, `chore:`, `refactor:`,
`test:`, `docs:`, `perf:`, `style:`.

```
feat: add product search filter
fix: correct price calculation on checkout
refactor: extract shared button component
```

Pick the prefix by what the commit _does to the product_, not by which files
moved. A refactor that also fixes a live bug is `fix:` - the bug is the part a
reader cares about.

Sign commits (`git commit -S`, or rely on the configured `commit.gpgsign` /
SSH signing) unless explicitly asked not to.

Do NOT use an em dash in a commit message, the same as everywhere else in this
repo.

### Rule 13 - Capacitor-safe habits

No raw `window.open`, no browser-only globals at module scope in shared
packages. Full reasoning in `docs/frontend/Platform.md`.

## Compliance audit - where the code stands today

### Violating: Rule 1, bare pages. Severe and systemic.

Every large route file carries inline components, inline mock data, and inline
types. Line counts:

| File                                            | Lines |
| ----------------------------------------------- | ----- |
| `app/routes/landing/shop.tsx`                   | 851   |
| `app/routes/landing/home.tsx`                   | 841   |
| `app/routes/dashboards/agent/settings.tsx`      | 714   |
| `app/routes/dashboards/admin/outreach.tsx`      | 633   |
| `app/routes/dashboards/agent/request-stock.tsx` | 588   |
| `app/routes/dashboards/buyer/overview.tsx`      | 585   |
| `app/routes/dashboards/buyer/settings.tsx`      | 577   |
| `app/routes/dashboards/agent/overview.tsx`      | 538   |
| `app/routes/landing/agents.tsx`                 | 536   |
| `app/routes/dashboards/admin/products.tsx`      | 528   |
| `app/routes/auth/signup.tsx`                    | 522   |
| `app/routes/landing/outreach.tsx`               | 505   |
| `app/routes/landing/contact.tsx`                | 456   |
| `app/routes/dashboards/buyer/shop.tsx`          | 431   |
| `app/routes/auth/verify-email.tsx`              | 410   |
| `app/routes/auth/forgot-password.tsx`           | 393   |

For comparison, Stayar treated tenant's 788-line `Settings.tsx` as a
significant violation worth calling out by name. There are five files here at
or near that size, and the whole `app/` tree is only 16,000 lines, so these
16 files are a large fraction of the entire frontend.

### Violating: components living inside `routes/`

`app/routes/dashboards/shared/` holds `DashboardLayout.tsx` (322 lines) and
`HeroGreetingCard.tsx`. These are components, not routes, and they sit inside
the route tree. Stayar hit this exact pattern in landlord's
`pages/dashboard/components/` and moved all of it out. These belong at
`app/components/dashboard/`.

### Violating: Rule 4, forms. Total.

- `react-hook-form`: **0 files**
- `zodResolver`: **0 files**
- `packages/ui-web/src/schemas/`: **does not exist**

Zod itself **is** used, but manually: `safeParse` called by hand in 5 files
(`login.tsx`, `signup.tsx`, `reset-password.tsx`, `forgot-password.tsx`,
`AuthModal.tsx`), with every schema declared inline in the page file and form
state on bare `useState` plus a hand-rolled `FormErrors<T>` map. So the
validation logic exists and is reasonable; what is missing is RHF to own the
state, and a `schemas/` folder to own the schemas. This is the rule Stayar's
reviewer repeated most often in `PRCorrections.md`, on four separate files in
one review.

Consequence worth noting: because the schemas are per-page copies rather than
shared, the signup password rule (`min(8)`) has silently drifted from the
backend's real rule, which also requires uppercase, a number, and a special
character. See `docs/backend/auth.md`.

### Violating: Rule 5, spacing. Moderate.

28 files use `mt-*`/`mb-*`. Good news: **0 files** use `space-y-*`, so the
harder half of this rule is already clean and only the direct-margin half
needs the sweep.

### Partially compliant: Rule 6, breakpoints

Only 6 files use `md:` at all, so the blast radius is small. Each needs a
read to separate genuine layout switches (move to `lg:`) from padding bumps
(leave alone).

### Compliant: Rule 7, `useState<Type>()`

40 files use the explicit generic form. This convention is already in place
and should simply be held.

### Compliant: Rule 8, section comments

`app/routes.ts` uses `// === ` separators correctly, as does
`packages/api-client/src/index.ts`.

### Dead or unused code

- **`components/` at the repo root is empty.** Zero files. Delete it or
  decide what it is for. Right now it is a trap that invites someone to put
  shared components in the wrong place.
- **`packages/ui-app` has 12 files and zero importers.** In Stayar the
  `app`/`web` package split is meaningful because `app` is the Ionic mobile
  kit and `web` is the admin kit. Debridgers has no Ionic app, so `ui-app`
  currently has no reason to exist. Either fold anything useful into `ui-web`
  and delete it, or document what it is reserved for.
- `packages/api-client` exports `buildAuthCookieHeaders` with zero consumers.
  See `docs/backend/auth.md`, this one is a security finding, not just dead
  code.

### Structural gap vs Stayar

Stayar's shared kit carries whole solved subsystems that debridgers has no
equivalent of, and which every page here therefore re-invents:

- **A dialog engine.** `DialogProvider` + a per-app registry + `useDialog` +
  `useDialogSubmission`, giving responsive bottom-sheet-on-mobile /
  centered-on-desktop, escape and backdrop dismiss, stacking, loading state,
  and a shared success panel. Debridgers has bespoke `useState` modals in page
  files. This is the highest-value single thing to port.
- **A data table primitive** owning search, sort, pagination, and
  loading/error/empty states.
- **A page heading primitive** owning the heading + subheading + right-aligned
  actions row.
- **A schemas package** with reusable field-level factories.
- **Server state via React Query.** `@tanstack/react-query` is not a
  dependency here at all. Every page hand-rolls fetch + loading + error state.

## Platform decisions (settled)

Folded in from the retired `Platform.md`. These are decided; do not re-litigate.

- **No Ionic, no Capacitor.** Stayar uses them only in its three role apps, each
  with its own `appId` for a separate app-store listing. Debridgers is React
  Router v7 framework mode on Vercel and has no native requirement. Adopting
  Ionic would mean surrendering SSR and splitting the app.
- **If a native app is ever needed** it is a NEW entry under `apps/`, consuming
  `packages/ui-web` and `packages/api-client`. Do not try to make one codebase
  be both an SSR web app and a Capacitor shell - Stayar's own structure is the
  evidence that fails.
- **Capacitor-safe habits kept anyway**, because they are cheap now and
  expensive to retrofit: no raw `window.open`, and no `window`/`document`/
  `localStorage` at module scope in shared packages.
- **One app, role-segmented routes.** Not per-role apps. Stayar's split was
  forced by the native requirement, which does not exist here; splitting would
  also widen cookie scope and fight the HttpOnly auth plan.

Still true and worth knowing: framework mode is present but there are **zero
`loader`/`action` exports** in `app/`. The app is an SSR framework running as a
client SPA. That is why tokens live in JS-readable cookies rather than HttpOnly
ones - see the auth section below.

## Auth: what shipped

Folded in from the retired `AuthPLAN.md`. All phases complete.

- **Transport**: axios-shaped `api-client` with **single-flight refresh**. The
  backend rotates the refresh token and stores one hash per user, so concurrent
  401s used to log people out; every caller now shares one in-flight refresh.
- **Services**: one file per endpoint under `api-client/src/services/auth/`.
  Public endpoints go through `publicRequest`, never `apiFetch` - a failed
  login legitimately 401s and must not trigger a refresh.
- **Schemas**: `ui-web/src/schemas/` with factory generics. `createPasswordSchema`
  mirrors the backend `passwordRule` exactly (8+, uppercase, number, symbol).
  Login deliberately does NOT apply strength rules - existing accounts predate
  them and would be locked out.
- **Hooks** live in `ui-web/src/hooks/auth/` behind an injected `AuthAdapter`,
  so the UI package never imports the API client or a router. The app supplies
  the adapter once in `providers/auth-adapter.tsx`.
- **Pages are composition only**: 1728 lines down to 602 across the five auth
  routes. `signup.tsx` went 522 to 89 and is driven by `ROLE_SIGNUP_CONFIG`.
- **Roles**: `SELF_REGISTERABLE_ROLES` is an explicit allow-list, not the full
  enum - adding a DB role must never silently make it self-registerable.
  `users.role` defaults to `buyer`, the least-privileged option.

**Adding a role (e.g. farmer)** is: the `UserRole` union, the allow-list, one
entry in `app/features/auth/config/roles.ts`, a `pgEnum` migration, and a
`<role>_profiles` table modelled on `agent_profiles`. No page, hook, or schema
changes.

**Known remaining auth debt** (was `docs/backend/auth.md`, still open):
tokens are in JS-readable cookies because `buildAuthCookieHeaders` has no
consumers - moving auth into loaders/actions is the real fix. One refresh hash
per user means one session per device.

## Open decisions

### 1. One app or per-role apps - DECIDED: one app

Debridgers keeps a single `apps/debridgers-frontend` with role-segmented
routes. Do not split into per-role apps.

Reasoning, recorded so this is not re-litigated:

- **Stayar's split was forced, not chosen.** Ionic plus Capacitor requires a
  separate `appId` per app-store listing, which is why tenant, agent, and
  landlord are separate apps. `landing-page` is separate because Ionic cannot
  do SSR and marketing needs SEO. `stayar-admin` is separate because it is
  desktop-only and web-only. None of those forcing functions exist here, since
  debridgers has decided against Ionic (`docs/frontend/Platform.md`).
- **Splitting actively fights the auth plan.** One origin is why HttpOnly
  cookies are straightforward here. Four apps on four subdomains would need
  `Domain=.debridgers.com`, widening cookie scope and adding cross-app session
  handoff, directly against `docs/frontend/AuthPLAN.md`.
- **Scale does not justify it.** The whole frontend is ~16,000 lines across 39
  route files. Stayar split at several times that size.
- **The shared-package rebuild tax is real.** Stayar documents it as "the
  rebuild step you cannot skip": consumers resolve the built `dist/`, so every
  shared-kit change needs a rebuild or you debug phantom "prop does not exist"
  errors. More apps means more of that.
- **Route-level code splitting already gives the main benefit.** React Router
  framework mode splits per route, so a buyer does not download admin code.

The one split that may become defensible later is landing versus dashboards,
on SEO and public-versus-authed grounds, the same reason Stayar keeps
`landing-page` apart. Not now, and note that `routes/landing/shop.tsx` (851
lines) and `routes/dashboards/buyer/shop.tsx` (431 lines) currently overlap,
which argues for sharing before separating.

**Separate apps would not fix the actual problem.** The problem is that code
inside the single app is organised by route rather than by feature. Splitting
would distribute that problem across four apps instead of solving it.

### 2. Sweep scope - REVISED: reference implementation first, then sweep

Originally scoped as a full sweep of every page before farmer work. Revised,
because sweeping toward a standard that no real code has validated means
sweeping twice.

Do what Stayar did: build one vertical end to end as the reference
implementation, then sweep against it. Stayar used `stayar-tenant` as the
reference app and `PermissionAuditLog.tsx` as the reference page, explicitly
labelled as such in their context doc.

Here the reference vertical is **auth**, per `docs/frontend/AuthPLAN.md`. Once
auth is feature-sliced, hooked, and thin, it becomes the pattern the buyer,
agent, and admin sweeps copy. Sweep by role after that, buyer first.

## Not yet analysed

These were assigned to background agents that failed before producing output.
They remain genuinely open:

- Stayar's backend auth implementation, for a side-by-side comparison with
  debridgers' (only the debridgers side is documented so far, in
  `docs/backend/auth.md`).
- Deployment and hosting comparison, including exactly what must be configured
  for cookie domain and CORS if debridgers is hosted the way Stayar is.
- Measured duplication between the buyer, agent, and admin route groups, which
  is the input to open decision 1.
- The farmer role's end-to-end checklist, which depends on the domain
  questions still outstanding.
