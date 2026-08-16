import "dotenv/config";
import "reflect-metadata";
import { Pool } from "pg";
import { drizzle, NodePgDatabase } from "drizzle-orm/node-postgres";
import { count, eq, inArray, sql } from "drizzle-orm";
import * as bcrypt from "bcryptjs";
import * as schema from "../persistence/index";

/*
 * Development-only dataset. `seeder.ts` stays the production baseline (admin,
 * zones, products); this file adds the agents, buyers, orders, commissions and
 * withdrawals that the admin endpoints need before their read paths can be
 * tested at all. On an empty database those endpoints return `[]` and prove
 * only that routing works, which is why the Phase 0 matrix in
 * docs/frontend/AdminPlan.md could not be completed without this.
 *
 * Every account created here uses the SEED_DOMAIN below, so dev data is
 * always identifiable and removable in one query.
 */

// === Constants

const SEED_DOMAIN = "seed.test";
const SEED_PASSWORD = "Dev@2026!";

// ₦ → kobo
const naira = (n: number): number => n * 100;

const daysAgo = (n: number): Date =>
  new Date(Date.now() - n * 24 * 60 * 60 * 1000);

// === Types

type AgentStatus = "pending" | "approved" | "rejected" | "suspended";
type KycStatus = "not_submitted" | "submitted" | "approved" | "rejected";
type OrderStatus =
  | "pending"
  | "confirmed"
  | "out_for_delivery"
  | "delivered"
  | "cancelled";
type PaymentStatus = "unpaid" | "awaiting" | "paid" | "failed";
type CommissionStatus = "pending" | "confirmed" | "paid";
type WithdrawalStatus = "pending" | "approved" | "rejected" | "paid";
type StockRequestStatus = "pending" | "fulfilled" | "cancelled";

interface TaxonomyNodeSeed {
  name: string;
  children?: TaxonomyNodeSeed[];
}

interface AgentSeed {
  first_name: string;
  last_name: string;
  state: string;
  lga: string;
  status: AgentStatus;
  kyc_status: KycStatus;
  is_state_manager: boolean;
  managed_state: string | null;
  /* Left null on one agent so POST /admin/agents/backfill-bank-codes has a
     row to actually operate on. */
  bank_code: string | null;
  target: number;
  is_suspended: boolean;
}

interface BuyerSeed {
  first_name: string;
  last_name: string;
  is_blocked: boolean;
  is_suspended: boolean;
  /* One buyer gets enough wallet transactions to cross a page boundary, since
     that endpoint is one of only two that paginate. */
  transaction_count: number;
}

/*
 * Mirrors the tree that taxonomy.service.getLeaves() currently returns as a
 * hardcoded literal (finding F1). Seeding the real rows is what lets that
 * literal be deleted in favour of the DB-backed query.
 */
const TAXONOMY: TaxonomyNodeSeed[] = [
  {
    name: "Grains",
    children: [
      {
        name: "Rice",
        children: [
          { name: "Local White" },
          { name: "Ofada" },
          { name: "Tuwo" },
          { name: "Long Grain" },
        ],
      },
      {
        name: "Beans",
        children: [
          { name: "Wake Gida" },
          { name: "Cowpea" },
          { name: "Soya Beans" },
          { name: "Ameria" },
          { name: "Honey Beans" },
        ],
      },
      {
        name: "Garri",
        children: [{ name: "White" }, { name: "Yellow" }, { name: "Ijebu" }],
      },
    ],
  },
  { name: "Oil", children: [{ name: "Palm Oil" }, { name: "Groundnut Oil" }] },
  { name: "Tubers", children: [{ name: "Yam" }, { name: "Irish Potato" }] },
];

