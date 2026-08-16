import "dotenv/config";
import "reflect-metadata";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { count, eq, sql } from "drizzle-orm";
import * as bcrypt from "bcryptjs";
import * as schema from "../persistence/index";

// ₦ → kobo
const naira = (n: number) => n * 100;

const ZONES = [
  {
    name: "Kaduna South",
    description: "Narayi, Kakuri, Barnawa, Tudun Wada, Makera",
    delivery_fee: naira(500),
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
    delivery_fee: naira(700),
    areas: ["Kawo", "Rigachikun", "Rigasa", "Unguwan Mu'azu"],
    is_active: true,
  },
  {
    name: "Chikun",
    description: "Chikun LGA areas - Kachia, Kafanchan, Kagoro",
    delivery_fee: naira(800),
    areas: ["Kachia", "Kafanchan", "Kagoro", "Jema'a"],
    is_active: true,
  },
];

/*
 * image_url points at the photos bundled under the frontend's
 * public/images/products, which the product DTO accepts as an app-relative
 * path alongside a Cloudinary URL.
 *
 * Both garri products are deliberately left null. The only unused bundled
 * photos are of whole maize cobs, and garri is milled cassava, so nothing here
 * depicts it. A wrong photo on a food product is worse than the placeholder
 * the card falls back to, so they stay empty until real photos exist.
 *
 * cowpea.jpg is a copy of sweet-beans.jpg rather than a reference to it, so
 * dropping in a true cowpea photo later does not change Wake Gida's image.
 */
const PRODUCTS = [
  // Grains
  {
    name: "Local White Rice",
    unit: "50kg bag",
    price_kobo: naira(42000),
    description: "Fresh locally sourced white rice. Sold per 50kg bag.",
    image_url: "/images/products/rice-white.jpg",
    is_active: true,
    sort_order: 1,
  },
  {
    name: "Ofada Rice",
    unit: "50kg bag",
    price_kobo: naira(48000),
    description: "Premium Nigerian Ofada rice. Sold per 50kg bag.",
    image_url: "/images/products/rice-grains.jpg",
    is_active: true,
    sort_order: 2,
  },
  {
    name: "Tuwo Rice",
    unit: "50kg bag",
    price_kobo: naira(38000),
    description: "Soft tuwo rice, ideal for tuwo shinkafa. Sold per 50kg bag.",
    image_url: "/images/products/rice-bowl.jpg",
    is_active: true,
    sort_order: 3,
  },
  // Beans
  {
    name: "Wake Gida (Honey Beans)",
    unit: "50kg bag",
    price_kobo: naira(55000),
    description:
      "Northern Nigerian honey beans, brown and sweet. Sold per 50kg bag.",
    image_url: "/images/products/sweet-beans.jpg",
    is_active: true,
    sort_order: 4,
  },
  {
    name: "Cowpea (White Beans)",
    unit: "50kg bag",
    price_kobo: naira(52000),
    description: "White cowpea beans, clean and fresh. Sold per 50kg bag.",
    image_url: "/images/products/cowpea.jpg",
    is_active: true,
    sort_order: 5,
  },
  // Garri
  {
    name: "White Garri",
    unit: "25kg bag",
    price_kobo: naira(12000),
    description: "Freshly processed white garri. Sold per 25kg bag.",
    image_url: "/images/products/rice-grains.jpg",
    is_active: true,
    sort_order: 6,
  },
  {
    name: "Yellow Garri (Toasted)",
    unit: "25kg bag",
    price_kobo: naira(14000),
    description: "Toasted yellow garri with rich flavour. Sold per 25kg bag.",
    image_url: "/images/products/rice-grains.jpg",
    is_active: true,
    sort_order: 7,
  },
  // Oil
  {
    name: "Palm Oil",
    unit: "25 litre keg",
    price_kobo: naira(28000),
    description: "Fresh red palm oil from Northern Nigeria. Sold per 25L keg.",
    image_url: "/images/products/pouring-oil.jpg",
    is_active: true,
    sort_order: 8,
  },
  {
    name: "Groundnut Oil",
    unit: "25 litre keg",
    price_kobo: naira(35000),
    description: "Pure groundnut oil, cold pressed. Sold per 25L keg.",
    image_url: "/images/products/pouring-oil.jpg",
    is_active: true,
    sort_order: 9,
  },
  // Tubers
  {
    name: "Yam",
    unit: "100 tubers",
    price_kobo: naira(30000),
    description:
      "Fresh medium-sized yam tubers from the farm. Sold per 100 tubers.",
    image_url: "/images/products/yams.jpg",
    is_active: true,
    sort_order: 10,
  },
  {
    name: "Irish Potato",
    unit: "50kg bag",
    price_kobo: naira(18000),
    description: "Fresh Irish potatoes, uniform size. Sold per 50kg bag.",
    image_url: "/images/products/potatoes.jpg",
    is_active: true,
    sort_order: 11,
  },
];

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
  const adminPassword = process.env.ADMIN_PASSWORD || "Admin@2026!";

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
    });
    console.warn(`✓ Admin created: ${adminEmail}`);
  } else {
    // Update existing admin password
    await db
      .update(schema.users)
      .set({ password: hashed })
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

  await pool.end();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
