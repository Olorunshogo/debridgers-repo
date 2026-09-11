import "dotenv/config";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { and, eq, isNull } from "drizzle-orm";
import * as schema from "../persistence/index";

/*
 * Idempotent by title: insert each open role only if no non-deleted row with
 * that title exists. Safe to re-run on a DB that already has smoke jobs.
 */
const OPEN_JOBS = [
  {
    title: "Frontend Engineer",
    department: "Technology",
    location: "Kaduna (hybrid)",
    description:
      "Build and maintain Debridgers web apps (buyer, agent, admin, careers) with React Router, shared UI packages, and our design system.",
    requirements:
      "Strong TypeScript/React, comfort with Tailwind and shared component libraries, clear communication with design and backend.",
  },
  {
    title: "Backend Engineer",
    department: "Technology",
    location: "Kaduna (hybrid)",
    description:
      "Own NestJS APIs, Drizzle/Postgres schemas, payments, and careers/recruitment services that power Debridgers operations.",
    requirements:
      "Node.js/TypeScript, Postgres, API design, careful handling of auth and money paths, solid testing habits.",
  },
  {
    title: "Business Developer",
    department: "Growth",
    location: "Kaduna (field + office)",
    description:
      "Open and grow B2B buyer relationships across Kaduna: kitchens, institutions, and food businesses that need reliable bulk supply.",
    requirements:
      "Field sales experience, comfort with B2B outreach, local market knowledge, and disciplined follow-up.",
  },
  {
    title: "Content Creator",
    department: "Brand",
    location: "Kaduna (hybrid)",
    description:
      "Tell the Debridgers story across social, email, and product surfaces: market days, buyer wins, and how transparent pricing works.",
    requirements:
      "Portfolio of short-form content, clear writing, ability to shoot/edit simple field clips, brand consistency.",
  },
] as const;

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is required");
  }

  const pool = new Pool({ connectionString: url });
  const db = drizzle(pool, { schema });

  const [admin] = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(eq(schema.users.role, "admin"))
    .limit(1);

  if (!admin) {
    throw new Error("No admin user found; run the main seeder first");
  }

  let inserted = 0;
  for (const job of OPEN_JOBS) {
    const [existing] = await db
      .select({ id: schema.careersJobPostings.id })
      .from(schema.careersJobPostings)
      .where(
        and(
          eq(schema.careersJobPostings.title, job.title),
          isNull(schema.careersJobPostings.deleted_at),
        ),
      )
      .limit(1);
    if (existing) {
      console.log(`skip (exists): ${job.title}`);
      continue;
    }
    await db.insert(schema.careersJobPostings).values({
      ...job,
      status: "open",
      created_by: admin.id,
    });
    inserted += 1;
    console.log(`inserted: ${job.title}`);
  }

  console.log(`Careers jobs seed done (${inserted} new)`);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
