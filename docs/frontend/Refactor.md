# Platform Refactor

What we are trying to achieve, and the plan to get there.

All eight phases and the cross-cutting packaging fix are complete. No
deployment has been run: the image is proven to build and boot, the pipeline
around it is proven only to parse.

## The goal

Six things, in plain terms.

1. **A new environment can be built from this repository.** Clone, migrate,
   seed, run.
2. **Delivery photos actually upload.** Proof of delivery is the record that an
   order was fulfilled, and today it cannot be saved.
3. **The site works on the shop page.** The header, the cart and the navigation.
4. **Checkout tells the truth.** No misleading totals, no unexplained states, no
   basket that is refused only at the last step.
5. **An admin can run pricing without a deploy.** Zone rates, delivery
   promotions, and a buying desk that computes its own targets.
6. **The dashboards are organised by role**, and the backend is deployable.

Underneath all six is one rule that does not change:
**`packages/pricing` is the source of truth for every rate, floor, cap and
threshold.** Nothing restates a money figure. A second copy is how a ₦1,400 unit
price outlived the product it described.

---

## Key terms

**Package.** One unit of goods occupying one slot in a vehicle. A 50kg bag of
rice and a 25 litre keg of oil are each one package. Delivery is priced per
package because what fills a vehicle is slots.

**Zone base fee.** The delivery charge covering the first two packages to a
zone, set to the measured cost of one trip. Kaduna South was measured at ₦4,000
for a two-package leg.

**The taper.** The reason packages 7 and up cost less each than packages 3 to 6.
The cost of a delivery is the trip, not the bag: a vehicle carrying one package
costs very nearly what the same vehicle carrying six costs. A flat per-package
rate would over-charge exactly the large B2B order the business depends on, so
the schedule descends. One invariant, at every zone:

```
tier two < tier one
```

Rates are per zone, because distance changes what a marginal package costs and
not only what the trip costs.

**Delivery cap.** A ceiling on the fee for one drop.

**Individual-quote threshold.** Above 20 packages or ₦750,000 of goods the
tapered table stops covering the vehicle. Such an order should be flagged for an
admin to quote by hand, not sold silently below cost.

**Cost-to-serve fee.** 3% of the items subtotal, floor ₦500, cap ₦5,000. It
covers the payment rail plus order admin, invoicing, reconciliation, support and
the replacement provision. It is not a profit line; it stops the cost of serving
an order from eating the margin on the goods. Profit comes from the procurement
spread.

**Minimum order.** ₦25,000 **or** 2 packages for delivery. Either satisfies it.

It does **not** refuse the buyer. Below it, the order goes through and the buyer
admin is told to batch the drop with another in the same zone, which is what
recovers the trip cost. The rule is about our per-drop solvency, and putting our
operating problem in front of someone who wants one keg of oil is the wrong
trade: they feel a rule that is ours, not theirs, and we lose the sale as well
as the margin. Reported as `belowMinimumOrder` on the order totals.

---

## Phase 0: a repository that can build a database. DONE

**The problem.** A fresh database could not be provisioned at all, and the
delivery taper had been flattened.

`0000_reflective_stature.sql` was a drizzle introspection stub. That command
emits its output inside a `/* */` block as a safety measure, and the file was
committed still commented, so the migration that creates the entire schema
created nothing. Every migration after it failed on missing tables. The same
file also carried operator classes drizzle had typed wrongly, including a
boolean column declared as `int4_ops`, which Postgres rejects outright.

Regenerating the migration set had also dropped every data statement in the old
`0021` and `0022`: zone base fees, the Chikun area correction, the 100kg unit
fixes, the millet listing and the order-source backfill. A rebuilt database came
back with a ₦500 zone base and bags labelled 25kg that hold 100kg.

Separately the taper had been set to ₦500 and ₦500, which is flat, and compiled
`.js` files had been committed into `packages/pricing/src`, where they won
module resolution over the `.ts` beside them, so an edited rate had no effect.

**What was done.**