const AGENTS: AgentSeed[] = [
  {
    first_name: "Musa",
    last_name: "Ibrahim",
    state: "Kaduna",
    lga: "Kaduna South",
    status: "approved",
    kyc_status: "approved",
    is_state_manager: true,
    managed_state: "Kaduna",
    bank_code: "058",
    target: 50,
    is_suspended: false,
  },
  {
    first_name: "Amina",
    last_name: "Yusuf",
    state: "Kaduna",
    lga: "Kaduna North",
    status: "approved",
    kyc_status: "approved",
    is_state_manager: false,
    managed_state: null,
    bank_code: "011",
    target: 30,
    is_suspended: false,
  },
  {
    first_name: "Sunday",
    last_name: "Okoro",
    state: "Kaduna",
    lga: "Chikun",
    status: "approved",
    kyc_status: "submitted",
    is_state_manager: false,
    managed_state: null,
    /* No bank code: the backfill endpoint needs a real target row. */
    bank_code: null,
    target: 20,
    is_suspended: false,
  },
  {
    first_name: "Grace",
    last_name: "Adeyemi",
    state: "Kaduna",
    lga: "Kaduna South",
    status: "pending",
    kyc_status: "submitted",
    is_state_manager: false,
    managed_state: null,
    bank_code: "044",
    target: 0,
    is_suspended: false,
  },
  {
    first_name: "Bello",
    last_name: "Danjuma",
    state: "Kaduna",
    lga: "Kaduna North",
    status: "suspended",
    kyc_status: "approved",
    is_state_manager: false,
    managed_state: null,
    bank_code: "058",
    target: 25,
    is_suspended: true,
  },
  {
    first_name: "Hauwa",
    last_name: "Sani",
    state: "Kaduna",
    lga: "Chikun",
    status: "rejected",
    kyc_status: "rejected",
    is_state_manager: false,
    managed_state: null,
    bank_code: null,
    target: 0,
    is_suspended: false,
  },
  {
    first_name: "Peter",
    last_name: "Achi",
    state: "Kaduna",
    lga: "Kaduna South",
    status: "pending",
    kyc_status: "not_submitted",
    is_state_manager: false,
    managed_state: null,
    bank_code: null,
    target: 0,
    is_suspended: false,
  },
];

const BUYERS: BuyerSeed[] = [
  {
    first_name: "Fatima",
    last_name: "Abdullahi",
    is_blocked: false,
    is_suspended: false,
    transaction_count: 25,
  },
  {
    first_name: "Chinedu",
    last_name: "Eze",
    is_blocked: false,
    is_suspended: false,
    transaction_count: 6,
  },
  {
    first_name: "Zainab",
    last_name: "Lawal",
    is_blocked: false,
    is_suspended: false,
    transaction_count: 3,
  },
  {
    first_name: "Tunde",
    last_name: "Bakare",
    is_blocked: true,
    is_suspended: false,
    transaction_count: 2,
  },
  {
    first_name: "Ngozi",
    last_name: "Umeh",
    is_blocked: false,
    is_suspended: true,
    transaction_count: 0,
  },
];

const LEADS = [
  {
    full_name: "Ibrahim Traders",
    email: "ibrahim.traders@example.com",
    message: "Interested in supplying rice in bulk to Kaduna South.",
  },
  {
    full_name: "Blessing Foods",
    email: "blessing.foods@example.com",
    message: "We run three shops and want wholesale garri pricing.",
  },
  {
    full_name: "Northern Grains Ltd",
    email: "contact@northerngrains.example.com",
    message: "Requesting a partnership call about beans supply.",
  },
  {
    full_name: "Aisha Provisions",
    email: "aisha.provisions@example.com",
    message: "How do I become an agent in Chikun?",
  },
];

const OUTREACH = [
  {
    shop_name: "Mama Ruka Provisions",
    owner_name: "Ruka Salisu",
    phone: "08031234567",
    lga: "Kaduna South",
    area: "Barnawa",
    address: "12 Barnawa Close",
    product_interest: "Rice",
    quantity: 4,
    notes: "Buys weekly, wants credit terms.",
    visit_date: "2026-07-14",
  },
  {
    shop_name: "Kakuri Mega Store",
    owner_name: "Emeka Nwosu",
    phone: "08052345678",
    lga: "Kaduna South",
    area: "Kakuri",
    address: "5 Kakuri Market Road",
    product_interest: "Garri",
    quantity: 10,
    notes: "High volume, price sensitive.",
    visit_date: "2026-07-18",
  },
  {
    shop_name: "Rigasa Foodstuff",
    owner_name: "Sadiya Bello",
    phone: "08063456789",
    lga: "Kaduna North",
    area: "Rigasa",
    address: "Opposite Rigasa Central Mosque",
    product_interest: "Beans",
    quantity: 6,
    notes: "Asked for samples first.",
    visit_date: "2026-07-22",
  },
  {
    shop_name: "Chikun Farm Supplies",
    owner_name: "Danladi Musa",
    phone: "08074567890",
    lga: "Chikun",
    area: "Kachia",
    address: "Kachia Road, beside the filling station",
    product_interest: "Palm Oil",
    quantity: 3,
    notes: "Prefers monthly delivery.",
    visit_date: "2026-07-29",
  },
  {
    shop_name: "Narayi Corner Shop",
    owner_name: null,
    phone: "08085678901",
    lga: "Kaduna South",
    area: "Narayi",
    address: "Narayi High Cost",
    product_interest: "Yam",
    quantity: 2,
    notes: null,
    visit_date: "2026-08-03",
  },
];

