import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { migrate } from "drizzle-orm/neon-serverless/migrator";
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve("apps/debridgers-backend/.env") });

const dbUrl = process.env.DATABASE_URL_DIRECT ?? process.env.DATABASE_URL;
if (!dbUrl) {
  throw new Error("DATABASE_URL not set");
}

const pool = new Pool({
  connectionString: dbUrl,
});
const db = drizzle(pool);

const main = async () => {
  try {
    console.log("🚀 Starting migration...");
    await migrate(db, {
      migrationsFolder: resolve(
        "apps/debridgers-backend/src/infrastructure/persistence/migrations",
      ),
    });
    console.log("✅ Migration completed successfully");
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error("❌ Error during migration:", error);
    process.exit(1);
  }
};

main();