| Change                                                                             | Where                                     |
| ---------------------------------------------------------------------------------- | ----------------------------------------- |
| Uncommented the baseline schema and removed the bad operator classes               | `migrations/0000_reflective_stature.sql`  |
| Retired the superseded `0021` and `0022` and removed them from the journal         | `migrations/`, `meta/_journal.json`       |
| Restored every dropped data correction in one idempotent migration                 | `migrations/0024_zone_catalogue_data.sql` |
| Restored the taper as a band, with the band as the only revert control             | `packages/pricing/src/delivery-fee.ts`    |
| Derived the seeder's zone rates from that same mapping                             | `seeders/seeder.ts`                       |
| Served the per-zone taper and cap so clients stop quoting against defaults         | `public.controller.ts`                    |
| Deleted the committed build output and gitignored it                               | `packages/pricing/src`, `.gitignore`      |
| Listed Procurement Targets and Buyer Management, which were routed but unreachable | `use-dashboard-nav.ts`                    |
| Added tests for the taper invariant, the revert contract and the minimum order     | two spec files                            |

### The taper band

The locked schedule descends steeply, ₦700 to ₦400 at Kaduna South and ₦1,000 to
₦600 at Chikun. We run a shallower version of the same shape inside a ₦500 to
₦600 operating band, until a second delivery cost measurement lands.

The mapping is linear, which preserves both the descent within a zone and the
ordering between zones:

| Zone         | Locked        | Live        | Descends |
| ------------ | ------------- | ----------- | -------- |
| Kaduna South | ₦700 / ₦400   | ₦550 / ₦500 | yes      |
| Kaduna North | ₦800 / ₦450   | ₦565 / ₦510 | yes      |
| Chikun       | ₦1,000 / ₦600 | ₦600 / ₦535 | yes      |

It is not a clamp. Clamping collapsed Chikun's two rates onto the same number
and produced a flat schedule, which is the defect being avoided.

**Reverting is two numbers.** `TAPER_BAND_MIN_KOBO` and `TAPER_BAND_MAX_KOBO` in
`delivery-fee.ts` are the only control:

```
locked   BAND_MIN = LOCKED_TAPER_MIN_KOBO   BAND_MAX = LOCKED_TAPER_MAX_KOBO
current  BAND_MIN = 50_000                  BAND_MAX =  60_000
flat     BAND_MIN = 50_000                  BAND_MAX =  50_000
```

Setting the band to the locked range makes the mapping the identity function and
restores the locked schedule exactly. The locked figures stay in the file as the
baseline the mapping reads from, so the derivation is never lost. The seeder, the
migration and the tests all read the same mapping, so they cannot drift apart.

### Verified

- Fresh database: `drizzle-kit migrate` exits 0, applies 4 migrations, creates
  37 tables and 78 indexes. Seeding then produces 3 zones and 12 products with
  the banded rates above.
- Existing database: `0024` corrects zone bases from ₦500, ₦700 and ₦800 to
  ₦4,000, ₦4,500 and ₦6,000, replaces the Chikun areas, fixes the units to
  100kg and lists millet.
- `pnpm --filter @debridgers/pricing test`: 15 passed.
- `pnpm --filter @debridgers/debridgers-backend exec vitest run`: 96 passed
  across 8 suites, against a real Postgres rather than skipped.
- Frontend typecheck clean.

### One thing to know

`0024`'s millet insert is guarded with `WHERE EXISTS (SELECT 1 FROM product)`.
The seeder skips a product table that is not empty, so an unguarded insert left
millet as the entire catalogue on a fresh database and suppressed every other
product. Any future data migration that inserts rather than updates needs the
same guard.

---

## Cross-cutting: workspace packages that import cleanly. DONE

**The problem.** A `tsc --watch` or a running dev server would report:

```
error TS7016: Could not find a declaration file for module '@debridgers/pricing'.
  '.../packages/pricing/dist/index.js' implicitly has an 'any' type.
```

followed by a cascade of "has no exported member" errors from every file that
imports or re-exports it. Nothing was wrong with the code. Rebuilding the
package and restarting cleared it.

`packages/pricing` pointed both `main` and `types` at `dist`, so TypeScript
needed the package **built** before it could type-check anything importing it.
`tsup` was configured with `clean: true`, which empties `dist` before rewriting
it, so any watcher reading during a rebuild saw no declaration file and reported
the module as untyped. All seventeen errors came from that one unresolved
import.

