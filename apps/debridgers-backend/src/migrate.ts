import { Pool as NeonPool } from "@neondatabase/serverless";
import { Pool as NodePool } from "pg";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-serverless";
import { drizzle as drizzleNode } from "drizzle-orm/node-postgres";
import { migrate as migrateNeon } from "drizzle-orm/neon-serverless/migrator";
import { migrate as migrateNode } from "drizzle-orm/node-postgres/migrator";
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve("apps/debridgers-backend/.env") });

const dbUrl = process.env.DATABASE_URL_DIRECT ?? process.env.DATABASE_URL;
if (!dbUrl) {
  throw new Error("DATABASE_URL not set");
}

const migrationsFolder = resolve(
  "apps/debridgers-backend/src/infrastructure/persistence/migrations",
);

/*
 * The neon-serverless driver talks Neon's HTTP/WebSocket protocol, not raw
 * Postgres wire, so it cannot reach a local Postgres and throws on connect
 * without a webSocketConstructor. Use it only for an actual Neon host; every
 * other target (local docker, any self-hosted Postgres) goes through the plain
 * pg driver over TCP.
 */
const isNeonHost =
  /\.neon\.tech(?::\d+)?\//.test(dbUrl) || process.env.USE_NEON === "true";

const runNeon = async (): Promise<void> => {
  const pool = new NeonPool({ connectionString: dbUrl });
  const db = drizzleNeon(pool);
  await migrateNeon(db, { migrationsFolder });
  await pool.end();
};

const runNode = async (): Promise<void> => {
  const needsSsl = /sslmode=require/.test(dbUrl) || isNeonHost;
  const pool = new NodePool({
    connectionString: dbUrl,
    ssl: needsSsl ? { rejectUnauthorized: false } : undefined,
  });
  const db = drizzleNode(pool);
  await migrateNode(db, { migrationsFolder });
  await pool.end();
};

const main = async (): Promise<void> => {
  try {
    console.log(
      `🚀 Starting migration (${isNeonHost ? "neon-serverless" : "node-postgres"})...`,
    );
    await (isNeonHost ? runNeon() : runNode());
    console.log("✅ Migration completed successfully");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error during migration:", error);
    process.exit(1);
  }
};

main();
