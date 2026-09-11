# Debridgers

B2B food procurement and distribution in Kaduna. Buyers order packages of grain,
beans and oil; agents sell in the field; admins run fulfilment. Nest API,
React Router 7 frontend, Postgres via Drizzle, pnpm workspaces orchestrated by
nx.

## Layout

| Path                                     | What it is                                                                                                                                  |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/debridgers-backend`                | Nest API, Drizzle schema, migrations, seeders                                                                                               |
| `apps/debridgers-marketing`              | React Router 7 app: marketing site and auth entry point (login, signup, password flows). Ports 5173                                         |
| `apps/debridgers-buyer`                  | React Router 7 app: buyer dashboard, its own login. Port 5174                                                                               |
| `apps/debridgers-agent`                  | React Router 7 app: agent dashboard, its own login. Port 5175                                                                               |
| `apps/debridgers-admin`                  | React Router 7 app: admin dashboard, its own login. Port 5176                                                                               |
| `apps/debridgers-careers`                | React Router 7 app: public job board + applicant/employee/admin staffing. Port 5177. Doc: `docs/debridgers_features_docs/careers-system.md` |
| `packages/pricing`                       | **Money rules. The source of truth.** Delivery, cost-to-serve, minimum order, procurement maths, business assumptions                       |
| `packages/ui-web`                        | Shared components and hooks. Anything used by more than one role belongs here                                                               |
| `packages/api-client`                    | Fetch layer, auth tokens, cookies                                                                                                           |
| `libs/shared-theme`, `libs/shared-utils` | Tokens, email templates                                                                                                                     |
| `docs/business`                          | Company, model, diagnosis, strategy. Start at `docs/business/README.md`                                                                     |

## Rules that are not obvious

**Never restate a money figure.** Every rate, floor, cap, taper and threshold
lives in `packages/pricing` and is imported. A second copy is exactly how a
₦1,400 placeholder unit price survived in three documents and two code paths for
months. Backend callers import `@debridgers/pricing` directly and turn its
framework-free errors into a Nest `BadRequestException` themselves; nothing in
the backend adds numbers of its own.

**Seeders do not touch existing rows.** They populate an empty table and skip
otherwise. Fixing a price, a unit or a zone in `catalog.ts` or `seeder.ts`
changes _nothing_ in a database that already has data. Every such correction
needs a migration as well, or the fix ships to no one. This has bitten twice.

**A shared package must not import a framework.** `packages/pricing` is consumed
by both Nest and the browser, so it may not import from `@nestjs/*`. It reports
errors as values and lets each caller raise its own.

**Packages the backend imports at runtime must be built.** Vite bundles TS
source, so `api-client` gets away with pointing `main` at `src`. Node cannot,
so anything the API imports must build to `dist` with tsup and point `main`
there. `nx.json` gives `build`, `test`, `typecheck`, `serve` and `dev` a
`dependsOn: ["^build"]` for this reason - without it on `serve`, the dev server
starts before its workspace dependencies exist and dies with
`ERR_MODULE_NOT_FOUND`.

**pnpm links strictly.** A type package present in the store is not visible to a
workspace that has not declared it. Ambient types like `@types/node` and
`vite/client` must be in that package's own `devDependencies`, not merely
somewhere in the tree.

**There are two Paystack webhook endpoints.** `/api/v1/webhook`
(`PaystackWebhookController`) is the one Paystack is configured to call.
`/api/v1/payment/webhook` (`PaymentService.handleWebhook`) also exists, handles
`charge.success` with different logic, and is IP-allowlisted to Paystack's
ranges so it cannot be curled locally. A change to one is invisible unless the
other gets it too. Both credit dedicated-account transfers, keyed on the
Paystack reference, so money lands once even if both receive it.

**Money is kobo, integers, everywhere.** Naira appears only in display strings.

**Wallet crediting has one door.** `LedgerService` is the only thing that may
write `buyerWallets.available_balance` or insert into `walletTransactions`.
Idempotency for unsolicited credits rests on the unique index over
`wallet_transactions.reference`, not on webhook delivery ids.

**Shared frontend code goes in `packages/ui-web`.** If two roles use it, it is
not app code. `app/routes/dashboards/` holds routes and nothing else - there is
no `shared/` directory there. `DashboardLayout` is the one deliberate exception,
because it owns session state and pushing it into the package would mean
threading auth through every role layout - each of `debridgers-buyer`,
`debridgers-agent` and `debridgers-admin` keeps its own copy, simplified to
guard on that app's single role rather than switching between dashboards.

**Each dashboard is its own app, with its own session.** `debridgers-marketing`,
`debridgers-buyer`, `debridgers-agent` and `debridgers-admin` are separate
Vite/React Router builds, meant to be served from separate subdomains. There is
deliberately no shared cookie domain across them - each manages its own login
independently, which is why every dashboard app carries a minimal `/login`
route rather than pointing at the marketing app's. `AuthProvider`/`useAuth`
moved to `packages/ui-web` because all four apps need it; the app-shell glue
around it (`PlatformConfigContext`, the dialog registry and its dialogs, the
auth/payment adapters, `features/auth`, `features/cart`) is still duplicated
per app rather than hoisted, since only `debridgers-marketing` needs some of it
(the public shop's cart, the auth-gate dialog) and pushing all of it into
`ui-web` was out of scope for the split itself.

## Commands

```bash
pnpm docker:up                  # postgres + redis
pnpm db:migrate                 # apply migrations
pnpm dev:backend                # nx serve, builds workspace deps first
pnpm dev:marketing              # port 5173
pnpm dev:buyer                  # port 5174
pnpm dev:agent                  # port 5175
pnpm dev:admin                  # port 5176
pnpm dev:careers                # port 5177
pnpm --filter @debridgers/debridgers-backend exec vitest run   # 8 suites
pnpm --filter @debridgers/pricing test
```

Backend tests create, migrate and truncate a real Postgres per suite. Without a
database they skip rather than fail, so a green run that says "skipped" has
proven nothing about the money paths.

## Conventions

- Section dividers are `// === Name`. Never decorative rules (no `---`, no `===...===`).
- Comment the non-obvious _why_, never the what. If a block is obvious without a comment, it gets none.
- Explicit type annotations on state, even where inference would do.
- No em dashes in markdown, commit messages or documentation.
- Commits are one line with a conventional prefix, and signed.

### Comment placement (locked, do not relitigate)

A comment goes in exactly one place: **at the top**, above the declaration,
block, or function it explains. There is no trailing-comment exception -
not even a short one.

- Never wedge a comment between the members of an interface, object literal,
  props type, or enum, however short. `deliveryWindow: DateRange; // buyer-supplied`
  is banned exactly as much as a multi-line block would be. If a field needs
  explaining, the explanation goes once at the top of the whole declaration,
  naming the field(s) it covers when it explains more than one.
- Never scatter a comment per statement inside a function body. One comment
  above the block it explains, not one trailing each line.
- If a block reads fine once its inline comments are removed, delete them -
  do not invent a top-of-block comment to replace them.
- The same applies inside JSX: a `{/* */}` block sits above the component or
  the subtree it explains, never wedged between sibling elements or props.

```ts
// WRONG - trailing, however short
export interface OrderPayload {
  deliveryWindow: DateRange; // buyer-supplied, not the agent's
  quantity: number;
}