**The fix.** Runtime resolution and type resolution have different constraints,
so they now have different answers. Node cannot import TypeScript, so `main` and
the `import`/`require` conditions still point at the build. TypeScript can, so
`types` points at source.

```json
"main":    "./dist/index.js",
"types":   "./src/index.ts",
"exports": { ".": { "types":   "./src/index.ts",
                    "import":  "./dist/index.mjs",
                    "require": "./dist/index.js" } }
```

`tsup` no longer cleans, so `dist` is overwritten in place and never briefly
absent.

**Why this is the right split.** Type-checking now reads the same source the
editor does, so it is always current and never waits on a build step. There is
no window in which the declaration file does not exist, which makes the race
structurally impossible rather than merely unlikely. It also matches how
`api-client` already works, and it keeps the rule from `CLAUDE.md` intact:
anything the API imports at runtime still builds to `dist`.

**Verified.** With `packages/pricing/dist` deleted entirely, the backend
typecheck, the backend spec typecheck, the frontend typecheck and the pricing
test suite all pass. After rebuilding, Node loads the package and reports the
banded rates, and a fresh migrate plus seed produces the correct zone table.

**Still to do, when those packages next cause trouble.** `ui-web`, `ui-app` and
`shared-utils` all still point `types` at `dist` and have the same latent race.
They are only consumed by Vite, which bundles from source, so it has not bitten
yet. Apply the same split when it does.

**Related, fixed in Phase 0.** Compiled `.js` and `.d.ts` files had been
committed into `packages/pricing/src`, where they won module resolution over the
`.ts` beside them, so an edited rate silently had no effect. Deleted and
gitignored.

---

## Phase 1: delivery photos that save. DONE

**The problem.** Proof photos were read into base64 data URLs and posted inside
a JSON body, then written into a `jsonb` column. No body-size limit was
configured, so Express's 100kb default applied and a single ordinary phone photo
exceeded it. The verification failed with a 413 the admin could not interpret,
which meant the record that an order was fulfilled could not be saved at all.

Four more defects sat in the same endpoint: no validation on the body, a payment
notification sent for a delivery event, `out_for_delivery` orders dropping out
of the admin queue forever, and a `recipient_name` that was accepted and thrown
away.

**Object storage was deliberately not adopted.** Photos still travel as base64.
What changed is that the payload is now bounded, so that is survivable until
storage lands.

| Change                                                                                       | Where                            |
| -------------------------------------------------------------------------------------------- | -------------------------------- |
| Body limit raised to 20mb on both parsers, sized from the real payload                       | `main.ts`                        |
| Photos downscaled to 1600px and quality-stepped to a 1.2MB budget before encoding            | `photo-upload-field.tsx`         |
| Zod schema on the verify body: 1 to 8 photos, image data URLs or hosted URLs, length-bounded | `dto/verify-delivery.dto.ts`     |
| Oversized bodies return 413 with a usable message instead of a 500                           | `http-exception.filter.ts`       |
| Pending queue and verify guard accept `confirmed` and `out_for_delivery`                     | `delivery-admin.service.ts`      |
| The `confirmed -> delivered` test shortcut removed                                           | `order-status.ts`                |
| Delivery notification replaces the payment one                                               | `delivery-admin.service.ts`      |
| `delivery_recipient_name` column, persisted, returned and audit-logged                       | `0025`, schema, service          |
| A "Received by" field, blank rather than prefilled with the buyer                            | `deliveries.$orderId.verify.tsx` |
| Explicit column list replaces a bare `select()`                                              | `delivery-admin.service.ts`      |
| A migration baseline tool, needed by any database that predates the rewrite                  | `baseline.ts`                    |

### Why the payload is bounded rather than merely allowed

A fixed JPEG quality bounds nothing: a visually busy photo encodes several times
larger than a plain one, so request size would depend on what the yard happened
to look like. Quality is therefore stepped down until the encoded photo fits a
1.2MB budget. That makes eight photos roughly 10MB, which is what lets the server
run a 20mb ceiling instead of the 55mb one that sizing for raw 5MB input would
have required. Handing an unauthenticated caller 55MB of memory on every endpoint
to serve one authenticated admin screen is a poor trade.

