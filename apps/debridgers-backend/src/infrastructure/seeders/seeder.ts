import "dotenv/config";
import "reflect-metadata";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { count, eq, sql } from "drizzle-orm";
import * as bcrypt from "bcryptjs";
import * as schema from "../persistence/index";
import { intoTaperBand } from "@debridgers/pricing";
import {
  PRODUCTS,
  TAXONOMY,
  PRODUCT_LEAF_PATHS,
  type TaxonomyNodeSeed,
} from "./catalog";

// ₦ → kobo
const naira = (n: number) => n * 100;

/*
 * Taper rates are the locked schedule mapped through the pricing package, never
 * written out here. A fresh database seeds these rows while an existing one is
 * corrected by migration 0024, and both read the same mapping, so the two
 * cannot drift apart. Writing the banded figures literally is what would let
 * them.
 */
const taper = (lockedNaira: number) => intoTaperBand(naira(lockedNaira));

const ZONES = [
  {
    name: "Kaduna South",
    description: "Narayi, Kakuri, Barnawa, Tudun Wada, Makera",
    /*
     * Measured, not estimated: a two-package outbound leg from Central Market
     * to Mai Gero, near Barnawa, wholly inside this zone. That route is what
     * the base is priced against, so it is the one to re-time when fuel or
     * haulage rates move. The other two zones are scaled from it by distance
     * rather than separately measured, and should be measured in turn.
     */
    delivery_fee: naira(4000),
    tier_one_per_package_kobo: taper(700),
    tier_two_per_package_kobo: taper(400),
    delivery_cap_kobo: naira(10000),
    areas: [
      "Narayi",
      "Kakuri",
      "Barnawa",
      "Tudun Wada",
      "Makera",
      "Kabala Costain",
    ],
    is_active: true,
  },
  {
    name: "Kaduna North",
    description: "Kawo, Tudun Wada North, Rigachikun, Rigasa",
    delivery_fee: naira(4500),
    tier_one_per_package_kobo: taper(800),
    tier_two_per_package_kobo: taper(450),
    delivery_cap_kobo: naira(11000),
    areas: ["Kawo", "Rigachikun", "Rigasa", "Unguwan Mu'azu"],
    is_active: true,
  },
  {
    name: "Chikun",
    description: "Chikun LGA - Kujama, Sabon Sarki, Nasarawa, Ungwan Yero",
    delivery_fee: naira(6000),
    tier_one_per_package_kobo: taper(1000),
    tier_two_per_package_kobo: taper(600),
    delivery_cap_kobo: naira(14000),
    /*
     * Kachia, Kafanchan, Kagoro and Jema'a used to sit here at a ₦800 base.
     * None of them are in Chikun LGA and all are 80 to 120km out, so a single
     * drop lost more than the whole margin on the goods. They belong in an
     * inter-city zone quoted per trip, not in a metro zone.
     */
    areas: ["Kujama", "Sabon Sarki", "Nasarawa", "Ungwan Yero"],
    is_active: true,
  },
];

type Db = ReturnType<typeof drizzle<typeof schema>>;

async function seedTaxonomy(db: Db): Promise<Map<string, number>> {
  const leafIds = new Map<string, number>();

  const insertNode = async (
    node: TaxonomyNodeSeed,
    parentId: number | null,
    path: string[],
  ): Promise<void> => {
    const trail = [...path, node.name];
    const [row] = await db
      .insert(schema.product_categories)
      .values({
        name: node.name,
        slug: node.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        parent_id: parentId,
        sort_order: 0,
        is_active: true,
      })
      .returning({ id: schema.product_categories.id });

    if (!node.children?.length) {
      leafIds.set(trail.join(" > "), row.id);
      return;
    }

    for (const child of node.children) {
      await insertNode(child, row.id, trail);
    }
  };

  for (const root of TAXONOMY) {
    await insertNode(root, null, []);
  }

  return leafIds;
}

/* Rebuilds the same path → id map from rows already in the database, so a
   re-run attaches products without needing to reseed the tree. */
async function loadLeafIds(db: Db): Promise<Map<string, number>> {
  const rows = await db
    .select({
      id: schema.product_categories.id,
      name: schema.product_categories.name,
      parent_id: schema.product_categories.parent_id,
    })
    .from(schema.product_categories);

  const byId = new Map(rows.map((r) => [r.id, r]));
  const hasChildren = new Set(
    rows.map((r) => r.parent_id).filter((id): id is number => id !== null),
  );

  const pathOf = (id: number): string => {
    const trail: string[] = [];
    let cursor = byId.get(id);
    while (cursor) {
      trail.unshift(cursor.name);
      cursor = cursor.parent_id ? byId.get(cursor.parent_id) : undefined;
    }
    return trail.join(" > ");
  };

  const leafIds = new Map<string, number>();
  for (const row of rows) {
    if (!hasChildren.has(row.id)) leafIds.set(pathOf(row.id), row.id);
  }
  return leafIds;
}

