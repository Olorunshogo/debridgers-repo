import "dotenv/config";
import { spawn, spawnSync, type ChildProcess } from "child_process";
import { resolve } from "path";
import { existsSync } from "fs";
import {
  assertIsTestDatabase,
  ensureDatabaseExists,
  resolveTestDatabaseUrl,
  runMigrations,
  runSeed,
  truncateAllTables,
} from "./test-db";
import { readBackendEnv } from "./backend-env";
import {
  TEST_REDIS_DB,
  flushTestRedis,
  resolveTestRedisUrl,
} from "./test-redis";

// Use port 4000 (default fallback used by all spec files)
const BACKEND_PORT = 4000;
const BASE_URL = `http://localhost:${BACKEND_PORT}/api/v1`;
const HEALTH_URL = `${BASE_URL}/health`;
const MAX_WAIT_MS = 45_000;
const POLL_INTERVAL_MS = 500;

const backendRoot = resolve(__dirname, "../../../debridgers-backend");
const distMain = resolve(backendRoot, "dist/main.js");

declare global {
  var __BACKEND_PROCESS__: ChildProcess | undefined;
}

async function waitForServer(): Promise<void> {
  const deadline = Date.now() + MAX_WAIT_MS;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(HEALTH_URL);
      if (res.ok) return;
    } catch {
      // not ready yet
    }
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
  throw new Error(`Backend did not start within ${MAX_WAIT_MS / 1000}s`);
}

export default async function globalSetup(): Promise<void> {
  process.env.NODE_ENV = "test";
  process.env.VITE_API_URL = BASE_URL;

  // Build if dist doesn't exist
  if (!existsSync(distMain)) {
    console.log("\n🔨 Building backend for e2e tests...");
    const build = spawnSync("pnpm", ["build"], {
      cwd: backendRoot,
      stdio: "inherit",
      shell: true,
    });
    if (build.status !== 0) {
      throw new Error("Backend build failed");
    }
  }

  // Load backend .env so the server gets DB credentials etc.
  const backendEnv = (() => {
    try {
      return readBackendEnv();
    } catch {
      return {};
    }
  })();

  // === Test database
  const devDatabaseUrl = backendEnv.DATABASE_URL ?? process.env.DATABASE_URL;
  if (!devDatabaseUrl) {
    throw new Error(
      "Cannot resolve a test database: no DATABASE_URL found in backend .env or process.env",
    );
  }

  const testDatabaseUrl = resolveTestDatabaseUrl(devDatabaseUrl);
  assertIsTestDatabase(testDatabaseUrl);

  await ensureDatabaseExists(testDatabaseUrl);
  runMigrations(backendRoot, testDatabaseUrl);
  await truncateAllTables(testDatabaseUrl);
  runSeed(backendRoot, {
    databaseUrl: testDatabaseUrl,
    adminEmail: process.env.ADMIN_EMAIL ?? "admin@debridgers.com",
    adminPassword: process.env.ADMIN_PASSWORD ?? "WGxMWQP8RfIMjNWVTpJo",
  });
  console.log(`✓ Test database ready\n`);

  // === Test Redis
  const devRedisUrl =
    backendEnv.UPSTASH_REDIS_URL ?? process.env.UPSTASH_REDIS_URL;
  const testRedisUrl = devRedisUrl
    ? resolveTestRedisUrl(devRedisUrl)
    : undefined;
  if (testRedisUrl) {
    await flushTestRedis(testRedisUrl);
    console.log(`✓ Test Redis (db ${TEST_REDIS_DB}) flushed\n`);
  }

  const server = spawn("node", [distMain], {
    env: {
      ...process.env,
      ...backendEnv,
      PORT: String(BACKEND_PORT),
      NODE_ENV: "test",
      // Overrides backendEnv's dev DATABASE_URL so the spawned server actually
      // talks to the isolated test database, not the developer's own.
      DATABASE_URL: testDatabaseUrl,
      DATABASE_URL_DIRECT: testDatabaseUrl,
      /*
       * Same reasoning for Redis: rate-limit counters are keyed by user id and
       * outlive the truncated database, so the suite gets its own logical db.
       */
      ...(testRedisUrl ? { UPSTASH_REDIS_URL: testRedisUrl } : {}),
      /*
       * Set after backendEnv so the suite's throttle settings win over anything
       * in .env. The main suite raises the limit out of the way; the rate-limit
       * suite tightens it. Without this every suite shares one 1000-request
       * budget from a single IP and the later ones drown in 429s.
       */
      THROTTLE_LIMIT: process.env.THROTTLE_LIMIT ?? "1000000",
      THROTTLE_TTL_MS: process.env.THROTTLE_TTL_MS ?? "60000",
      AUTH_THROTTLE_LIMIT: process.env.AUTH_THROTTLE_LIMIT ?? "1000000",
    },
    stdio: "pipe",
  });

  global.__BACKEND_PROCESS__ = server;

  server.stderr?.on("data", (d: Buffer) => {
    const msg = d.toString();
    if (msg.includes("Error") || msg.includes("error"))
      process.stderr.write(msg);
  });

  try {
    await waitForServer();
    console.log(`✓ Backend ready on port ${BACKEND_PORT}\n`);
  } catch (err) {
    server.kill();
    throw err;
  }
}