Downscaling falls back to the untouched original whenever anything is missing or
throws. Sending a large photo is worse than sending a small one, and far better
than failing the verification.

The whole allowance disappears when photos move to object storage: the body then
carries URLs and the limit returns to a default.

### The deliberate asymmetry on status

The manual status endpoint can no longer move an order from `confirmed` straight
to `delivered`, because that records a delivery nobody was dispatched for. The
verify endpoint can, because it demands photographic evidence to do it. The proof
is what earns the right to skip the dispatch step.

### Verified

Against the built application, not a mock:

| Body  | Scenario                             | Result                            |
| ----- | ------------------------------------ | --------------------------------- |
| 1 MB  | one photo, what used to 413 at 100kb | 401, body parsed and reached auth |
| 4 MB  | eight downscaled photos, realistic   | 401                               |
| 10 MB | eight photos at the 1.2MB budget     | 401                               |
| 33 MB | beyond the ceiling                   | 413 with a usable message         |

Schema validation rejects an empty array, nine photos, a non-image string, a
`text/html` data URL and an oversized photo; it accepts one photo, eight photos,
a hosted URL, and notes with a recipient. 96 backend tests pass. Every package
type-checks.

### One thing to know

A database created before the migration rewrite has the right schema but stale
bookkeeping, so `migrate` would try to replay the baseline schema. `baseline.ts`
records the new hashes for migrations already applied, leaving the genuinely new
ones to run:

```
tsx src/baseline.ts --through 0023_nostalgic_ultragirl --dry   # inspect first
tsx src/baseline.ts --through 0023_nostalgic_ultragirl
pnpm db:migrate
```

It refuses to run without `--through`, because baselining everything would mark
unrun migrations as done. Rehearsed on a clone of the development database, then
applied: idempotent, and every row count unchanged.

---

## Phase 2: the header

**The goal.** One header that behaves the same on all five marketing pages,
including the shop.

**The problem.** The header does not position itself, so each page wraps it and
the five wrappers disagree. Four pages make it sticky; the shop does not, so it
scrolls away over a catalogue that grows with the product count. The shop's
wrapper also sets `z-40` on a statically positioned element, which creates no
stacking context, so the cart backdrop covers the header despite a comment
claiming otherwise. With the cart bar in flow below the catalogue, a buyer forty
products down can reach neither navigation nor cart.

Inside the component: the hamburger renders an empty `<div />` when open so the
icon vanishes, the drawer's close button has no click handler, `surface="solid"`
works only by coincidence of an initial state value, there is no scroll lock,
Escape handler, focus trap or ARIA, and "Order Now" points at WhatsApp even on
the page with a live cart.

| Task                                                                               |
| ---------------------------------------------------------------------------------- |
| Move sticky positioning and z-index inside the component; delete all five wrappers |
| Fix the hamburger icon and wire the drawer close button                            |
| Drive colours from the `solid` prop, not from a coincidental initial state         |
| Add scroll lock, Escape, focus trap and ARIA attributes                            |
| Add an optional cart slot so the shop's cart rides in the header                   |
| Align the header's max width to the content beneath it                             |

**Done when:** the header stays put on a long shop page, sits above the cart
backdrop, and the mobile menu opens, closes and traps focus on all five pages.

---

## Phase 3: checkout that tells the truth. DONE

**The problem.** With a zone chosen but no quote back, the delivery line
rendered a literal `...`. That was not only the loading state: a failed quote
left it there permanently while the reason appeared in small red text below the
total. The total meanwhile fell back to the items subtotal, excluding delivery
and the fee, so a buyer whose quote had failed was shown less than they would be
charged. The fee was still labelled "Handling", the name that got it set at ₦100.
And `shop.tsx` carried a second, orphaned copy of the whole checkout.

| Change                                                                         | Where                       |
| ------------------------------------------------------------------------------ | --------------------------- |
| Four distinct states on the delivery line: no zone, error, calculating, priced | `checkout.tsx`              |
| A failed quote clears the stale one, so no refused price stays on screen       | `checkout.tsx`              |
| Total shows nothing rather than a subtotal that excludes fees                  | `checkout.tsx`              |
| "Handling" becomes "Service fee" in buyer-facing copy                          | `checkout.tsx`              |
| `requiresIndividualQuote` surfaced as an offer to quote by hand                | `checkout.tsx`              |
| A running campaign shows in the zone picker, not only after a quote returns    | `checkout.tsx`              |
| The running promotion exposed through the platform config                      | `PlatformConfigContext.tsx` |
| The orphaned checkout deleted, 557 lines                                       | `shop.tsx`                  |

