import "dotenv/config";
import "reflect-metadata";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq, sql } from "drizzle-orm";
import * as bcrypt from "bcryptjs";
import * as schema from "../persistence/index";

async function seed() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  const db = drizzle(pool, { schema });

  const adminEmail = process.env.ADMIN_EMAIL || "admin@debridgers.com";
  const adminPassword = process.env.ADMIN_PASSWORD || "Admin@2026!";

  const existing = await db
    .select()
    .from(schema.users)
    .where(eq(sql`lower(${schema.users.email})`, adminEmail.toLowerCase()))
    .limit(1);

  if (existing.length > 0) {
    console.log("Admin already exists — skipping seed");
    await pool.end();
    return;
  }

  const hashed = await bcrypt.hash(adminPassword, 12);

  await db.insert(schema.users).values({
    first_name: "Debridgers",
    last_name: "Admin",
    email: adminEmail.toLowerCase(),
    password: hashed,
    role: "admin",
    is_email_verified: true,
  });

  console.log(`Admin seeded: ${adminEmail}`);
  await pool.end();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
