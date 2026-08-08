/**
 * Rate-limit and benchmark integration tests.
 *
 * These tests verify that:
 * 1. The ThrottlerGuard blocks repeated requests from the same IP above the configured limit.
 * 2. Critical public endpoints respond within acceptable latency bounds.
 *
 * Run against a live server:  VITE_API_URL=http://localhost:4000/api/v1 pnpm test
 */

const BASE = process.env.VITE_API_URL || "http://localhost:4000/api/v1";

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getMs(url: string): Promise<{ status: number; ms: number }> {
  const start = Date.now();
  const res = await fetch(url);
  return { status: res.status, ms: Date.now() - start };
}

// ─── Rate Limiting ────────────────────────────────────────────────────────────

describe("Rate Limiting (ThrottlerGuard)", () => {
  /*
   * Each test needs its own window. The suite runs against a deliberately tight
   * limit (see the test:rate-limit script) and the tests finish in tens of
   * milliseconds, so without this they all land in one window and whichever
   * test runs last inherits a budget the earlier ones already spent. That was
   * showing up as the exemption and 401 assertions failing for no real reason.
   */
  beforeEach(async () => {
    const ttl = Number(process.env.THROTTLE_TTL_MS ?? 1000);
    await new Promise((resolve) => setTimeout(resolve, ttl + 100));
  });

  it("should allow up to 10 requests per second on public endpoint", async () => {
    const results = await Promise.all(
      Array.from({ length: 10 }, () => fetch(`${BASE}/products`)),
    );
    const statuses = results.map((r) => r.status);
    const ok = statuses.filter((s) => s === 200).length;
    expect(ok).toBe(10); // all 10 should pass within the short window
  });

  it("should return 429 when the short limit (10 req/s) is exceeded", async () => {
    // Fire 15 concurrent requests — at least some should be throttled
    const results = await Promise.all(
      Array.from({ length: 15 }, () => fetch(`${BASE}/products`)),
    );
    const statuses = results.map((r) => r.status);
    const throttled = statuses.filter((s) => s === 429).length;
    // At least one should be rate-limited once limit is exceeded
    expect(throttled).toBeGreaterThan(0);
  });

  it("POST /admin/outreach without auth returns 401 (not 429)", async () => {
    // Confirm the endpoint is auth-gated, not publicly throttleable
    const results = await Promise.all(
      Array.from({ length: 5 }, () =>
        fetch(`${BASE}/admin/outreach`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ full_name: "Test", phone: "08000000000" }),
        }),
      ),
    );
    const statuses = results.map((r) => r.status);
    expect(statuses.every((s) => s === 401)).toBe(true);
  });

  it("Paystack webhook endpoint should be exempt from rate limiting", async () => {
    // Fire 20 requests — none should be throttled (SkipThrottle applied)
    const results = await Promise.all(
      Array.from({ length: 20 }, () =>
        fetch(`${BASE}/payment/webhook`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ event: "test" }),
        }),
      ),
    );
    const statuses = results.map((r) => r.status);
    // Webhook will return 400 (bad signature) or 200 but never 429
    const throttled = statuses.filter((s) => s === 429).length;
    expect(throttled).toBe(0);
  });

  it("Unauthenticated POST to protected route should return 401 not 429", async () => {
    const res = await fetch(`${BASE}/buyer/profile`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ first_name: "Test" }),
    });
    expect(res.status).toBe(401);
  });
});

// ─── Benchmark / Latency ─────────────────────────────────────────────────────

describe("Benchmark — Response Time", () => {
  const P95_THRESHOLD_MS = 500; // 95th percentile must be under 500ms
  const REQUESTS = 20;

  async function benchmark(label: string, url: string): Promise<void> {
    const times: number[] = [];
    for (let i = 0; i < REQUESTS; i++) {
      const { ms } = await getMs(url);
      times.push(ms);
    }
    times.sort((a, b) => a - b);
    const p50 = times[Math.floor(REQUESTS * 0.5)];
    const p95 = times[Math.floor(REQUESTS * 0.95)];
    const avg = Math.round(times.reduce((s, t) => s + t, 0) / times.length);

    console.log(
      `[Benchmark] ${label}: avg=${avg}ms  p50=${p50}ms  p95=${p95}ms`,
    );
    expect(p95).toBeLessThan(P95_THRESHOLD_MS);
  }

  it("GET /products p95 < 500ms", async () => {
    await benchmark("GET /products", `${BASE}/products`);
  });

  it("GET /config/public p95 < 500ms", async () => {
    await benchmark("GET /config/public", `${BASE}/config/public`);
  });

  it("GET /health p95 < 200ms", async () => {
    const times: number[] = [];
    for (let i = 0; i < REQUESTS; i++) {
      const { ms } = await getMs(`${BASE}/health`);
      times.push(ms);
    }
    times.sort((a, b) => a - b);
    const p95 = times[Math.floor(REQUESTS * 0.95)];
    const avg = Math.round(times.reduce((s, t) => s + t, 0) / times.length);
    console.log(`[Benchmark] GET /health: avg=${avg}ms  p95=${p95}ms`);
    expect(p95).toBeLessThan(200);
  });
});