// === Guards

/*
 * DATABASE_URL can point at a hosted database, and this seeder writes fake
 * agents and orders. Refuse anything that is not obviously local unless the
 * caller opts in explicitly.
 */
function assertSafeTarget(url: string): void {
  const isLocal = url.includes("localhost") || url.includes("127.0.0.1");

  if (!isLocal && process.env.SEED_FORCE !== "1") {
    throw new Error(
      "Refusing to seed dev data into a non-local database. " +
        "Set SEED_FORCE=1 if this is genuinely intended.",
    );
  }
}

/*
 * A containerised Postgres is reached by service name rather than localhost, so
 * the hostname alone cannot tell a throwaway database from a hosted one, and
 * assuming remote means assuming SSL that a local container will not offer.
 * DATABASE_SSL lets the caller say outright; without it the old hostname
 * heuristic still applies, so existing callers are unaffected.
 */
function shouldUseSsl(url: string): boolean {
  if (process.env.DATABASE_SSL === "false") {
    return false;
  }

  if (process.env.DATABASE_SSL === "true") {
    return true;
  }

  return !(url.includes("localhost") || url.includes("127.0.0.1"));
}

// === Helpers

type Db = NodePgDatabase<typeof schema>;

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

/*
 * Products were seeded before the taxonomy existed, so every row has
 * category_id null (finding F2). Attaching them here gives the catalogue and
 * agent stock drill-down something real to read.
 */
async function attachProductsToLeaves(
  db: Db,
  leafIds: Map<string, number>,
): Promise<number> {
  const byProductName: Record<string, string> = {
    "Local White Rice": "Grains > Rice > Local White",
    "Ofada Rice": "Grains > Rice > Ofada",
    "Tuwo Rice": "Grains > Rice > Tuwo",
    "Wake Gida (Honey Beans)": "Grains > Beans > Wake Gida",
    "Cowpea (White Beans)": "Grains > Beans > Cowpea",
    "White Garri": "Grains > Garri > White",
    "Yellow Garri (Toasted)": "Grains > Garri > Yellow",
    "Palm Oil": "Oil > Palm Oil",
    "Groundnut Oil": "Oil > Groundnut Oil",
    Yam: "Tubers > Yam",
    "Irish Potato": "Tubers > Irish Potato",
  };

  let attached = 0;

  for (const [productName, leafPath] of Object.entries(byProductName)) {
    const leafId = leafIds.get(leafPath);
    if (leafId === undefined) continue;

    const leafName = leafPath.split(" > ").pop() as string;

    const result = await db
      .update(schema.productsTable)
      .set({
        category_id: leafId,
        category: leafName,
        measure_value: 1,
        measure_unit: productName.includes("Oil") ? "litre" : "kg",
      })
      .where(eq(schema.productsTable.name, productName))
      .returning({ id: schema.productsTable.id });

    attached += result.length;
  }

  return attached;
}

// === Seed

