import { spawnSync } from "child_process";
import { Pool } from "pg";

// === Types
export interface TestDatabaseConfig {
  databaseUrl: string;
  adminEmail: string;
  adminPassword: string;
}

// === Resolution

/*
 * Test DB is derived from the dev DATABASE_URL by appending "_test" to the
 * database name, unless TEST_DATABASE_URL is set explicitly. Either way the
 * result still has to pass assertIsTestDatabase before it is used.
 */
export function resolveTestDatabaseUrl(devDatabaseUrl: string): string {
  const override = process.env.TEST_DATABASE_URL;
  if (override) return override;

  const url = new URL(devDatabaseUrl);
  const dbName = url.pathname.replace(/^\//, "");
  url.pathname = `/${dbName.endsWith("_test") ? dbName : `${dbName}_test`}`;
  return url.toString();
}

function extractDatabaseName(databaseUrl: string): string {
  return new URL(databaseUrl).pathname.replace(/^\//, "");
}

// === Safety guard

/*
 * A truncate-heavy harness must never be able to hit dev or prod by
 * accident, so the resolved database name has to unambiguously read as a
 * test database before anything else runs.
 */
export function assertIsTestDatabase(databaseUrl: string): void {
  const dbName = extractDatabaseName(databaseUrl);

  if (!/^[a-zA-Z0-9_]+$/.test(dbName)) {
    throw new Error(
      `Refusing to run e2e tests: database name "${dbName}" contains characters ` +
        `outside [a-zA-Z0-9_], which this harness will not interpolate into SQL.`,
    );
  }

  if (!/(^|_)test$/i.test(dbName)) {
    throw new Error(
      `Refusing to run e2e tests against database "${dbName}": its name does not ` +
        `clearly indicate a test database. Expected it to end with "_test". ` +
        `Set TEST_DATABASE_URL explicitly if this is intentional.`,
    );
  }
}

function isLocalConnection(databaseUrl: string): boolean {
  return databaseUrl.includes("localhost") || databaseUrl.includes("127.0.0.1");
}

// === Database creation

export async function ensureDatabaseExists(databaseUrl: string): Promise<void> {
  const dbName = extractDatabaseName(databaseUrl);
  const maintenanceUrl = new URL(databaseUrl);
  maintenanceUrl.pathname = "/postgres";

  const pool = new Pool({
    connectionString: maintenanceUrl.toString(),
    ssl: isLocalConnection(databaseUrl) ? false : true,
  });

  try {
    const existing = await pool.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [dbName],
    );
    if (existing.rowCount === 0) {
      // Identifier interpolation is safe here: assertIsTestDatabase already
      // restricted dbName to [a-zA-Z0-9_].
      await pool.query(`CREATE DATABASE "${dbName}"`);
    }
  } finally {
    await pool.end();
  }
}

// === Truncation

export async function truncateAllTables(databaseUrl: string): Promise<void> {
  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: isLocalConnection(databaseUrl) ? false : true,
  });

  try {
    // Drizzle's own migration bookkeeping lives in the "drizzle" schema, so
    // scoping this to "public" already excludes it.
    const result = await pool.query<{ tablename: string }>(
      "SELECT tablename FROM pg_tables WHERE schemaname = 'public'",
    );

    if (result.rows.length === 0) return;

    const tableList = result.rows
      .map((row: { tablename: string }) => `"${row.tablename}"`)
      .join(", ");
    await pool.query(`TRUNCATE TABLE ${tableList} RESTART IDENTITY CASCADE`);
  } finally {
    await pool.end();
  }
}

// === Migration and seed (reuse the backend's own scripts)

export function runMigrations(backendRoot: string, databaseUrl: string): void {
  const result = spawnSync("pnpm", ["run", "db:migrate"], {
    cwd: backendRoot,
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl,
      DATABASE_URL_DIRECT: databaseUrl,
    },
    stdio: "inherit",
    shell: true,
  });
  if (result.status !== 0) {
    throw new Error("Test database migration failed (pnpm db:migrate)");
  }
}

export function runSeed(backendRoot: string, config: TestDatabaseConfig): void {
  const result = spawnSync("pnpm", ["run", "db:seed"], {
    cwd: backendRoot,
    env: {
      ...process.env,
      DATABASE_URL: config.databaseUrl,
      DATABASE_URL_DIRECT: config.databaseUrl,
      ADMIN_EMAIL: config.adminEmail,
      ADMIN_PASSWORD: config.adminPassword,
    },
    stdio: "inherit",
    shell: true,
  });
  if (result.status !== 0) {
    throw new Error("Test database seeding failed (pnpm db:seed)");
  }
}
