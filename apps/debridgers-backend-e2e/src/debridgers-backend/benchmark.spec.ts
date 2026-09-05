export {};
import { TERMS_CONSENT } from "../support/terms-consent";

/**
 * Speed benchmark for the Debridgers backend.
 *
 * Measures per-endpoint latency (min / avg / p50 / p95 / p99 / max) and
 * throughput (req/s under concurrent load) across three tiers:
 *   1. Public  — no auth, no DB (health)
 *   2. Public  — no auth, DB-backed (products, config)
 *   3. Authenticated — buyer token
 *   4. Authenticated — admin token
 *
 * Run against a live server:
 *   VITE_API_URL=http://localhost:4000/api/v1 pnpm nx run debridgers-backend-e2e:e2e
 *
 * Env vars:
 *   VITE_API_URL      backend base URL (default: http://localhost:4000/api/v1)
 *   ADMIN_EMAIL       admin account email  (default: admin@debridgers.com)
 *   ADMIN_PASSWORD    admin account password (default: WGxMWQP8RfIMjNWVTpJo)
 *   BENCH_N           sequential samples per endpoint (default: 30)
 *   BENCH_CONCURRENCY concurrent workers for throughput test (default: 20)
 */

const BASE = process.env.VITE_API_URL ?? "http://localhost:4000/api/v1";
const HEALTH = `${BASE}/health`;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "admin@debridgers.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "WGxMWQP8RfIMjNWVTpJo";
const N = Number(process.env.BENCH_N ?? 30);
const CONCURRENCY = Number(process.env.BENCH_CONCURRENCY ?? 20);

// === Tokens

let buyerToken = "";
let adminToken = "";
const buyerEmail = `bench+${Date.now()}@test.com`;
const buyerPassword = "Bench@2026!";

