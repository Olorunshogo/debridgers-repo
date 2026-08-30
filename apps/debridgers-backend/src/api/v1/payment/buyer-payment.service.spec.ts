import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  vi,
} from "vitest";
import { eq } from "drizzle-orm";
import { ConfigService } from "@nestjs/config";
import { BuyerPaymentService } from "./buyer-payment.service";
import { WalletService } from "../wallet/wallet.service";
import { OrderService } from "../buyer/order.service";
import { NotificationsService } from "../buyer/notifications.service";
import { LedgerService } from "./ledger.service";
import * as schema from "../../../infrastructure/persistence/index";
import {
  createTestDatabase,
  databaseAvailable,
  type TestDb,
} from "../../../test/db";

/*
 * Paying for an order, from both directions: the wallet, which moves money
 * immediately, and the Paystack return, which must settle against what
 * Paystack says was received rather than what the browser claims.
 *
 * Paystack itself is stubbed - these assert our own settlement rules, not
 * theirs - but nothing else is. The wallet, ledger and orders are real, so a
 * double charge would show up as a real balance being wrong.
 */

const hasDb = await databaseAvailable();

describe.skipIf(!hasDb)("BuyerPaymentService", () => {
  let t: TestDb;
  let payments: BuyerPaymentService;
  let wallets: WalletService;
  let orderService: OrderService;
  let userId: number;
  let zoneId: number;
  let productId: number;

  beforeAll(async () => {
    t = await createTestDatabase("payments");
    const ledger = new LedgerService(t.db);
    const notifications = new NotificationsService(t.db);
    wallets = new WalletService(t.db, notifications, ledger);
    orderService = new OrderService(t.db);

    const config = {
      get: (key: string) =>
        key === "PAYSTACK_SECRET_KEY" ? "sk_test_stub" : "http://localhost",
    } as unknown as ConfigService;

    /*
     * The payment module gained an admin ledger and a Paystack invoice client
     * after this suite was written. Both are stubbed: they are side effects of
     * a successful payment, not part of the settlement rules under test, and a
     * real invoice client would reach for the network.
     */
    const adminAccount = {
      creditPlatformAccount: async () => undefined,
    } as unknown as ConstructorParameters<typeof BuyerPaymentService>[6];

    const invoice = {
      markInvoiceAsPaid: async () => undefined,
    } as unknown as ConstructorParameters<typeof BuyerPaymentService>[7];

    payments = new BuyerPaymentService(
      t.db,
      wallets,
      orderService,
      notifications,
      config,
      ledger,
      adminAccount,
      invoice,
    );
  }, 120000);

  afterAll(async () => {
    await t?.destroy();
  });

  beforeEach(async () => {
    await t.truncate();
    vi.restoreAllMocks();

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

    const [product] = await t.db
      .insert(schema.productsTable)
      /* Priced from the real catalogue so the basket clears the ₦25,000
         minimum order, which a ₦10,000 fixture no longer does. */
      .values({ name: "Rice", unit: "50kg bag", price_kobo: 4_200_000 })
      .returning();
    productId = product.id;
  });

  async function makeOrder() {
    const result = await orderService.createOrder(userId, {
      delivery_address: "12 Ahmadu Bello Way, Kaduna",
      zone_id: zoneId,
      delivery_time: "today",
      cart: [{ product_id: productId, qty: 1 }],
    });
    return result.order;
  }

  async function fundWallet(kobo: number) {
    const reference = `fund_${Date.now()}_${Math.random()}`;
    await wallets.createPendingTransaction(userId, kobo, reference);
    await wallets.confirmTransaction(reference);
  }

  async function balance(): Promise<number> {
    const [row] = await t.db
      .select()
      .from(schema.buyerWallets)
      .where(eq(schema.buyerWallets.user_id, userId));
    return row?.available_balance ?? 0;
  }

  async function orderRow(id: number) {
    const [row] = await t.db
      .select()
      .from(schema.orders)
      .where(eq(schema.orders.id, id));
    return row;
  }

  // === Wallet payment

  it("pays an order from the wallet and marks it confirmed", async () => {
    const order = await makeOrder();
    await fundWallet(order.total_kobo);

    await payments.payWithWallet(userId, order.id, order.total_kobo);

    const row = await orderRow(order.id);
    expect(row.payment_status).toBe("paid");
    expect(row.status).toBe("confirmed");
    expect(await balance()).toBe(0);
  });

  it("refuses to charge the wallet twice for one order", async () => {
    const order = await makeOrder();
    await fundWallet(order.total_kobo * 2);

    await payments.payWithWallet(userId, order.id, order.total_kobo);

    await expect(
      payments.payWithWallet(userId, order.id, order.total_kobo),
    ).rejects.toThrow(/already paid/i);

    /* The second attempt must not have moved money. */
    expect(await balance()).toBe(order.total_kobo);
  });

  it("refuses a payment for less than the order total", async () => {
    const order = await makeOrder();
    await fundWallet(order.total_kobo);

    await expect(
      payments.payWithWallet(userId, order.id, order.total_kobo - 1),
    ).rejects.toThrow(/does not match/i);

    expect(await balance()).toBe(order.total_kobo);
    expect((await orderRow(order.id)).payment_status).toBe("unpaid");
  });

  it("leaves the order unpaid when the wallet cannot cover it", async () => {
    const order = await makeOrder();
    await fundWallet(order.total_kobo - 1);

    await expect(
      payments.payWithWallet(userId, order.id, order.total_kobo),
    ).rejects.toThrow(/Insufficient wallet balance/i);

    expect((await orderRow(order.id)).payment_status).toBe("unpaid");
    expect(await balance()).toBe(order.total_kobo - 1);
  });

  it("will not let one buyer pay another buyer's order", async () => {
    const order = await makeOrder();
    const [other] = await t.db
      .insert(schema.users)
      .values({
        first_name: "Other",
        last_name: "Buyer",
        email: `other-${Date.now()}-${Math.random()}@example.com`,
        role: "buyer",
      })
      .returning();

    await expect(
      payments.payWithWallet(other.id, order.id, order.total_kobo),
    ).rejects.toThrow(/not found/i);

    expect((await orderRow(order.id)).payment_status).toBe("unpaid");
  });

  // === Paystack return

  function stubPaystack(status: string, amount: number) {
    return vi
      .spyOn(
        payments as unknown as {
          verifyPaystackTransaction: (r: string) => Promise<unknown>;
        },
        "verifyPaystackTransaction",
      )
      .mockResolvedValue({ status, amount });
  }

  async function orderAwaitingPaystack(reference: string) {
    const order = await makeOrder();
    await t.db
      .update(schema.orders)
      .set({ payment_reference: reference })
      .where(eq(schema.orders.id, order.id));
    return order;
  }

  it("marks the order paid when Paystack says the charge succeeded", async () => {
    const order = await orderAwaitingPaystack("ps_ok");
    stubPaystack("success", order.total_kobo);

    const result = await payments.confirmOrderPayment(userId, "ps_ok");

    expect(result.already).toBe(false);
    expect((await orderRow(order.id)).payment_status).toBe("paid");
  });

  /* Coming back from Paystack proves the buyer returned, not that they paid. */
  it("does not mark the order paid when the charge failed", async () => {
    const order = await orderAwaitingPaystack("ps_failed");
    stubPaystack("failed", order.total_kobo);

    await expect(
      payments.confirmOrderPayment(userId, "ps_failed"),
    ).rejects.toThrow(/not completed/i);

    expect((await orderRow(order.id)).payment_status).toBe("unpaid");
  });

  it("refuses to settle when Paystack received less than the total", async () => {
    const order = await orderAwaitingPaystack("ps_short");
    stubPaystack("success", order.total_kobo - 100);

    await expect(
      payments.confirmOrderPayment(userId, "ps_short"),
    ).rejects.toThrow(/does not match the order total/i);

    expect((await orderRow(order.id)).payment_status).toBe("unpaid");
  });

  it("is idempotent when the buyer and the webhook both confirm", async () => {
    const order = await orderAwaitingPaystack("ps_twice");
    stubPaystack("success", order.total_kobo);

    const first = await payments.confirmOrderPayment(userId, "ps_twice");
    const second = await payments.confirmOrderPayment(userId, "ps_twice");

    expect(first.already).toBe(false);
    expect(second.already).toBe(true);
    expect(second.order_id).toBe(order.id);
  });

  it("will not confirm another buyer's order", async () => {
    const order = await orderAwaitingPaystack("ps_other");
    stubPaystack("success", order.total_kobo);

    const [other] = await t.db
      .insert(schema.users)
      .values({
        first_name: "Other",
        last_name: "Buyer",
        email: `other-${Date.now()}-${Math.random()}@example.com`,
        role: "buyer",
      })
      .returning();

    await expect(
      payments.confirmOrderPayment(other.id, "ps_other"),
    ).rejects.toThrow(/another account/i);

    expect((await orderRow(order.id)).payment_status).toBe("unpaid");
  });

  it("rejects a reference no order was created for", async () => {
    await expect(
      payments.confirmOrderPayment(userId, "ps_unknown"),
    ).rejects.toThrow(/No order found/i);
  });
});