### Why the second checkout could be deleted outright

It was not dead code, it handled the Paystack return leg. But both order paths,
`payment.service.ts` and `buyer-payment.service.ts`, set `callback_url` to
`/buyer-dashboard/checkout`, and that route handles the return. Nothing sends
Paystack to `/shop`, so the copy was unreachable and no longer had to be kept in
step by hand. `shop.tsx` went from 1164 lines to 527.

### The minimum order stopped blocking buyers

Decided 2 September 2026, replacing the previous behaviour.

It used to throw on the quote **and** the charge, so a basket below the floor
was refused outright. That is a solvency rule about a single drop, and enforcing
it against the buyer put our operating problem in their way. A buyer who wants
one keg of oil should get one keg of oil.

Now the totals carry `belowMinimumOrder` and `minimumOrderShortfallKobo`, and a
below-minimum order alerts the **buyer admins** rather than the general admin
list, because batching the drop with another in the same zone is their job and
is what recovers the trip. Nothing is said to the buyer at any point.

The check still exists and is still computed on both the quote and the charge.
What changed is who it is for.

### One import path, both sides

`apps/debridgers-backend/src/api/v1/buyer/delivery-fee.ts` was a shim that
re-exported the pricing package so it could turn the minimum-order message into
a Nest exception. Backend files reached it as `../buyer/delivery-fee`, which is
exactly the relative-path hop the workspace packages exist to avoid.

Nothing throws any more, so the shim had no reason to exist. It is deleted, and
every consumer on both sides now imports `@debridgers/pricing` directly. One
source of truth, one import specifier, no `../..`.

---

## Phase 4: free delivery an admin can run

**The goal.** An admin runs a one-week free-delivery campaign, the site shows
it, it stops by itself, and its cost is one query afterwards.

**The problem.** The machinery half exists. `zones.free_delivery` works as
standing policy for one area. A global `free_delivery_until` setting is read at
checkout but is missing from the admin write allowlist, so nothing can turn it
on. And no order records what delivery would have cost, so a campaign's price is
unrecoverable after the fact.

A key-value setting cannot express a window with two ends, cannot scope to a
zone or a buyer's first order, and cannot be joined to the orders it discounted.
So it gets a table.

```
delivery_promotions
  id, name, scope ('global' | 'zone' | 'first_order'),
  zone_id            null unless scope = 'zone'
  starts_at, ends_at, is_active,
  created_by_admin_id, timestamps

orders
  delivery_fee_before_promo   kobo
  delivery_promotion_id       nullable reference
```

`packages/pricing` needs no change: `computeDeliveryFee` already accepts a
`freeDelivery` flag and already returns the pre-promotion figure for
struck-through display. Eligibility is a data question, not a pricing rule.

`zones.free_delivery` keeps winning independently, so an area that is
permanently free does not start charging when a campaign ends.

| Task                                                                            |
| ------------------------------------------------------------------------------- |
| The migration above                                                             |
| A `DeliveryPromotionService` resolving eligibility, wired into the pricing path |
| Record the promotion and the pre-promotion fee on every order                   |
| Expose the running campaign publicly so any surface can display it              |
| Show it in the zone picker and on the delivery line                             |

**Done when:** a week-long campaign shows on the shop, strikes the price through
at checkout, expires on its own, and its total cost is a single query.

**Tests:** both window boundaries, zone policy versus campaign precedence, cost
recording, and a first-order promotion firing exactly once per buyer.

---

## Phase 5: an operator surface for pricing

**The goal.** A zone rate correction ships without a deploy.

**The problem.** There is no admin zones endpoint and no admin zones page. Base
fee, both taper rates, the cap and the standing free-delivery flag change only
by migration. The settings page manages two values, neither of them about
delivery.

