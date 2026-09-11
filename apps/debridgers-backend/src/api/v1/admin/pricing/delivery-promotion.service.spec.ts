import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { eq } from "drizzle-orm";
import { ConfigService } from "@nestjs/config";
import {
  DeliveryPromotionService,
  type AppliedPromotion,
  type DeliveryPromotionScope,
  type PublicPromotion,
} from "./delivery-promotion.service";
import { BuyerService } from "../../buyer/buyer.service";
import { PaymentService } from "../../payment/payment.service";
import { NotificationsService } from "../../buyer/notifications.service";
import { PaystackInvoiceService } from "../../payment/paystack-invoice.service";
import { SystemSettingsService } from "../../settings/system-settings.service";
import { EmailService } from "../../../../notification/features/email/email.service";
import type { JwtPayload } from "../../../../interfaces/users/jwt.type";
import type { CreateOrderDto } from "../../buyer/dto/create-order.dto";
import * as schema from "../../../../infrastructure/persistence/index";
import {
  createTestDatabase,
  databaseAvailable,
  type TestDb,
} from "../../../../test/db";

/*
 * Free-delivery campaigns, against a real database.
 *
 * Every guarantee here is a SQL predicate or a stored column: the window is a
 * half-open comparison in the WHERE clause, "fires once per buyer" is a count
 * over orders already on file, and a campaign's recoverable cost is a number
 * written onto the order at checkout. A mocked query builder would assert that
 * the code builds the query it builds and would have caught none of it.
 *
 * The kobo figures below are derived from fixtures this file inserts, not
 * restated from the pricing package: the zone is created with a ₦4,000 delivery
 * fee and a one-package basket sits inside the base allowance, so the
 * pre-promotion fee is the zone fee exactly.
 */

const hasDb = await databaseAvailable();

// === Fixture money, in kobo

const ZONE_FEE_KOBO = 400_000;
const RICE_PRICE_KOBO = 4_200_000;
/* 3% cost-to-serve on the goods, inside the floor and the ceiling. */
const SERVICE_FEE_KOBO = 126_000;

/* A window well clear of "now", so the boundary cases are exact rather than
   racing the clock. */
const WINDOW_START = new Date("2026-03-01T00:00:00.000Z");
const WINDOW_END = new Date("2026-03-08T00:00:00.000Z");
const MID_WINDOW = new Date("2026-03-04T12:00:00.000Z");

interface PromotionFixture {
  name: string;
  scope: DeliveryPromotionScope;
  zone_id?: number | null;
  starts_at?: Date;
  ends_at?: Date;
  is_active?: boolean;
}

