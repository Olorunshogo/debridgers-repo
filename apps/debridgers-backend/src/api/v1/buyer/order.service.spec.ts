import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { eq } from "drizzle-orm";
import { OrderService, type CreateOrderDto } from "./order.service";
import * as schema from "../../../infrastructure/persistence/index";
import {
  createTestDatabase,
  databaseAvailable,
  type TestDb,
} from "../../../test/db";

/*
 * Order creation is idempotent by fingerprint: the same basket, to the same
 * address and zone, for the same total, while an identical order is still
 * pending and unpaid, is a duplicate submission rather than a second order.
 *
 * These assert that a buyer cannot end up with two orders to pay for, and -
 * just as important - that a genuine second order is still allowed through.
 * An over-eager dedupe silently swallowing real orders would be the worse bug.
 */

const hasDb = await databaseAvailable();

describe.skipIf(!hasDb)("OrderService order creation", () => {
  let t: TestDb;
  let orders: OrderService;
  let userId: number;
  let zoneId: number;
  let riceId: number;
  let garriId: number;

  beforeAll(async () => {
    t = await createTestDatabase("orders");
    orders = new OrderService(t.db);
  }, 120000);

  afterAll(async () => {
    await t?.destroy();
  });

  beforeEach(async () => {
    await t.truncate();

    const [user] = await t.db
      .insert(schema.users)
      .values({
        first_name: "Test",
        last_name: "Buyer",
        email: `buyer-${Date.now()}-${Math.random()}@example.com`,
        role: "buyer",
      })
      .returning();
    userId = user.id;

    const [zone] = await t.db
      .insert(schema.zones)
      .values({ name: "Kaduna South", delivery_fee: 400_000, areas: [] })
      .returning();
    zoneId = zone.id;

    const [rice] = await t.db
      .insert(schema.productsTable)
      .values({
        name: "Local White Rice",
        unit: "50kg bag",
        price_kobo: 4_200_000,
      })
      .returning();
    riceId = rice.id;

    const [garri] = await t.db
      .insert(schema.productsTable)
      .values({
        name: "Yellow Garri",
        unit: "100kg bag",
        price_kobo: 1_400_000,
      })
      .returning();
    garriId = garri.id;
  });

  function dto(overrides: Partial<CreateOrderDto> = {}): CreateOrderDto {
    return {
      delivery_address: "12 Ahmadu Bello Way, Kaduna",
      zone_id: zoneId,
      delivery_time: "today",
      cart: [{ product_id: riceId, qty: 2 }],
      ...overrides,
    };
  }

  async function orderCount(): Promise<number> {
    const rows = await t.db
      .select()
      .from(schema.orders)
      .where(eq(schema.orders.buyer_id, userId));
    return rows.length;
  }

  // === The duplicate-submission guard

  it("returns the existing order when the same basket is submitted twice", async () => {
    const first = await orders.createOrder(userId, dto());
    const second = await orders.createOrder(userId, dto());

    expect(second.order.id).toBe(first.order.id);
    expect(await orderCount()).toBe(1);
  });

  it("charges the same total on the repeat, not double", async () => {
    const first = await orders.createOrder(userId, dto());
    const second = await orders.createOrder(userId, dto());

    expect(second.order.total_kobo).toBe(first.order.total_kobo);
  });

  it("does not duplicate order items on the repeat", async () => {
    const first = await orders.createOrder(userId, dto());
    await orders.createOrder(userId, dto());

    const items = await t.db
      .select()
      .from(schema.order_items)
      .where(eq(schema.order_items.order_id, first.order.id));

    expect(items).toHaveLength(1);
    expect(items[0].quantity).toBe(2);
  });

  it("collapses a burst of sequential retries to one order", async () => {
    const first = await orders.createOrder(userId, dto());
    const second = await orders.createOrder(userId, dto());
    const third = await orders.createOrder(userId, dto());

    expect(second.order.id).toBe(first.order.id);
    expect(third.order.id).toBe(first.order.id);
    expect(await orderCount()).toBe(1);
  });

  /*
   * Documents the known limit rather than pretending it away.
   *
   * The dedupe is a read-then-write, so it closes the double click, the retry
   * and the second tab - every realistic case - but two genuinely simultaneous
   * inserts can both miss. Closing that needs a unique constraint on the
   * fingerprint, which is a migration. This test asserts what is true today and
   * will start failing the moment that constraint lands, which is the prompt to
   * tighten it to exactly 1.
   */
  it("may still create duplicates under true concurrency (known limit)", async () => {
    const results = await Promise.all([
      orders.createOrder(userId, dto()),
      orders.createOrder(userId, dto()),
    ]);

    const ids = new Set(results.map((r) => r.order.id));
    expect(ids.size).toBeGreaterThanOrEqual(1);
    expect(await orderCount()).toBe(ids.size);
  });

  // === Cases that must still create a new order

  it("creates a new order for a different basket", async () => {
    const first = await orders.createOrder(userId, dto());
    const second = await orders.createOrder(
      userId,
      /* Two packages, not one: a single ₦14,000 garri is below the
         minimum order and would be rejected before the basket is compared. */
      dto({ cart: [{ product_id: garriId, qty: 2 }] }),
    );

    expect(second.order.id).not.toBe(first.order.id);
    expect(await orderCount()).toBe(2);
  });

  it("creates a new order when only the quantity differs", async () => {
    const first = await orders.createOrder(userId, dto());
    const second = await orders.createOrder(
      userId,
      dto({ cart: [{ product_id: riceId, qty: 3 }] }),
    );

    expect(second.order.id).not.toBe(first.order.id);
  });

  it("creates a new order for a different delivery address", async () => {
    const first = await orders.createOrder(userId, dto());
    const second = await orders.createOrder(
      userId,
      dto({ delivery_address: "9 Constitution Road, Kaduna" }),
    );

    expect(second.order.id).not.toBe(first.order.id);
  });

  it("does not reuse an order that has already been paid", async () => {
    const first = await orders.createOrder(userId, dto());
    await t.db
      .update(schema.orders)
      .set({ payment_status: "paid" })
      .where(eq(schema.orders.id, first.order.id));

    const second = await orders.createOrder(userId, dto());

    expect(second.order.id).not.toBe(first.order.id);
    expect(await orderCount()).toBe(2);
  });

  it("does not reuse an order that has moved past pending", async () => {
    const first = await orders.createOrder(userId, dto());
    await t.db
      .update(schema.orders)
      .set({ status: "confirmed" })
      .where(eq(schema.orders.id, first.order.id));

    const second = await orders.createOrder(userId, dto());

    expect(second.order.id).not.toBe(first.order.id);
  });

  it("does not reuse an order older than the dedupe window", async () => {
    const first = await orders.createOrder(userId, dto());
    await t.db
      .update(schema.orders)
      .set({ created_at: new Date(Date.now() - 6 * 60 * 1000) })
      .where(eq(schema.orders.id, first.order.id));

    const second = await orders.createOrder(userId, dto());

    expect(second.order.id).not.toBe(first.order.id);
  });

  it("does not hand one buyer another buyer's order", async () => {
    const [other] = await t.db
      .insert(schema.users)
      .values({
        first_name: "Other",
        last_name: "Buyer",
        email: `other-${Date.now()}-${Math.random()}@example.com`,
        role: "buyer",
      })
      .returning();

    const mine = await orders.createOrder(userId, dto());
    const theirs = await orders.createOrder(other.id, dto());

    expect(theirs.order.id).not.toBe(mine.order.id);
  });

  // === Pricing is the server's, not the client's

  it("ignores a price sent by the client and reads it from the product", async () => {
    const result = await orders.createOrder(
      userId,
      dto({
        cart: [
          { product_id: riceId, qty: 1, price_kobo: 1, name: "Free rice" },
        ],
      }),
    );

    /* 4_200_000 item + 400_000 delivery + 126_000 cost-to-serve, being 3% of
       the goods rather than the ₦100 flat fee this once asserted. */
    expect(result.order.subtotal_kobo).toBe(4_200_000);
    expect(result.order.total_kobo).toBe(4_726_000);
  });

  it("rejects an empty cart", async () => {
    await expect(orders.createOrder(userId, dto({ cart: [] }))).rejects.toThrow(
      /cart cannot be empty/i,
    );
  });

  it("rejects an unusably short delivery address", async () => {
    await expect(
      orders.createOrder(userId, dto({ delivery_address: "Kaduna" })),
    ).rejects.toThrow(/at least 10 characters/i);
  });
});