| Task                                                                   |
| ---------------------------------------------------------------------- |
| Admin zones CRUD: base, both taper rates, cap, active, standing free   |
| Admin promotions: create with a window, end early, see what is running |
| A read-only fee rules panel, imported from `packages/pricing`          |
| A navigation entry for the page                                        |
| Refuse to save a zone whose tier two is not below tier one             |

Fee rules stay read-only and code-owned. Per-zone values are data and are
editable. Putting the 3% behind a toggle would break the source-of-truth rule
and reopen the door the ₦1,400 price walked through.

**Done when:** a rate is corrected from the admin interface, and the interface
refuses an inverted taper.

---

## Phase 6: procurement targets that compute themselves

**The goal.** The buying desk states two things, what the product cost from the
farmer and the target margin, and every other figure follows.

**The problem.** Every input is typed and seeded from a hardcoded literal,
including the zone base, which the live zone table already holds. The page then
solves each output through four separate calls that each assemble their own
context, so two figures on one screen can be computed against different
assumptions. Meanwhile the primitives that would do this properly,
`landedCostKobo` and the target spread, already exist and are imported by
nothing.

| Task                                                                         |
| ---------------------------------------------------------------------------- |
| One `procurementTargets()` returning every derived figure in a single object |
| Move `procurement-math.ts` to kobo; convert once for display                 |
| Take the margin as a percentage at the boundary, divide to a fraction once   |
| Render the page from that one call, deleting the four separate solves        |
| Read the zone base from the live zone list                                   |
| Read loading per package from the assumptions file                           |
| Wire `landedCostKobo` in as the cost read path                               |
| Keep inbound haulage typed and at zero, with its warning                     |

Inbound haulage stays blank deliberately. It is genuinely unmeasured, and a
plausible-looking default there would flatter every target on the screen.

Keep the bisection in `sellPriceForMargin`. The fee and the caps make revenue
piecewise in the sell price, so a closed form would mislead wherever a cap binds.

**Done when:** entering a cost and a margin produces everything else, changing
the margin moves every dependent figure consistently, and a property test shows
the solved sell price reproduces the requested margin in both directions.

---

## Phase 7: dashboards organised by role. DONE

**The problem.** Four folders under `dashboards`, one of which, `buyer-admin`,
was a fourth top-level dashboard for what is really a narrower admin. The
backend already had this right: the sub-admin API lives at
`api/v1/admin/buyer-admin/` as a subfolder of admin. `AuthContext` had also been
changed to send non-super admins to `/buyer-admin-dashboard`, contradicting
`use-dashboard-nav.ts`, which still narrowed by tier inside one dashboard.

**The structure, decided 2 September 2026.** Pages stay flat under each role.
Subfolders under a role are **per admin domain**, not per feature.

```
dashboards/
  admin/
    layout.tsx
    overview  agents  buyers  admin.invites  products
    deliveries  deliveries.orderId.verify  payouts
    procurement-targets  pricing  outreach  assisted-checkout
    notifications  settings
    buyer/    overview, deliveries      <- was buyer-admin
  agent/   layout.tsx + pages directly
  buyer/   layout.tsx + pages directly
```

A feature grouping was drafted first and rejected. Categories like `money/` and
`catalogue/` are invented rather than observed, so the boundaries are
coin-flips: `pricing` belongs to both, `deliveries` to neither cleanly. Worse,
it answers a question nobody asks. Nobody wonders which admin pages are about
money; they wonder what a buyer admin can see. The domain axis answers that with
a directory listing, and it is already load-bearing in the data as `admin_tier`,
`tiers` in the nav, and `X-Admin-Tier` in the guard.

**The rule that keeps it from drifting:** a page lives in a domain folder only
if that domain is the only thing that uses it. Anything two domains touch stays
flat. That is a test anyone can apply, unlike "is pricing money or catalogue".

### What it found

Three things surfaced that were not structural, and all three were real:

**`admin/buyer-management.tsx` was broken and is deleted.** It read
`{ buyers, total }` from `GET /admin/buyers`, which returns a plain array once
`apiFetch` unwraps the envelope. It rendered nothing. It had been unreachable
until a nav entry was added to it during Phase 0, so the fix is removing both.

