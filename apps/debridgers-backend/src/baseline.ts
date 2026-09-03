import "dotenv/config";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { Pool } from "pg";

/*
 * Marks migrations as applied without running them.
 *
 * A database that predates a migration-set rewrite has the right schema but the
 * wrong bookkeeping: the SQL files were regenerated, so their hashes no longer
 * match the ones recorded in drizzle's table. `migrate` would then try to
 * replay a baseline CREATE TABLE script against tables that already exist.
 *
 * This records the new hashes for migrations whose effects are already present,
 * so `migrate` moves straight on to the ones that genuinely have not run.
 *
 * Usage:
 *   tsx src/baseline.ts --through 0023_nostalgic_ultragirl        apply the marks
 *   tsx src/baseline.ts --through 0023_nostalgic_ultragirl --dry  show what it would do
 *
 * Always dry-run first, and take a dump before the real run.
 */

interface JournalEntry {
  idx: number;
  when: number;
  tag: string;
}

const MIGRATIONS_DIR = path.resolve(
  __dirname,
  "infrastructure/persistence/migrations",
);

/* Drizzle hashes the entire file, so this must match it byte for byte. */
function hashOf(tag: string): string {
  const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, `${tag}.sql`), "utf8");
  return crypto.createHash("sha256").update(sql).digest("hex");
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry");
  const throughIndex = args.indexOf("--through");
  const through = throughIndex === -1 ? null : args[throughIndex + 1];

  if (!through) {
    console.error(
      "Refusing to run without --through <tag>. Baselining everything would " +
        "mark unrun migrations as done, which is silent data loss.",
    );
    process.exit(1);
  }

  const url = process.env.DATABASE_URL_DIRECT ?? process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL not set");

  const journal: { entries: JournalEntry[] } = JSON.parse(
    fs.readFileSync(path.join(MIGRATIONS_DIR, "meta", "_journal.json"), "utf8"),
  );

  const cutoff = journal.entries.findIndex((e) => e.tag === through);
  if (cutoff === -1) {
    throw new Error(`No migration tagged ${through} in the journal`);
  }

  const pool = new Pool({ connectionString: url });

  try {
    await pool.query('CREATE SCHEMA IF NOT EXISTS "drizzle"');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "drizzle"."__drizzle_migrations" (
        id SERIAL PRIMARY KEY,
        hash text NOT NULL,
        created_at bigint
      )
    `);

    const existing = await pool.query<{ hash: string }>(
      'SELECT hash FROM "drizzle"."__drizzle_migrations"',
    );
    const known = new Set(existing.rows.map((r) => r.hash));

    console.log(`Database has ${known.size} migrations recorded.`);
    console.log(`Baselining through ${through}.\n`);

    let marked = 0;
    for (const entry of journal.entries.slice(0, cutoff + 1)) {
      const hash = hashOf(entry.tag);

      if (known.has(hash)) {
        console.log(`  already recorded  ${entry.tag}`);
        continue;
      }

      console.log(`  ${dryRun ? "would mark " : "marking    "}  ${entry.tag}`);
      if (!dryRun) {
        await pool.query(
          'INSERT INTO "drizzle"."__drizzle_migrations" (hash, created_at) VALUES ($1, $2)',
          [hash, entry.when],
        );
      }
      marked += 1;
    }

    const remaining = journal.entries.slice(cutoff + 1).map((e) => e.tag);
    console.log(
      `\n${dryRun ? "Would mark" : "Marked"} ${marked} migration(s) as applied.`,
    );
    console.log(
      remaining.length
        ? `Left for migrate to run: ${remaining.join(", ")}`
        : "Nothing left for migrate to run.",
    );
    if (dryRun) console.log("\nDry run. Nothing was written.");
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error("Baseline failed:", error);
  process.exit(1);
});