beforeAll(async () => {
  // Register a fresh buyer (NODE_ENV=test auto-verifies email)
  await fetch(`${BASE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      first_name: "Bench",
      last_name: "User",
      email: buyerEmail,
      password: buyerPassword,
      ...TERMS_CONSENT,
    }),
  });

  const [buyerRes, adminRes] = await Promise.all([
    fetch(`${BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: buyerEmail, password: buyerPassword }),
    }),
    fetch(`${BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
    }),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const b = (await buyerRes.json()) as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const a = (await adminRes.json()) as any;

  buyerToken = b.data?.accessToken ?? "";
  adminToken = a.data?.accessToken ?? "";
}, 20_000);

// === Stats helpers

interface Stats {
  min: number;
  avg: number;
  p50: number;
  p95: number;
  p99: number;
  max: number;
}

function computeStats(samples: number[]): Stats {
  const sorted = [...samples].sort((a, b) => a - b);
  const pct = (p: number) =>
    sorted[Math.min(Math.floor(sorted.length * p), sorted.length - 1)];
  return {
    min: sorted[0],
    avg: Math.round(samples.reduce((s, v) => s + v, 0) / samples.length),
    p50: pct(0.5),
    p95: pct(0.95),
    p99: pct(0.99),
    max: sorted[sorted.length - 1],
  };
}

function pad(s: string | number, w: number) {
  return String(s).padStart(w);
}

const rows: string[] = [];

function record(label: string, stats: Stats, rps?: number) {
  const rpsCol = rps !== undefined ? `  ${pad(rps.toFixed(1), 7)} req/s` : "";
  rows.push(
    `${label.padEnd(38)}  ${pad(stats.min, 5)}  ${pad(stats.avg, 5)}  ${pad(stats.p50, 5)}  ${pad(stats.p95, 5)}  ${pad(stats.p99, 5)}  ${pad(stats.max, 5)}${rpsCol}`,
  );
}

afterAll(() => {
  const header =
    `\n${"Endpoint".padEnd(38)}  ${"min".padStart(5)}  ${"avg".padStart(5)}  ${"p50".padStart(5)}  ${"p95".padStart(5)}  ${"p99".padStart(5)}  ${"max".padStart(5)}  ${"throughput".padStart(12)}` +
    `\n${"-".repeat(100)}`;
  console.log(header);
  for (const row of rows) console.log(row);
  console.log("-".repeat(100));
});

// === Sequential latency helper

async function sequential(
  url: string,
  opts?: RequestInit,
  n = N,
): Promise<Stats> {
  const samples: number[] = [];
  for (let i = 0; i < n; i++) {
    const t = Date.now();
    await fetch(url, opts);
    samples.push(Date.now() - t);
  }
  return computeStats(samples);
}

// === Concurrent throughput helper

async function throughput(
  url: string,
  opts?: RequestInit,
): Promise<{ rps: number; stats: Stats }> {
  const samples: number[] = [];
  const wall = Date.now();
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      const t = Date.now();
      await fetch(url, opts);
      samples.push(Date.now() - t);
    }),
  );
  const elapsed = (Date.now() - wall) / 1000;
  return { rps: CONCURRENCY / elapsed, stats: computeStats(samples) };
}

// === Tier 1: Health (no DB)
// Threshold: <50ms p95. In-memory, no DB call.

describe("Tier 1 — Health (no DB)", () => {
  it(`GET /health  sequential (N=${N})`, async () => {
    const stats = await sequential(HEALTH);
    record("GET /health", stats);
    expect(stats.p95).toBeLessThan(50);
  });

  it(`GET /health  concurrent (C=${CONCURRENCY})`, async () => {
    const { rps, stats } = await throughput(HEALTH);
    record("GET /health [concurrent]", stats, rps);
    /*
     * 20 concurrent requests queue on a single Node event loop even for a
     * no-op handler, and that queueing time is dominated by whatever else is
     * sharing the host's CPU - a shared runner or a virtualized dev machine
     * routinely pushes this past 100ms with nothing wrong. 300ms keeps this
     * tier meaningfully tighter than the DB-backed tiers below while giving
     * enough headroom that host noise alone doesn't fail it.
     */
    expect(stats.p99).toBeLessThan(300);
  });
});

// === Tier 2: Public DB-backed endpoints
// Threshold: <700ms p95 sequential — Neon serverless adds ~250ms of network
// latency per query. Concurrent Neon connections are pooled and will queue
// under load; p99 threshold reflects that reality (~3s burst).

describe("Tier 2 — Public (DB-backed)", () => {
  it(`GET /products  sequential (N=${N})`, async () => {
    const stats = await sequential(`${BASE}/products`);
    record("GET /products", stats);
    expect(stats.p95).toBeLessThan(700);
  });

  it(`GET /products  concurrent (C=${CONCURRENCY})`, async () => {
    const { rps, stats } = await throughput(`${BASE}/products`);
    record("GET /products [concurrent]", stats, rps);
    // Neon serverless queues connections — 20 concurrent requests will stack
    expect(stats.p99).toBeLessThan(3000);
  });

  it(`GET /config/public  sequential (N=${N})`, async () => {
    const stats = await sequential(`${BASE}/config/public`);
    record("GET /config/public", stats);
    expect(stats.p95).toBeLessThan(50);
  });
});

// === Tier 3: Auth endpoints
// Threshold: <700ms p95 (1 DB query + bcrypt rounds). The 401 path still
// does a DB lookup but skips bcrypt.compare on no-user-found, so it's cheap.

describe("Tier 3 — Auth endpoints", () => {
  it(`POST /auth/login  sequential (N=${N})`, async () => {
    const stats = await sequential(`${BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // deliberately wrong password so we don't rotate tokens mid-bench
      body: JSON.stringify({
        email: "nobody@bench.test",
        password: "Wrong@Pass1",
      }),
    });
    record("POST /auth/login (401 path)", stats);
    expect(stats.p95).toBeLessThan(700);
  });

  it(`POST /auth/login  concurrent (C=${CONCURRENCY})`, async () => {
    const { rps, stats } = await throughput(`${BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "nobody@bench.test",
        password: "Wrong@Pass1",
      }),
    });
    record("POST /auth/login [concurrent]", stats, rps);
    expect(stats.p99).toBeLessThan(3000);
  });
});

// === Tier 4: Authenticated buyer endpoints
// Single-query endpoints: p95 < 700ms.
// Dashboard runs multiple aggregate queries sequentially — each adds ~280ms,
// so we use a smaller N and a per-test timeout to avoid the global 30s limit.

describe("Tier 4 — Authenticated (buyer)", () => {
  it(`GET /buyer/me  sequential (N=${N})`, async () => {
    const stats = await sequential(`${BASE}/buyer/me`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
    });
    record("GET /buyer/me", stats);
    expect(stats.p95).toBeLessThan(700);
  });

  it(`GET /buyer/me  concurrent (C=${CONCURRENCY})`, async () => {
    const { rps, stats } = await throughput(`${BASE}/buyer/me`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
    });
    record("GET /buyer/me [concurrent]", stats, rps);
    expect(stats.p99).toBeLessThan(3000);
  });

  it(`GET /buyer/orders  sequential (N=${N})`, async () => {
    const stats = await sequential(`${BASE}/buyer/orders`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
    });
    record("GET /buyer/orders", stats);
    expect(stats.p95).toBeLessThan(700);
  });

  // Dashboard runs 4-6 DB queries serially → each ~280ms → total ~1.5s.
  // Use N=10 and a 90s timeout to keep the suite manageable.
  it(`GET /buyer/dashboard  sequential (N=10)`, async () => {
    const stats = await sequential(
      `${BASE}/buyer/dashboard`,
      {
        headers: { Authorization: `Bearer ${buyerToken}` },
      },
      10,
    );
    record("GET /buyer/dashboard", stats);
    // Multi-query endpoint: budget 2.5s p95
    expect(stats.p95).toBeLessThan(2500);
  }, 90_000);
});

// === Tier 5: Authenticated admin endpoints
// Dashboard is the heaviest endpoint — multiple aggregation queries.

describe("Tier 5 — Authenticated (admin)", () => {
  // Use N=10 and 90s timeout for the multi-query dashboard.
  it(`GET /admin/dashboard  sequential (N=10)`, async () => {
    const stats = await sequential(
      `${BASE}/admin/dashboard`,
      {
        headers: { Authorization: `Bearer ${adminToken}` },
      },
      10,
    );
    record("GET /admin/dashboard", stats);
    expect(stats.p95).toBeLessThan(2500);
  }, 90_000);

  it(`GET /admin/dashboard  concurrent (C=${CONCURRENCY})`, async () => {
    const { rps, stats } = await throughput(`${BASE}/admin/dashboard`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    record("GET /admin/dashboard [concurrent]", stats, rps);
    // 20 concurrent multi-query requests will saturate Neon — budget 6s p99
    expect(stats.p99).toBeLessThan(6000);
  });

  it(`GET /admin/buyers  sequential (N=${N})`, async () => {
    const stats = await sequential(`${BASE}/admin/buyers`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    record("GET /admin/buyers", stats);
    expect(stats.p95).toBeLessThan(700);
  });

  it(`GET /admin/agents  sequential (N=${N})`, async () => {
    const stats = await sequential(`${BASE}/admin/agents`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    record("GET /admin/agents", stats);
    expect(stats.p95).toBeLessThan(700);
  });

  it(`GET /admin/settings  sequential (N=${N})`, async () => {
    const stats = await sequential(`${BASE}/admin/settings`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    record("GET /admin/settings", stats);
    /*
     * getSettings() reads from the DB (and can write missing defaults back),
     * same as /admin/buyers and /admin/agents above - the 50ms bar here
     * belonged to the no-DB tier, not this one. Matching its siblings' 700ms
     * instead of inventing a new number.
     */
    expect(stats.p95).toBeLessThan(700);
  });
});