// RIGHT - one comment, once, at the top
// Delivery window is buyer-supplied; agents can't set it.
export interface OrderPayload {
  deliveryWindow: DateRange;
  quantity: number;
}
```

**Line breaks inside a multi-line comment:** one sentence per line. A new
line starts right after a sentence's full stop, never mid-sentence to fit a
column width - the number of full stops is the number of lines, however long
any one line ends up.

### Inline field errors from the backend

Any endpoint validated by `ZodValidationPipe` already returns
`{ message, errors: [{ field, message }] }` on a 400, where `field` is the
DTO's snake_case key. A business-rule exception that is really about one
form field (a conflict, a wrong current password, an unresolvable bank
account) should throw the same shape by hand -
`throw new BadRequestException({ message, errors: [{ field: "bank_code", message }] })`

- rather than a plain string, so the frontend never has to special-case it.

On the frontend, `@debridgers/ui-web` turns that shape into a per-field
error generically, with no per-field hardcoding anywhere:

- React Hook Form: `applyServerFieldErrors(error, form)` in a hook's catch
  block calls `form.setError()` for every backend field that matches a real
  form field (snake_case to camelCase).
- Plain `useState` forms: `extractServerFieldErrors(error)` returns a
  `Record<string, string>` to merge into the form's own field-error state.
- Dialogs built on `useDialogSubmission` get this for free - it already
  exposes a `fieldErrors` map alongside `error`, computed the same way.

Only attribute an error to a field when it is genuinely about that one
input's value. A whole-form precondition ("add a bank account first",
"insufficient balance") stays a top banner - it is not the shape of any one
field, and inventing a field for it just to look consistent is wrong.