async function seedDev(): Promise<void> {
  const url = process.env.DATABASE_URL;

  if (!url) {
    throw new Error("DATABASE_URL environment variable not set");
  }

  assertSafeTarget(url);

  const pool = new Pool({ connectionString: url, ssl: shouldUseSsl(url) });
  const db = drizzle(pool, { schema }) as Db;

  try {
    // === Idempotency
    const existing = await db
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(sql`${schema.users.email} like ${"%@" + SEED_DOMAIN}`)
      .limit(1);

    if (existing.length > 0) {
      console.warn(
        `- Dev data already present (found a @${SEED_DOMAIN} user). ` +
          "Run db:seed:dev:reset first to rebuild it.",
      );
      return;
    }

    // === Prerequisites from the base seeder
    const zones = await db
      .select({ id: schema.zones.id, delivery_fee: schema.zones.delivery_fee })
      .from(schema.zones);

    if (zones.length === 0) {
      throw new Error("No zones found. Run the base seeder (db:seed) first.");
    }

    const products = await db
      .select({ id: schema.productsTable.id })
      .from(schema.productsTable);

    if (products.length === 0) {
      throw new Error(
        "No products found. Run the base seeder (db:seed) first.",
      );
    }

    const [admin] = await db
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(eq(schema.users.role, "admin"))
      .limit(1);

    // === Taxonomy
    const [{ total: categoryCount }] = await db
      .select({ total: count() })
      .from(schema.product_categories);

    let leafIds = new Map<string, number>();

    if (Number(categoryCount) === 0) {
      leafIds = await seedTaxonomy(db);
      console.warn(`✓ Taxonomy seeded: ${leafIds.size} leaves`);

      const attached = await attachProductsToLeaves(db, leafIds);
      console.warn(`✓ Products attached to leaves: ${attached}`);
    } else {
      console.warn(
        `- Taxonomy already exists (${categoryCount} nodes), skipping`,
      );
    }

    // === Password (hashed once: bcrypt at cost 12 is deliberately slow)
    const password = await bcrypt.hash(SEED_PASSWORD, 12);

    // === Agents
    const agentIds: number[] = [];

    for (const [index, agent] of AGENTS.entries()) {
      const [user] = await db
        .insert(schema.users)
        .values({
          first_name: agent.first_name,
          last_name: agent.last_name,
          email: `agent${index + 1}@${SEED_DOMAIN}`,
          phone: `0803000${String(index + 1).padStart(4, "0")}`,
          password,
          role: "agent",
          is_email_verified: true,
          is_suspended: agent.is_suspended,
          zone_id: zones[index % zones.length].id,
        })
        .returning({ id: schema.users.id });

      await db.insert(schema.agent_profiles).values({
        user_id: user.id,
        address: `${agent.lga}, ${agent.state}`,
        state: agent.state,
        lga: agent.lga,
        status: agent.status,
        kyc_status: agent.kyc_status,
        kyc_rejection_reason:
          agent.kyc_status === "rejected" ? "ID photo was unreadable" : null,
        is_state_manager: agent.is_state_manager,
        managed_state: agent.managed_state,
        bank_name: agent.bank_code === null ? "First Bank" : "Zenith Bank",
        bank_code: agent.bank_code,
        bank_account_number: `01234${String(index + 1).padStart(5, "0")}`,
        bank_account_name: `${agent.first_name} ${agent.last_name}`,
        id_type: "NIN",
        target: agent.target,
        referral_agent_code: `AG${String(index + 1).padStart(4, "0")}`,
        referral_buyer_code: `BY${String(index + 1).padStart(4, "0")}`,
      });

      await db.insert(schema.wallets).values({
        agent_id: user.id,
        available_balance: naira(5000 * (index + 1)),
        pending_balance: naira(1000 * index),
        total_earned: naira(12000 * (index + 1)),
      });

      agentIds.push(user.id);
    }

    console.warn(
      `✓ Agents seeded: ${agentIds.length} across every status and kyc_status`,
    );

    // === Buyers
    const buyerIds: number[] = [];

    for (const [index, buyer] of BUYERS.entries()) {
      const [user] = await db
        .insert(schema.users)
        .values({
          first_name: buyer.first_name,
          last_name: buyer.last_name,
          email: `buyer${index + 1}@${SEED_DOMAIN}`,
          phone: `0805000${String(index + 1).padStart(4, "0")}`,
          password,
          role: "buyer",
          is_email_verified: true,
          is_blocked: buyer.is_blocked,
          is_suspended: buyer.is_suspended,
          zone_id: zones[index % zones.length].id,
          delivery_address: `${index + 3} Test Street, Kaduna`,
          referred_by_agent_id: agentIds[index % agentIds.length],
        })
        .returning({ id: schema.users.id });

      const [wallet] = await db
        .insert(schema.buyerWallets)
        .values({
          user_id: user.id,
          available_balance: naira(2000 * (index + 1)),
          pending_balance: 0,
          total_deposited: naira(5000 * (index + 1)),
        })
        .returning({ id: schema.buyerWallets.id });

      if (buyer.transaction_count > 0) {
        await db.insert(schema.walletTransactions).values(
          Array.from({ length: buyer.transaction_count }, (_, t) => ({
            wallet_id: wallet.id,
            type: t % 3 === 0 ? ("deposit" as const) : ("withdraw" as const),
            amount: naira(500 + t * 100),
            status: "completed" as const,
            reference: `SEEDTX-${user.id}-${t + 1}`,
            description: `Seeded transaction ${t + 1}`,
            created_at: daysAgo(buyer.transaction_count - t),
          })),
        );
      }

      buyerIds.push(user.id);
    }

    console.warn(
      `✓ Buyers seeded: ${buyerIds.length} (1 blocked, 1 suspended), ` +
        `${BUYERS.reduce((n, b) => n + b.transaction_count, 0)} wallet transactions`,
    );

    // === Orders
    /* 25 rows so the paginated endpoints cross a page boundary. */
    /*
     * Length must stay coprime with the buyer count. Both the buyer and the
     * status were indexed by i % 5 against five buyers, which locked each
     * buyer to a single status: one buyer held every delivered order and the
     * rest had none, so the spending chart was empty for four of five logins.
     * Delivered repeats so every buyer has several weeks of chart data.
     */
    const orderStatuses: OrderStatus[] = [
      "pending",
      "delivered",
      "confirmed",
      "delivered",
      "out_for_delivery",
      "delivered",
      "cancelled",
    ];
    const paymentStatuses: PaymentStatus[] = [
      "unpaid",
      "awaiting",
      "paid",
      "failed",
    ];

    const orderIds: number[] = [];

    for (let i = 0; i < 25; i++) {
      const zone = zones[i % zones.length];
      const quantity = 1 + (i % 5);
      const unitPrice = naira(1400);
      const handlingFee = naira(100);
      const status = orderStatuses[i % orderStatuses.length];
      const paymentStatus = paymentStatuses[i % paymentStatuses.length];

      const [order] = await db
        .insert(schema.orders)
        .values({
          buyer_id: buyerIds[i % buyerIds.length],
          agent_id: agentIds[i % agentIds.length],
          zone_id: zone.id,
          quantity,
          unit_price: unitPrice,
          handling_fee: handlingFee,
          delivery_fee: zone.delivery_fee,
          total_amount: quantity * unitPrice + handlingFee + zone.delivery_fee,
          order_mode: i % 2 === 0 ? "field" : "referral",
          status,
          payment_status: paymentStatus,
          payment_reference:
            paymentStatus === "unpaid" ? null : `SEEDPAY-${i + 1}`,
          paid_at: paymentStatus === "paid" ? daysAgo(25 - i) : null,
          delivered_at: status === "delivered" ? daysAgo(25 - i) : null,
          cancellation_reason:
            status === "cancelled" ? "Buyer changed their mind" : null,
          delivery_address: `${i + 3} Test Street, Kaduna`,
          created_at: daysAgo(25 - i),
        })
        .returning({ id: schema.orders.id });

      orderIds.push(order.id);
    }

    console.warn(
      `✓ Orders seeded: ${orderIds.length} across every status and payment_status`,
    );

    // === Commissions
    const commissionStatuses: CommissionStatus[] = [
      "pending",
      "confirmed",
      "paid",
    ];

    await db.insert(schema.commissions).values(
      orderIds.slice(0, 15).map((orderId, i) => ({
        agent_id: agentIds[i % agentIds.length],
        order_id: orderId,
        type: i % 4 === 0 ? ("buyer_referral" as const) : ("direct" as const),
        /* numeric column, so Drizzle expects a string */
        amount: (300 + i * 25).toFixed(2),
        status: commissionStatuses[i % commissionStatuses.length],
        paid_at:
          commissionStatuses[i % commissionStatuses.length] === "paid"
            ? daysAgo(15 - i)
            : null,
      })),
    );

    console.warn("✓ Commissions seeded: 15 across pending, confirmed and paid");

    // === Withdrawals
    const withdrawalStatuses: WithdrawalStatus[] = [
      "pending",
      "pending",
      "approved",
      "rejected",
      "paid",
    ];

    await db.insert(schema.withdrawals).values(
      withdrawalStatuses.map((status, i) => ({
        agent_id: agentIds[i % agentIds.length],
        amount: naira(3000 + i * 500),
        bank_name: "Zenith Bank",
        bank_code: "057",
        bank_account_number: `01234${String(i + 1).padStart(5, "0")}`,
        bank_account_name: `${AGENTS[i % AGENTS.length].first_name} ${AGENTS[i % AGENTS.length].last_name}`,
        status,
        rejection_reason:
          status === "rejected" ? "Account name did not match KYC" : null,
        processed_at: status === "pending" ? null : daysAgo(5 - i),
        processed_by: status === "pending" ? null : (admin?.id ?? null),
        payout_reference: status === "paid" ? `SEEDPAYOUT-${i + 1}` : null,
      })),
    );

    console.warn(
      "✓ Withdrawals seeded: 5 (2 pending, 1 approved, 1 rejected, 1 paid)",
    );

    // === Stock requests
    const stockStatuses: StockRequestStatus[] = [
      "pending",
      "pending",
      "fulfilled",
      "cancelled",
    ];

    await db.insert(schema.stock_requests).values(
      stockStatuses.map((status, i) => {
        const quantity = 5 + i * 2;
        return {
          agent_id: agentIds[i % agentIds.length],
          product_id: products[i % products.length].id,
          quantity,
          status,
          amount_to_remit: quantity * naira(1300),
          amount_remitted: status === "fulfilled" ? quantity * naira(1300) : 0,
          fulfilled_at: status === "fulfilled" ? daysAgo(3) : null,
        };
      }),
    );

    console.warn(
      "✓ Stock requests seeded: 4 (2 pending, 1 fulfilled, 1 cancelled)",
    );

    // === Inventory
    await db.insert(schema.inventory_records).values([
      {
        quantity: 500,
        source: "Agrolinking",
        notes: "Opening stock",
        recorded_by: admin?.id ?? null,
      },
      {
        quantity: 250,
        source: "Agrolinking",
        notes: "Mid-month top up",
        recorded_by: admin?.id ?? null,
      },
      {
        quantity: 120,
        source: "Local supplier",
        notes: "Gap filler",
        recorded_by: admin?.id ?? null,
      },
    ]);

    console.warn("✓ Inventory records seeded: 3");

    // === Leads and outreach
    await db.insert(schema.leads).values(LEADS);
    console.warn(`✓ Leads seeded: ${LEADS.length}`);

    await db.insert(schema.outreach_records).values(
      OUTREACH.map((record) => ({
        ...record,
        collected_by: `${AGENTS[0].first_name} ${AGENTS[0].last_name}`,
      })),
    );
    console.warn(`✓ Outreach records seeded: ${OUTREACH.length}`);

    console.warn(
      `\nDev dataset ready. Accounts use the @${SEED_DOMAIN} domain ` +
        `with password ${SEED_PASSWORD}`,
    );
  } finally {
    await pool.end();
  }
}