/*
 * Points each product at its leaf. `category` is deliberately NOT written here:
 * it is derived from the tree when a product is read, so there is one place the
 * label can come from. Writing it at seed time is what let it drift to a
 * variety name in the first place.
 */
async function attachProductsToLeaves(
  db: Db,
  leafIds: Map<string, number>,
): Promise<number> {
  let attached = 0;

  for (const [productName, leafPath] of Object.entries(PRODUCT_LEAF_PATHS)) {
    const leafId = leafIds.get(leafPath);
    if (leafId === undefined) continue;

    const result = await db
      .update(schema.productsTable)
      .set({ category_id: leafId })
      .where(eq(schema.productsTable.name, productName))
      .returning({ id: schema.productsTable.id });

    attached += result.length;
  }

  return attached;
}

async function seed() {
  const url = process.env.DATABASE_URL;

  if (!url) {
    throw new Error("DATABASE_URL environment variable not set");
  }

  // SSL is required for hosted providers (Neon, Supabase, etc.) but not for local Docker
  const isLocal = url.includes("localhost") || url.includes("127.0.0.1");

  const pool = new Pool({
    connectionString: url,
    ssl: isLocal ? false : true,
  });

  const db = drizzle(pool, { schema });

  const adminEmail = process.env.ADMIN_EMAIL || "admin@debridgers.com";
  const adminPassword = process.env.ADMIN_PASSWORD || "WGxMWQP8RfIMjNWVTpJo";

  /*
   * This literal has already leaked once - it lived in a committed doc with a
   * live login that worked against the deployed test API. Dev and CI/test
   * both rely on it intentionally for a reproducible seed, so the guard is
   * production specifically, not "not development": refuse to silently seed
   * a known, public password onto a database anyone can actually reach.
   */
  if (
    process.env.NODE_ENV === "production" &&
    (!process.env.ADMIN_PASSWORD ||
      process.env.ADMIN_PASSWORD === "WGxMWQP8RfIMjNWVTpJo")
  ) {
    throw new Error(
      "Refusing to seed the admin account in production with an unset or " +
        "known-leaked ADMIN_PASSWORD. Set a real secret in the deployment's " +
        "env before running db:seed.",
    );
  }

  // === Admin
  const existing = await db
    .select()
    .from(schema.users)
    .where(eq(sql`lower(${schema.users.email})`, adminEmail.toLowerCase()))
    .limit(1);

  const hashed = await bcrypt.hash(adminPassword, 12);

  if (existing.length === 0) {
    await db.insert(schema.users).values({
      first_name: "Debridgers",
      last_name: "Admin",
      email: adminEmail.toLowerCase(),
      password: hashed,
      role: "admin",
      is_email_verified: true,
      /*
       * Explicit, because AdminKeyGuard reads this column rather than the JWT
       * claim. The token signer defaults a null tier to "super", so a seeded
       * admin looked fine at login and then got 401 on every admin endpoint.
       */
      admin_tier: "super",
    });
    console.warn(`✓ Admin created: ${adminEmail}`);
  } else {
    // Update existing admin password, and repair a missing tier
    await db
      .update(schema.users)
      .set({ password: hashed, admin_tier: existing[0].admin_tier ?? "super" })
      .where(eq(schema.users.id, existing[0].id));
    console.warn(`✓ Admin password updated: ${adminEmail}`);
  }

  // === Zones
  const [{ total: zoneCount }] = await db
    .select({ total: count() })
    .from(schema.zones);

  if (Number(zoneCount) === 0) {
    await db.insert(schema.zones).values(ZONES);
    console.warn(`✓ Zones seeded: ${ZONES.length} zones`);
  } else {
    console.warn(`- Zones already exist (${zoneCount}) — skipping`);
  }

  // === Products
  const [{ total: productCount }] = await db
    .select({ total: count() })
    .from(schema.productsTable);

  if (Number(productCount) === 0) {
    await db.insert(schema.productsTable).values(PRODUCTS);
    console.warn(`✓ Products seeded: ${PRODUCTS.length} products`);
  } else {
    console.warn(`- Products already exist (${productCount}) — skipping`);
  }

  // === Taxonomy
  /*
   * Production had no category tree at all, so every product read back as
   * "Uncategorized" with a null category_id and GET /categories returned
   * nothing. Seeded here so the deployed catalogue matches dev.
   */
  const [{ total: categoryCount }] = await db
    .select({ total: count() })
    .from(schema.product_categories);

  let leafIds = new Map<string, number>();

  if (Number(categoryCount) === 0) {
    leafIds = await seedTaxonomy(db);
    console.warn(`✓ Taxonomy seeded: ${leafIds.size} leaves`);
  } else {
    leafIds = await loadLeafIds(db);
    console.warn(`- Taxonomy already exists (${categoryCount}) — reusing`);
  }

  const attached = await attachProductsToLeaves(db, leafIds);
  console.warn(`✓ Products attached to categories: ${attached}`);

  await pool.end();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