describe.skipIf(!hasDb)("DeliveryPromotionService", () => {
  let t: TestDb;
  let promotions: DeliveryPromotionService;
  let buyers: BuyerService;
  let buyerId: number;
  let buyerEmail: string;
  let paidZoneId: number;
  let freeZoneId: number;
  let otherZoneId: number;
  let riceId: number;

  beforeAll(async () => {
    t = await createTestDatabase("delivery_promotions");
    promotions = new DeliveryPromotionService(t.db);

    /*
     * Only the collaborators the checkout path actually reaches are real. The
     * invoice call is fire-and-forget, so a promise that never settles keeps
     * its callback from writing to a database a later test has truncated.
     */
    const invoice = {
      createInvoice: () => new Promise<never>(() => {}),
    } as unknown as PaystackInvoiceService;

    const email = {
      sendOrderConfirmation: async () => undefined,
    } as unknown as EmailService;

    const payment = {} as unknown as PaymentService;
    const config = new ConfigService();

    buyers = new BuyerService(
      t.db,
      payment,
      invoice,
      config,
      // Real, over an empty system_settings, so the deprecated free_delivery_until fallback is exercised rather than stubbed away.
      new SystemSettingsService(t.db, config),
      email,
      promotions,
      // Real, so a below-minimum order genuinely writes its buyer-admin alert rather than having that side effect stubbed out.
      new NotificationsService(t.db),
    );
  }, 120000);

  afterAll(async () => {
    await t?.destroy();
  });

  beforeEach(async () => {
    await t.truncate();

    buyerEmail = `buyer-${Date.now()}-${Math.random()}@example.com`;
    const [buyer] = await t.db
      .insert(schema.users)
      .values({
        first_name: "Test",
        last_name: "Buyer",
        email: buyerEmail,
        role: "buyer",
      })
      .returning();
    buyerId = buyer.id;

    const [paidZone] = await t.db
      .insert(schema.zones)
      .values({ name: "Kaduna South", delivery_fee: ZONE_FEE_KOBO, areas: [] })
      .returning();
    paidZoneId = paidZone.id;

    const [freeZone] = await t.db
      .insert(schema.zones)
      .values({
        name: "Depot Ward",
        delivery_fee: ZONE_FEE_KOBO,
        areas: [],
        free_delivery: true,
      })
      .returning();
    freeZoneId = freeZone.id;

    const [otherZone] = await t.db
      .insert(schema.zones)
      .values({ name: "Rigasa", delivery_fee: ZONE_FEE_KOBO, areas: [] })
      .returning();
    otherZoneId = otherZone.id;

    const [rice] = await t.db
      .insert(schema.productsTable)
      .values({
        name: "Local White Rice",
        unit: "50kg bag",
        price_kobo: RICE_PRICE_KOBO,
      })
      .returning();
    riceId = rice.id;
  });

  // === Fixtures

  async function insertPromotion(
    fixture: PromotionFixture,
  ): Promise<{ id: number }> {
    const [created] = await t.db
      .insert(schema.deliveryPromotions)
      .values({
        name: fixture.name,
        scope: fixture.scope,
        zone_id: fixture.zone_id ?? null,
        starts_at: fixture.starts_at ?? WINDOW_START,
        ends_at: fixture.ends_at ?? WINDOW_END,
        is_active: fixture.is_active ?? true,
      })
      .returning();

    return { id: created.id };
  }

  /* A window straddling the real clock, for the cases that go through
     checkout and cannot pass an explicit `now`. */
  function aroundNow(): { starts_at: Date; ends_at: Date } {
    const now = Date.now();
    return {
      starts_at: new Date(now - 60 * 60 * 1000),
      ends_at: new Date(now + 60 * 60 * 1000),
    };
  }

  function session(id: number, email: string): JwtPayload {
    return {
      sub: id,
      id,
      email,
      first_name: "Test",
      last_name: "Buyer",
      role: "buyer",
      api_version: "v1",
      device: "vitest",
      ip_address: "127.0.0.1",
    };
  }

  function dto(zoneId: number): CreateOrderDto {
    return {
      delivery_address: "12 Ahmadu Bello Way, Kaduna",
      zone_id: zoneId,
      delivery_time: "today",
      cart: [{ product_id: riceId, qty: 1, unit_mode: "package" }],
    };
  }

  interface OrderRow {
    delivery_fee: number;
    delivery_fee_before_promo: number;
    delivery_promotion_id: number | null;
    total_amount: number;
  }

  /*
   * Marks every order this buyer has placed as paid.
   *
   * first_order eligibility is spent by a COMPLETED order, not by the row that
   * checkout inserts before payment. Tests that mean "this buyer has ordered
   * before" therefore have to settle the order, exactly as the webhook does.
   */
  async function settleOrders(userId: number = buyerId): Promise<void> {
    await t.db
      .update(schema.orders)
      .set({ payment_status: "paid" })
      .where(eq(schema.orders.buyer_id, userId));
  }

  async function placeOrder(
    zoneId: number,
    userId: number = buyerId,
    email: string = buyerEmail,
  ): Promise<OrderRow> {
    const result = await buyers.createOrder(
      dto(zoneId),
      session(userId, email),
    );

    const [row] = await t.db
      .select({
        delivery_fee: schema.orders.delivery_fee,
        delivery_fee_before_promo: schema.orders.delivery_fee_before_promo,
        delivery_promotion_id: schema.orders.delivery_promotion_id,
        total_amount: schema.orders.total_amount,
      })
      .from(schema.orders)
      .where(eq(schema.orders.id, result.data.order_id));

    return row;
  }

  // === The campaign window

  it("is not running one millisecond before it starts", async () => {
    await insertPromotion({ name: "March push", scope: "global" });

    const justBefore = new Date(WINDOW_START.getTime() - 1);
    const applied: AppliedPromotion | null = await promotions.resolve(
      paidZoneId,
      buyerId,
      justBefore,
    );

    expect(applied).toBeNull();
  });

  it("is running at the opening instant, which is inclusive", async () => {
    const { id } = await insertPromotion({
      name: "March push",
      scope: "global",
    });

    const applied: AppliedPromotion | null = await promotions.resolve(
      paidZoneId,
      buyerId,
      WINDOW_START,
    );

    expect(applied?.id).toBe(id);
  });

  it("is running in the middle of the window", async () => {
    const { id } = await insertPromotion({
      name: "March push",
      scope: "global",
    });

    const applied: AppliedPromotion | null = await promotions.resolve(
      paidZoneId,
      buyerId,
      MID_WINDOW,
    );

    expect(applied?.id).toBe(id);
    expect(applied?.name).toBe("March push");
    expect(applied?.scope).toBe("global");
  });

  it("is still running one millisecond before it ends", async () => {
    const { id } = await insertPromotion({
      name: "March push",
      scope: "global",
    });

    const justBefore = new Date(WINDOW_END.getTime() - 1);
    const applied: AppliedPromotion | null = await promotions.resolve(
      paidZoneId,
      buyerId,
      justBefore,
    );

    expect(applied?.id).toBe(id);
  });

  /* The upper bound is exclusive so a campaign is not live for the single
     instant it was meant to stop. */
  it("is not running at the closing instant, which is exclusive", async () => {
    await insertPromotion({ name: "March push", scope: "global" });

    const applied: AppliedPromotion | null = await promotions.resolve(
      paidZoneId,
      buyerId,
      WINDOW_END,
    );

    expect(applied).toBeNull();
  });

  it("is not running one millisecond after it ends", async () => {
    await insertPromotion({ name: "March push", scope: "global" });

    const justAfter = new Date(WINDOW_END.getTime() + 1);
    const applied: AppliedPromotion | null = await promotions.resolve(
      paidZoneId,
      buyerId,
      justAfter,
    );

    expect(applied).toBeNull();
  });

  // === The kill switch

  it("does not apply an in-window promotion that is switched off", async () => {
    await insertPromotion({
      name: "Cancelled push",
      scope: "global",
      is_active: false,
    });

    const applied: AppliedPromotion | null = await promotions.resolve(
      paidZoneId,
      buyerId,
      MID_WINDOW,
    );

    expect(applied).toBeNull();
  });

  it("does not announce an in-window promotion that is switched off", async () => {
    await insertPromotion({
      name: "Cancelled push",
      scope: "global",
      is_active: false,
    });

    const announced: PublicPromotion | null =
      await promotions.running(MID_WINDOW);

    expect(announced).toBeNull();
  });

  it("switching one campaign off leaves another running", async () => {
    await insertPromotion({
      name: "Cancelled push",
      scope: "global",
      is_active: false,
    });
    const live = await insertPromotion({
      name: "Rigasa week",
      scope: "zone",
      zone_id: paidZoneId,
    });

    const applied: AppliedPromotion | null = await promotions.resolve(
      paidZoneId,
      buyerId,
      MID_WINDOW,
    );

    expect(applied?.id).toBe(live.id);
  });

  // === Scope

  it("does not apply a zone campaign to a different zone", async () => {
    await insertPromotion({
      name: "Rigasa week",
      scope: "zone",
      zone_id: otherZoneId,
    });

    const applied: AppliedPromotion | null = await promotions.resolve(
      paidZoneId,
      buyerId,
      MID_WINDOW,
    );

    expect(applied).toBeNull();
  });

  // === Attribution precedence: zone, then first_order, then global

  it("credits the zone campaign over first_order and global", async () => {
    await insertPromotion({ name: "Site wide", scope: "global" });
    await insertPromotion({ name: "Welcome", scope: "first_order" });
    const zonal = await insertPromotion({
      name: "Kaduna South week",
      scope: "zone",
      zone_id: paidZoneId,
    });

    const applied: AppliedPromotion | null = await promotions.resolve(
      paidZoneId,
      buyerId,
      MID_WINDOW,
    );

    expect(applied?.id).toBe(zonal.id);
    expect(applied?.scope).toBe("zone");
    expect(applied?.zone_id).toBe(paidZoneId);
  });

  it("credits first_order over global when no zone campaign reaches the buyer", async () => {
    await insertPromotion({ name: "Site wide", scope: "global" });
    const welcome = await insertPromotion({
      name: "Welcome",
      scope: "first_order",
    });
    /* Running, but for somewhere else, so it is not eligible at all. */
    await insertPromotion({
      name: "Rigasa week",
      scope: "zone",
      zone_id: otherZoneId,
    });

    const applied: AppliedPromotion | null = await promotions.resolve(
      paidZoneId,
      buyerId,
      MID_WINDOW,
    );

    expect(applied?.id).toBe(welcome.id);
    expect(applied?.scope).toBe("first_order");
  });

  it("falls back to global when the buyer has ordered before", async () => {
    const global = await insertPromotion({
      name: "Site wide",
      scope: "global",
    });
    await insertPromotion({ name: "Welcome", scope: "first_order" });
    await placeOrder(paidZoneId);
    await settleOrders();

    const applied: AppliedPromotion | null = await promotions.resolve(
      paidZoneId,
      buyerId,
      MID_WINDOW,
    );

    expect(applied?.id).toBe(global.id);
    expect(applied?.scope).toBe("global");
  });

  // === Announcement precedence: global, then zone, then first_order

  it("announces the global campaign over zone and first_order", async () => {
    await insertPromotion({ name: "Site wide", scope: "global" });
    await insertPromotion({
      name: "Kaduna South week",
      scope: "zone",
      zone_id: paidZoneId,
    });
    await insertPromotion({ name: "Welcome", scope: "first_order" });

    const announced: PublicPromotion | null =
      await promotions.running(MID_WINDOW);

    expect(announced?.name).toBe("Site wide");
    expect(announced?.scope).toBe("global");
    /* A global campaign reaches every active zone. */
    expect([...(announced?.zone_ids ?? [])].sort()).toEqual(
      [paidZoneId, freeZoneId, otherZoneId].sort(),
    );
  });

  it("announces the zone campaign over first_order, naming only that zone", async () => {
    await insertPromotion({
      name: "Kaduna South week",
      scope: "zone",
      zone_id: paidZoneId,
    });
    await insertPromotion({ name: "Welcome", scope: "first_order" });

    const announced: PublicPromotion | null =
      await promotions.running(MID_WINDOW);

    expect(announced?.scope).toBe("zone");
    expect(announced?.zone_ids).toEqual([paidZoneId]);
  });

  it("announces a first_order campaign across every active zone", async () => {
    await insertPromotion({ name: "Welcome", scope: "first_order" });

    const announced: PublicPromotion | null =
      await promotions.running(MID_WINDOW);

    expect(announced?.scope).toBe("first_order");
    expect([...(announced?.zone_ids ?? [])].sort()).toEqual(
      [paidZoneId, freeZoneId, otherZoneId].sort(),
    );
  });

  // === Standing zone policy is not a campaign

  /*
   * The reason zones.free_delivery was not folded into this table: it is policy
   * for an area, not a window, so it must survive the end of every campaign.
   */
  it("keeps a standing-free zone free with no campaign running at all", async () => {
    const order = await placeOrder(freeZoneId);

    expect(order.delivery_fee).toBe(0);
    expect(order.delivery_fee_before_promo).toBe(ZONE_FEE_KOBO);
    expect(order.delivery_promotion_id).toBeNull();
    expect(order.total_amount).toBe(RICE_PRICE_KOBO + SERVICE_FEE_KOBO);
  });

  it("keeps a standing-free zone free after a campaign has ended", async () => {
    const now = Date.now();
    await insertPromotion({
      name: "Ended push",
      scope: "global",
      starts_at: new Date(now - 2 * 60 * 60 * 1000),
      ends_at: new Date(now - 60 * 60 * 1000),
    });

    const order = await placeOrder(freeZoneId);

    expect(order.delivery_fee).toBe(0);
    expect(order.delivery_fee_before_promo).toBe(ZONE_FEE_KOBO);
    expect(order.delivery_promotion_id).toBeNull();
  });

  /* Crediting a campaign for an order in an area that was already free would
     overstate what the campaign gave away. */
  it("does not credit a running campaign for a standing-free zone", async () => {
    await insertPromotion({
      name: "Site wide",
      scope: "global",
      ...aroundNow(),
    });

    const order = await placeOrder(freeZoneId);

    expect(order.delivery_fee).toBe(0);
    expect(order.delivery_promotion_id).toBeNull();
  });

  it("charges a paid zone once the campaign has ended", async () => {
    const now = Date.now();
    await insertPromotion({
      name: "Ended push",
      scope: "global",
      starts_at: new Date(now - 2 * 60 * 60 * 1000),
      ends_at: new Date(now - 60 * 60 * 1000),
    });

    const order = await placeOrder(paidZoneId);

    expect(order.delivery_fee).toBe(ZONE_FEE_KOBO);
    expect(order.delivery_fee_before_promo).toBe(ZONE_FEE_KOBO);
    expect(order.delivery_promotion_id).toBeNull();
  });

  // === What the campaign cost

  it("records the campaign and the fee it waived on the order", async () => {
    const { id } = await insertPromotion({
      name: "Site wide",
      scope: "global",
      ...aroundNow(),
    });

    const order = await placeOrder(paidZoneId);

    expect(order.delivery_promotion_id).toBe(id);
    expect(order.delivery_fee).toBe(0);
    /* The whole point: the fee that was not charged is still on the row, so
       the campaign's cost survives a later change to the zone's rates. */
    expect(order.delivery_fee_before_promo).toBe(ZONE_FEE_KOBO);
    expect(order.total_amount).toBe(RICE_PRICE_KOBO + SERVICE_FEE_KOBO);
  });

  it("totals what a campaign gave away, in kobo", async () => {
    const { id } = await insertPromotion({
      name: "Site wide",
      scope: "global",
      ...aroundNow(),
    });

    await placeOrder(paidZoneId);
    await placeOrder(paidZoneId);

    const { data } = await promotions.cost();

    expect(data).toHaveLength(1);
    expect(data[0].promotion_id).toBe(id);
    expect(data[0].name).toBe("Site wide");
    expect(data[0].orders).toBe(2);
    expect(data[0].forgone_kobo).toBe(2 * ZONE_FEE_KOBO);
  });

  // === first_order fires once per buyer

  it("applies a first_order campaign to a buyer with no orders", async () => {
    const { id } = await insertPromotion({
      name: "Welcome",
      scope: "first_order",
    });

    const applied: AppliedPromotion | null = await promotions.resolve(
      paidZoneId,
      buyerId,
      MID_WINDOW,
    );

    expect(applied?.id).toBe(id);
  });

  it("stops applying it once the buyer has paid for an order", async () => {
    await insertPromotion({ name: "Welcome", scope: "first_order" });
    await placeOrder(paidZoneId);
    await settleOrders();

    const applied: AppliedPromotion | null = await promotions.resolve(
      paidZoneId,
      buyerId,
      MID_WINDOW,
    );

    expect(applied).toBeNull();
  });

  /*
   * The offer survives an abandoned checkout.
   *
   * An order row is inserted before payment, so counting rows meant a buyer who
   * opened checkout and walked away, or whose card was declined, had spent
   * their free delivery on nothing and would see it withdrawn on the retry with
   * no way to tell why.
   */
  it("keeps the offer when a previous order was never paid for", async () => {
    await insertPromotion({ name: "Welcome", scope: "first_order" });
    await placeOrder(paidZoneId);

    const applied: AppliedPromotion | null = await promotions.resolve(
      paidZoneId,
      buyerId,
      MID_WINDOW,
    );

    expect(applied?.scope).toBe("first_order");
  });

  it("does not let a cancelled order consume the offer", async () => {
    await insertPromotion({ name: "Welcome", scope: "first_order" });
    await placeOrder(paidZoneId);
    await settleOrders();
    await t.db
      .update(schema.orders)
      .set({ status: "cancelled" })
      .where(eq(schema.orders.buyer_id, buyerId));

    const applied: AppliedPromotion | null = await promotions.resolve(
      paidZoneId,
      buyerId,
      MID_WINDOW,
    );

    expect(applied?.scope).toBe("first_order");
  });

  it("frees the first order and charges the second", async () => {
    const { id } = await insertPromotion({
      name: "Welcome",
      scope: "first_order",
      ...aroundNow(),
    });

    const first = await placeOrder(paidZoneId);
    /* Settled, because an unpaid first order does not spend the offer. */
    await settleOrders();
    const second = await placeOrder(paidZoneId);

    expect(first.delivery_fee).toBe(0);
    expect(first.delivery_fee_before_promo).toBe(ZONE_FEE_KOBO);
    expect(first.delivery_promotion_id).toBe(id);

    expect(second.delivery_fee).toBe(ZONE_FEE_KOBO);
    expect(second.delivery_fee_before_promo).toBe(ZONE_FEE_KOBO);
    expect(second.delivery_promotion_id).toBeNull();
    expect(second.total_amount).toBe(
      RICE_PRICE_KOBO + ZONE_FEE_KOBO + SERVICE_FEE_KOBO,
    );
  });

  it("still frees a second buyer's first order", async () => {
    await insertPromotion({
      name: "Welcome",
      scope: "first_order",
      ...aroundNow(),
    });

    const otherEmail = `other-${Date.now()}-${Math.random()}@example.com`;
    const [other] = await t.db
      .insert(schema.users)
      .values({
        first_name: "Other",
        last_name: "Buyer",
        email: otherEmail,
        role: "buyer",
      })
      .returning();

    await placeOrder(paidZoneId);
    await settleOrders();
    const theirs = await placeOrder(paidZoneId, other.id, otherEmail);

    expect(theirs.delivery_fee).toBe(0);
    expect(theirs.delivery_promotion_id).not.toBeNull();
  });
});