// === Reset

/*
 * Deleting the seeded users cascades to agent_profiles, wallets, orders,
 * commissions, withdrawals and stock_requests, so those need no explicit
 * cleanup. The tables below have no user FK and are removed by their seeded
 * markers instead.
 */
async function resetDev(): Promise<void> {
  const url = process.env.DATABASE_URL;

  if (!url) {
    throw new Error("DATABASE_URL environment variable not set");
  }

  assertSafeTarget(url);

  const pool = new Pool({ connectionString: url, ssl: shouldUseSsl(url) });
  const db = drizzle(pool, { schema }) as Db;

  try {
    const seeded = await db
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(sql`${schema.users.email} like ${"%@" + SEED_DOMAIN}`);

    if (seeded.length > 0) {
      await db.delete(schema.users).where(
        inArray(
          schema.users.id,
          seeded.map((u) => u.id),
        ),
      );
    }

    await db.delete(schema.leads).where(
      inArray(
        schema.leads.email,
        LEADS.map((l) => l.email),
      ),
    );

    await db.delete(schema.outreach_records).where(
      inArray(
        schema.outreach_records.shop_name,
        OUTREACH.map((o) => o.shop_name),
      ),
    );

    /* Detach products before removing the taxonomy, since category_id has no
       FK constraint and would otherwise be left dangling (finding F3). */
    await db
      .update(schema.productsTable)
      .set({ category_id: null, category: "Uncategorized" })
      .where(sql`${schema.productsTable.category_id} is not null`);

    await db.delete(schema.product_categories);
    await db.delete(schema.inventory_records);

    console.warn(
      `✓ Dev data removed: ${seeded.length} seeded users and their cascades, ` +
        "plus taxonomy, leads, outreach and inventory",
    );
  } finally {
    await pool.end();
  }
}

const mode = process.argv[2];

const run = mode === "reset" ? resetDev : seedDev;

run().catch((err: unknown) => {
  console.error("Dev seed failed:", err);
  process.exit(1);
});