**Two buyer lists disagreed about the truth.** `admin/buyers.tsx` showed
`is_blocked`; the buyer-admin list showed `is_suspended`. Those are different
columns meaning different things, blocking being permanent and suspension a
hold, so neither screen told the whole story. Merged into one list carrying
both, with blocking outranking suspension because it is the stronger state.

**The two deliveries pages are NOT duplicates and both stay.**
`admin/deliveries.tsx` reads `/admin/deliveries/pending` and links to
verification: it is the fulfilment queue. `admin/buyer/deliveries.tsx` reads
`/admin/orders`: it tracks orders. Renamed to "Order Tracking" so the nav stops
implying they are the same screen.

### Planning for the domains that are coming

`admin_tier` holds exactly two values and is also an **auth credential**:
`admin-key.guard.ts` checks it against the `SUPER_ADMIN_KEY_*` env values. So it
stays small and boring. What is coming, buyer admin, agent admin, finance admin,
supply admin, is not a tier but a **domain**: no ordering, several can apply to
one person.

`AdminDomain` is now declared in the nav hook with the eight domains the schema
implies, and `NavItem.domain` records which one owns each surface. It gates
nothing yet; `tiers` still does. When `users` grows a domains column, the switch
happens in one file with the mapping already written down.

Deliberately untouched: `admin_tier`, `admin-key.guard.ts`, the
`SUPER_ADMIN_KEY_*` values, and the JWT type. Auth fails closed, so it gets its
own change with its own tests.

**Known, not fixed:** `pricing-admin.controller.ts:72` gates on
`user.admin_tier !== "super"`. That line becomes wrong the moment a third tier
exists, silently removing pricing from every non-super admin. Correct today.
First thing the domains change must fix.

### URL diff, against the last commit

```
- admin-dashboard/buyer-management      (the broken page)
- buyer-admin-dashboard
- buyer-admin-dashboard/buyers
- buyer-admin-dashboard/deliveries
- buyer-admin-dashboard/settings
+ admin-dashboard/buyer
+ admin-dashboard/buyer/deliveries
+ admin-dashboard/pricing               (Phase 5, not this phase)
```

Every other URL is byte-identical.

### Also removed

`buyer-admin/layout.tsx` was a one-line re-export of `DashboardLayout`, the same
line as `admin/layout.tsx`. `buyer-admin/settings.tsx` was a 25-line stub whose
body read "More features coming soon." `isBuyerAdmin` was derived from a path
prefix that no longer exists and is now `isSubAdmin`, derived from the tier,
because a super admin visiting the buyer desk is still a super admin.

### Verified

`react-router typegen` and a full `react-router build` both pass, which is what
proves every route module still resolves. All five typechecks clean. Lint clean
except three warnings in files this phase never touched.

---

## Phase 8: deployment. DONE

**The problem.** No backend Dockerfile. The frontend one was the stock template
and ran `npm ci` against a `package-lock.json` that does not exist in this pnpm
workspace, so it could not build. The only compose file started Postgres and
Redis for local development. No deploy workflow.

**The shape.** Build the image in CI, push to GHCR, connect to the host over
SSH, pull, migrate, restart, then smoke-test through the public hostname. A
Cloudflare Tunnel dials out rather than accepting connections, so no inbound
port is opened and the firewall permits only SSH.

```
deploy/
  bootstrap.sh                     one-time host setup
  deploy.sh                        pull, render ingress, migrate, restart, smoke test
  docker-compose.prod.yml          backend + postgres + redis + cloudflared
  cloudflared/config.template.yml  ingress, rendered at deploy time
.github/workflows/deploy-backend.yml
docs/deployment.md
apps/debridgers-backend/Dockerfile
```

### Two production-only crashes it caught

Both were pre-existing, both only ever fire when `NODE_ENV=production`, and
neither could have been found without actually running the image. This is why
the phase is not finished when the file is written.

**The logger could not resolve its own dependency.** `logger.module.ts` did
`import FileStreamRotator from "file-stream-rotator"`, but that package marks
itself `__esModule` while exporting only `{ getStream }` and no default. The
`esModuleInterop` helper therefore passes the module through unwrapped and
`.default` is `undefined`, so the default import compiled cleanly and threw at
startup. It is now a named import.

The reason it was invisible: the rotator is the non-dev branch of
`stream: isDev ? undefined : ...`. Every local run took the pino-pretty path
instead, so the container was the first thing that ever executed that line.

