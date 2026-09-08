import * as path from "path";
import { Client, Pool } from "pg";
import { drizzle, NodePgDatabase } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { sql } from "drizzle-orm";
import * as schema from "../infrastructure/persistence/index";

/*
 * A throwaway Postgres database per test file.
 *
 * These suites cover guarantees that live in SQL rather than in TypeScript: the
 * overdraw guard is an UPDATE predicate, the deposit lock is a conditional
 * status flip, and the order dedupe is a SELECT over existing rows. A mocked
 * query builder would only assert that the code builds the query it builds,
 * which proves nothing about whether a wallet can be overdrawn. So these run
 * against a real database or they do not run at all.
 *
 * The developer's own database is never touched: each file creates its own
 * `debridgers_test_<name>`, migrates it, and drops it at the end.
 */

export type TestDatabase = NodePgDatabase<typeof schema>;

const ADMIN_DB = "postgres";

/* Same default as .env, so a plain `pnpm test` works with no extra setup. */
const BASE_URL =
  process.env.TEST_DATABASE_URL ??
  process.env.DATABASE_URL ??
  "postgresql://postgres:postgres@localhost:5432/debridgers";

function urlFor(database: string): string {
  const parsed = new URL(BASE_URL);
  parsed.pathname = `/${database}`;
  return parsed.toString();
}

/*
 * Whether a Postgres we can create databases on is reachable.
 *
 * Checked once so the suites can skip rather than fail on a machine or CI
 * runner without a database. A skipped money test is visibly absent; a failing
 * one that everybody learns to ignore is worse than none.
 */
export async function databaseAvailable(): Promise<boolean> {
  const client = new Client({ connectionString: urlFor(ADMIN_DB) });
  try {
    await client.connect();
    await client.end();
    return true;
  } catch {
    return false;
  }
}

/* `truncate` empties every table between tests without paying for a re-migration. */
export interface TestDb {
  db: TestDatabase;
  truncate: () => Promise<void>;
  destroy: () => Promise<void>;
}

export async function createTestDatabase(name: string): Promise<TestDb> {
  const dbName = `debridgers_test_${name}`.toLowerCase().replace(/\W/g, "_");

  const admin = new Client({ connectionString: urlFor(ADMIN_DB) });
  await admin.connect();
  /* Dropped first in case a previous run was killed before it cleaned up. */
  await admin.query(`DROP DATABASE IF EXISTS ${dbName} WITH (FORCE)`);
  await admin.query(`CREATE DATABASE ${dbName}`);
  await admin.end();

  const pool = new Pool({ connectionString: urlFor(dbName), ssl: false });
  const db = drizzle(pool, { schema }) as TestDatabase;

  await migrate(db, {
    migrationsFolder: path.join(
      __dirname,
      "../infrastructure/persistence/migrations",
    ),
  });

  return {
    db,

    truncate: async () => {
      const { rows } = await pool.query<{ tablename: string }>(
        `SELECT tablename FROM pg_tables
         WHERE schemaname = 'public' AND tablename <> '__drizzle_migrations'`,
      );
      if (rows.length === 0) return;
      const list = rows.map((r) => `"${r.tablename}"`).join(", ");
      await db.execute(sql.raw(`TRUNCATE ${list} RESTART IDENTITY CASCADE`));
    },

    destroy: async () => {
      await pool.end();
      const cleanup = new Client({ connectionString: urlFor(ADMIN_DB) });
      await cleanup.connect();
      await cleanup.query(`DROP DATABASE IF EXISTS ${dbName} WITH (FORCE)`);
      await cleanup.end();
    },
  };
}
