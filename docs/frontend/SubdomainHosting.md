# Subdomain hosting for the four frontend apps

Written 2026-09-06. Covers what's needed to get `buyer.debridgers.com`,
`agent.debridgers.com` and `admin.debridgers.com` actually resolving and
working, alongside `debridgers-marketing`'s existing Vercel deployment.

Read this before touching DNS or Vercel project settings for any of the four
apps.

## Current state

- `apps/debridgers-marketing` is already deployed to Vercel, connected to the
  `personal` git remote (`github.com/Olorunshogo/debridgers-repo`, a mirror of
  the `origin` Codeberg repo).
- `apps/debridgers-buyer`, `apps/debridgers-agent` and `apps/debridgers-admin`
  each already have their own `vercel.json` in the repo, with the correct
  monorepo build command (`pnpm --filter @debridgers/pricing build && pnpm run
build`). Nothing in the repo blocks deploying them - the missing pieces are
  all on the Vercel dashboard and the domain registrar's side.
- Buying `debridgers.com` (or already owning it) does not create any of the
  subdomains by itself. A subdomain is just a DNS record; nothing points
  `buyer.debridgers.com` anywhere until one is added.

## What needs to happen, in order

### 1. One more Vercel project per app

Vercel supports several projects off a single monorepo. Create three new
projects (buyer, agent, admin), all pointed at the same `personal` GitHub
repo marketing already uses, each with:

- **Root Directory** set to `apps/debridgers-buyer`, `apps/debridgers-agent`,
  `apps/debridgers-admin` respectively.
- **Include files outside the root directory in the Build Step** turned on,
  since these apps depend on workspace packages (`packages/pricing`,
  `packages/ui-web`, `packages/api-client`) that live outside their own app
  folder.

Each project will pick up its own `vercel.json` automatically once the root
directory is set correctly.

### 2. Assign the subdomain in each Vercel project

In each new project: **Settings → Domains → Add**, then type the full
subdomain (`buyer.debridgers.com`, etc.). Vercel then tells you one of two
things:

- If `debridgers.com`'s nameservers already point at Vercel: nothing further
  to do, Vercel manages the record internally.
- Otherwise: Vercel shows the exact DNS record to create. This is the record
  from step 3 below - copy it from Vercel's own screen rather than typing it
  from memory, since Vercel sometimes uses a project-specific target instead
  of the generic one.

### 3. The actual DNS record - what it looks like

At whichever DNS provider manages `debridgers.com` (your registrar's own DNS
panel, or Vercel DNS if you delegated nameservers to them), add one CNAME
record per subdomain. Concretely, in the format most DNS panels use:

| Type  | Host / Name | Value / Points to      | TTL  |
| ----- | ----------- | ---------------------- | ---- |
| CNAME | `buyer`     | `cname.vercel-dns.com` | Auto |
| CNAME | `agent`     | `cname.vercel-dns.com` | Auto |
| CNAME | `admin`     | `cname.vercel-dns.com` | Auto |

Notes on reading that table:

- **Host / Name** is just the subdomain label, not the full domain - `buyer`,
  not `buyer.debridgers.com`. Most panels append the root domain
  automatically; a few want the full name (`buyer.debridgers.com`) instead -
  the panel's own placeholder text usually says which.
- **Value / Points to** is whatever Vercel's own domain screen shows for that
  specific project once you add the subdomain there (step 2). It is very
  often exactly `cname.vercel-dns.com`, but always copy the literal value
  Vercel gives you rather than assuming it matches this table, since Vercel
  occasionally issues a project-specific target.
- Do **not** create an A record pointing at a raw IP for a subdomain unless
  Vercel's screen explicitly asks for one (that only happens for the bare
  apex domain, `debridgers.com` itself, not a subdomain like `buyer`).
- DNS propagation can take anywhere from a few minutes to a few hours.
  Vercel's domain screen shows a pending/verified status for each domain - it
  flips to verified once the record is visible from Vercel's own resolvers,
  not necessarily the moment you save it.

### 4. Environment variables per Vercel project

Each of the four Vercel projects needs its own production environment
variables set in **Settings → Environment Variables** (Production
environment), mirroring the shape already in each app's `.env.production` /
`.env.staging`:

- `VITE_API_URL` - the real backend URL.
- On `debridgers-marketing` specifically: `VITE_BUYER_APP_URL`,
  `VITE_AGENT_APP_URL`, `VITE_ADMIN_APP_URL` set to the real
  `https://buyer.debridgers.com` etc. once those subdomains are live - this
  is what the role picker and the checkout gate redirect to.

### 5. Backend CORS - a real config change, not just an account setting

Whatever `ALLOWED_ORIGINS` the deployed backend actually runs with must
include all three new origins:

```
ALLOWED_ORIGINS=https://debridgers-marketing.vercel.app,https://buyer.debridgers.com,https://agent.debridgers.com,https://admin.debridgers.com
```

(Plus whatever marketing's own origin already is - keep every existing entry,
only add the three new ones.)

Where this actually lives in production is `deploy/setup-vps.sh`'s prompt for
`ALLOWED_ORIGINS`, which writes it into the backend's `.env` on the VPS at
provisioning time - it is not committed anywhere, so it has to be updated by
hand on the server (or by re-running the relevant part of the setup script)
once the real subdomains exist. This is exactly the same fix already applied
locally for `localhost:5174/5175/5176` - same mechanism, different origins.

The backend itself needs no subdomain-specific code. CORS is the only thing
that cares which origin is asking; routing, auth and everything else is
already origin-agnostic.

## Checklist

- [ ] Three new Vercel projects created (buyer, agent, admin), root directory
      set per app, "include outside root directory" enabled.
- [ ] Subdomain added in each project's Domains settings.
- [ ] CNAME record added at the DNS provider for each subdomain, using the
      exact value Vercel's domain screen shows.
- [ ] Production env vars set per project (`VITE_API_URL`, and marketing's
      three `VITE_*_APP_URL` vars once the subdomains resolve).
- [ ] Backend's production `ALLOWED_ORIGINS` updated on the VPS to include
      all three new origins, backend restarted.
- [ ] Each subdomain's Vercel domain status shows verified, and a browser hit
      to `https://buyer.debridgers.com/login` (etc.) loads without a CORS
      error in the console.