**Then it could not write its logs.** The rotator tried to `mkdir` a `logs`
directory inside the image, which the non-root runtime user cannot do.

The fix is not to create the directory. `deploy.sh` reports a failed smoke test
by dumping `compose logs backend`, so an app writing to a file inside the
container makes that diagnostic empty at exactly the moment it is needed.
Production now logs to stdout, where the Docker log driver captures it and the
compose file already rotates it. Set `LOG_DIR` to get rotating files back, for
a deployment that is not a container.

### One gap in the compose file

The backend had no healthcheck, and `cloudflared` depended on it with
`service_started`. That waits for a process to exist, not for an API to answer,
so the tunnel could publish a route to a backend that was still booting or
crash-looping, and the first thing a buyer would meet is a 502 from our own
edge. The backend now has a healthcheck and cloudflared waits on
`service_healthy`.

### Verified, by running it

| Check                                 | Result                                                                                   |
| ------------------------------------- | ---------------------------------------------------------------------------------------- |
| `docker build`                        | exit 0, 455MB image                                                                      |
| Workspace package in the image        | `node_modules/@debridgers/pricing/dist` present, so no `ERR_MODULE_NOT_FOUND`            |
| Container boot, `NODE_ENV=production` | `GET /api/v1/health` returns 200 in about 15 seconds                                     |
| Container healthcheck                 | reports `healthy`                                                                        |
| Logs                                  | structured JSON on stdout, captured by the log driver, no files written inside the image |
| `deploy/*.sh`                         | `bash -n` clean                                                                          |
| `deploy-backend.yml`                  | parses                                                                                   |
| `docker-compose.prod.yml`             | renders; 4 services; zero published host ports                                           |

The SSL behaviour is correct and was not changed: `shouldUseSsl` enables SSL
unless the host is localhost, with a `DATABASE_SSL` override. The local
container test needed the override because its Postgres has no TLS; a real
deployment against managed Postgres does not.

### Not verified

No deployment has been run. Nothing has been pushed to a registry, no host has
been bootstrapped, and the Cloudflare Tunnel has never been dialled. The image
is proven to build and run; the pipeline around it is proven only to parse.

`GHCR_OWNER` is a placeholder and must be filled in before the first deploy.
The compose file fails loudly rather than defaulting it, which is deliberate.

---

## Later, and needing a decision rather than code

**Agent commission.** The locked decision is flat naira per package, banded by
product. The code still runs a percentage of order value, which the same
decision calls unaffordable because it consumes the margin. A rate written into
an agent agreement cannot be lowered afterwards, so this has to be settled
before the first recruit.

**The supplier register.** Name, location, products, capacity, lead time,
payment terms, and the last three prices paid with dates. It closes the largest
unknown in the business, landed cost of goods, and it is what turns Phase 6's
typed farmer cost into a prefilled figure.

**Assisted checkout.** The specification page is detailed and its Phase 1 is
real work, but it needs a `created_by_admin_id` column and an admin order-create
endpoint, neither of which exists. The supplier register is the better next
build.

**The unmeasured assumptions.** Inbound haulage, monthly burn, order admin
minutes, GMV and average order value are all recorded as zero and unknown.
Three of them are queries that can be run today.

---

## Documents to update as each phase lands

| Document                                           | When                                                                                                                |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `docs/business/BusinessModel.md`                   | Phase 0 shipped: the taper table now differs from Decision 3, and its "all shipped" list overstates what is shipped |
| `CLAUDE.md`                                        | Phase 7, the layout table                                                                                           |
| `docs/debridgers_features_docs/admin-roles.md`     | Phase 7, the sub-admin dashboard                                                                                    |
| `docs/debridgers_features_docs/admin-system.md`    | Phases 5 and 7                                                                                                      |
| `docs/debridgers_features_docs/buyer-system.md`    | Phase 7                                                                                                             |
| `docs/debridgers_features_docs/outreach-system.md` | Phase 7                                                                                                             |
| `docs/frontend/AdminPlan.md`                       | Phase 7, route structure                                                                                            |
| `admin/assisted-checkout.tsx`                      | Its own inventory table, once the column and endpoint exist                                                         |
