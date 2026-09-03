import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { Inject } from "@nestjs/common";
import { randomBytes } from "crypto";
import { NodePgDatabase } from "drizzle-orm/node-postgres";
import { eq, desc, and, count, inArray, gte } from "drizzle-orm";
import * as schema from "../../../infrastructure/persistence/index";
import { DATABASE_CONNECTION } from "../../../infrastructure/database/database.provider";
import { computeDeliveryFee, computeServiceFee } from "@debridgers/pricing";

/*
 * `name`, `price_kobo` and `unit` are accepted for backwards compatibility with
 * clients that still send a whole cart, but they are NOT trusted. Price, name
 * and unit are re-read from the product table on every order. Only product_id
 * and qty carry meaning.
 */
export interface CartItem {
  product_id: number;
  name?: string;
  price_kobo?: number;
  unit?: string;
  qty: number;
}

/*
 * How long a freshly created, still-unpaid order stays reusable.
 *
 * Long enough to absorb a double click, a retried request, a second tab, or a
 * buyer who went back and resubmitted; short enough that someone deliberately
 * ordering the same basket again shortly after gets a genuinely new order.
 */
const ORDER_DEDUPE_WINDOW_MS = 5 * 60 * 1000;

export interface CreateOrderDto {
  delivery_address: string;
  /* Optional: falls back to the buyer's own zone when the client omits it. */
  zone_id?: number;
  delivery_time: string;
  notes?: string;
  cart: CartItem[];
}

@Injectable()
export class OrderService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  /**
   * Create order from cart
   */
  async createOrder(userId: number, dto: CreateOrderDto) {
    // Validate cart
    if (!dto.cart || dto.cart.length === 0) {
      throw new BadRequestException("Cart cannot be empty");
    }

    // Validate delivery address
    if (!dto.delivery_address || dto.delivery_address.length < 10) {
      throw new BadRequestException(
        "Delivery address must be at least 10 characters",
      );
    }

    /* Fall back to the buyer's own zone so a client that does not collect one
       still resolves a delivery fee rather than failing validation. */
    let zoneId = dto.zone_id;
    if (zoneId === undefined) {
      const [buyer] = await this.db
        .select({ zone_id: schema.users.zone_id })
        .from(schema.users)
        .where(eq(schema.users.id, userId))
        .limit(1);
      zoneId = buyer?.zone_id ?? undefined;
    }

    if (zoneId === undefined) {
      throw new BadRequestException(
        "No delivery zone supplied and none set on your profile.",
      );
    }

    // Verify zone exists
    const [zone] = await this.db
      .select()
      .from(schema.zones)
      .where(eq(schema.zones.id, zoneId))
      .limit(1);

    if (!zone) {
      throw new BadRequestException("Invalid zone");
    }

    /*
     * Price server-side. The cart arrives from the browser, so anything it says
     * about price is a suggestion from the person being charged. Reading the
     * price back from the product table is the only thing that makes the total
     * trustworthy; before this, a crafted request could buy anything for ₦1.
     */
    const productIds = [...new Set(dto.cart.map((i) => i.product_id))];
    const products = await this.db
      .select({
        id: schema.productsTable.id,
        name: schema.productsTable.name,
        unit: schema.productsTable.unit,
        price_kobo: schema.productsTable.price_kobo,
        is_active: schema.productsTable.is_active,
      })
      .from(schema.productsTable)
      .where(inArray(schema.productsTable.id, productIds));

    const priced = new Map(products.map((p) => [p.id, p]));

    let subtotal = 0;
    const items = dto.cart.map((item) => {
      const product = priced.get(item.product_id);

      if (!product) {
        throw new BadRequestException(
          `Product ${item.product_id} does not exist.`,
        );
      }
      if (!product.is_active) {
        throw new BadRequestException(
          `"${product.name}" is no longer on sale.`,
        );
      }
      if (!Number.isInteger(item.qty) || item.qty < 1) {
        throw new BadRequestException(
          `Invalid quantity for "${product.name}".`,
        );
      }

      const lineTotal = product.price_kobo * item.qty;
      subtotal += lineTotal;

      return {
        product_id: product.id,
        name: product.name,
        unit: product.unit,
        price_kobo: product.price_kobo,
        qty: item.qty,
        subtotal: lineTotal,
      };
    });

    /* Same functions the quote endpoint calls, so this path cannot drift from
       the price the buyer was shown. */
    const packageCount = items.reduce(
      (sum: number, item: { qty: number }) => sum + item.qty,
      0,
    );
    /* Not enforced against the buyer: see priceBasket in buyer.service.ts. */
    const deliveryFee = computeDeliveryFee({
      zoneFeeKobo: zone.delivery_fee || 0,
      packageCount,
      tierOnePerPackageKobo: zone.tier_one_per_package_kobo,
      tierTwoPerPackageKobo: zone.tier_two_per_package_kobo,
      deliveryCapKobo: zone.delivery_cap_kobo,
    }).deliveryFeeKobo;
    const handlingFee = computeServiceFee(subtotal);
    const total = subtotal + deliveryFee + handlingFee;

    /*
     * Idempotency, keyed on what the order actually is rather than on a token
     * the client has to remember to send.
     *
     * A repeat of the same basket, to the same address and zone, for the same
     * total, while an identical order is still sitting pending and unpaid, is a
     * duplicate submission - not a second order. Returning the existing one
     * keeps a retry, a second tab, or a double-submitted form from leaving the
     * buyer with two orders to pay for.
     *
     * Derived from columns that already exist, so there is no new key to
     * migrate or to keep in step with the cart.
     */
    const since = new Date(Date.now() - ORDER_DEDUPE_WINDOW_MS);

    const recentCandidates = await this.db
      .select()
      .from(schema.orders)
      .where(
        and(
          eq(schema.orders.buyer_id, userId),
          eq(schema.orders.status, "pending"),
          eq(schema.orders.payment_status, "unpaid"),
          eq(schema.orders.zone_id, zoneId),
          eq(schema.orders.total_amount, total),
          eq(schema.orders.delivery_address, dto.delivery_address),
          gte(schema.orders.created_at, since),
        ),
      )
      .orderBy(desc(schema.orders.created_at));

    for (const candidate of recentCandidates) {
      const existingItems = await this.db
        .select()
        .from(schema.order_items)
        .where(eq(schema.order_items.order_id, candidate.id));

      if (this.sameBasket(existingItems, items)) {
        return {
          order: {
            id: candidate.id,
            status: candidate.status,
            items: items.map((item) => ({
              product_id: item.product_id,
              name: item.name,
              qty: item.qty,
              unit_price: item.price_kobo,
              subtotal: item.subtotal,
            })),
            subtotal_kobo: subtotal,
            delivery_fee_kobo: deliveryFee,
            handling_fee_kobo: handlingFee,
            total_kobo: total,
            delivery_address: candidate.delivery_address,
            zone_id: candidate.zone_id,
            created_at: candidate.created_at,
          },
        };
      }
    }

    // Create order
    const [order] = await this.db
      .insert(schema.orders)
      .values({
        order_reference: `ord_${randomBytes(6).toString("hex")}`,
        buyer_id: userId,
        zone_id: zoneId,
        quantity: items.reduce((sum, item) => sum + item.qty, 0),
        unit_price: items[0]?.price_kobo || 0,
        delivery_fee: deliveryFee,
        handling_fee: handlingFee,
        total_amount: total,
        delivery_address: dto.delivery_address,
        notes: dto.notes,
        order_mode: "referral",
        status: "pending",
        payment_status: "unpaid",
      })
      .returning();

    // Create order items
    for (const item of items) {
      await this.db.insert(schema.order_items).values({
        order_id: order.id,
        product_id: item.product_id,
        quantity: item.qty,
        unit_price_kobo: item.price_kobo,
      });
    }

    return {
      order: {
        id: order.id,
        status: order.status,
        items: items.map((item) => ({
          product_id: item.product_id,
          name: item.name,
          qty: item.qty,
          unit_price: item.price_kobo,
          subtotal: item.subtotal,
        })),
        subtotal_kobo: subtotal,
        delivery_fee_kobo: deliveryFee,
        handling_fee_kobo: handlingFee,
        total_kobo: total,
        delivery_address: dto.delivery_address,
        zone_id: zoneId,
        created_at: order.created_at,
      },
    };
  }

  /*
   * Same products, same quantities, same prices - order-independent.
   *
   * Prices are compared too: if a product was repriced between the two
   * submissions the totals would differ anyway, but comparing explicitly means
   * this never quietly hands back an order priced at yesterday's rate.
   */
  private sameBasket(
    existing: {
      product_id: number;
      quantity: number;
      unit_price_kobo: number;
    }[],
    incoming: { product_id: number; qty: number; price_kobo: number }[],
  ): boolean {
    if (existing.length !== incoming.length) return false;

    const key = (productId: number, qty: number, price: number): string =>
      `${productId}:${qty}:${price}`;

    const existingKeys = new Set(
      existing.map((row) =>
        key(row.product_id, row.quantity, row.unit_price_kobo),
      ),
    );

    return incoming.every((item) =>
      existingKeys.has(key(item.product_id, item.qty, item.price_kobo)),
    );
  }

  /**
   * Get orders for buyer
   */
  async getOrders(
    userId: number,
    status?: string,
    paymentStatus?: string,
    page: number = 1,
    limit: number = 10,
  ) {
    const offset = (page - 1) * limit;

    const whereConditions: unknown[] = [eq(schema.orders.buyer_id, userId)];

    if (status) {
      // @ts-ignore - Drizzle enum type mismatch
      whereConditions.push(eq(schema.orders.status, status));
    }

    if (paymentStatus) {
      // @ts-ignore - Drizzle enum type mismatch
      whereConditions.push(eq(schema.orders.payment_status, paymentStatus));
    }

    const queryResult = await Promise.all([
      this.db
        .select()
        .from(schema.orders)
        .where(and(...(whereConditions as Parameters<typeof and>)))
        .orderBy(desc(schema.orders.created_at))
        .limit(limit)
        .offset(offset),
      this.db
        .select({ total: count() })
        .from(schema.orders)
        .where(and(...(whereConditions as Parameters<typeof and>))),
    ]);

    const [orders, countResult] = queryResult;
    const totalCount =
      Array.isArray(countResult) && countResult.length > 0
        ? (countResult[0] as unknown as { total: number }).total
        : 0;

    return {
      orders: orders.map((order) => ({
        id: order.id,
        status: order.status,
        payment_status: order.payment_status,
        total_kobo: order.total_amount,
        item_count: order.quantity,
        delivery_address: order.delivery_address,
        created_at: order.created_at,
      })),
      pagination: {
        page,
        limit,
        total: totalCount,
      },
    };
  }

  /**
   * Get single order
   */
  async getOrderById(userId: number, orderId: number) {
    const [order] = await this.db
      .select()
      .from(schema.orders)
      .where(
        and(eq(schema.orders.id, orderId), eq(schema.orders.buyer_id, userId)),
      )
      .limit(1);

    if (!order) {
      throw new NotFoundException("Order not found");
    }

    /*
     * Joined rather than reading order_items alone, which left the caller with
     * only a product_id and forced the name to be the id as a string. The
     * buyer's order detail and "repeat last order" both need the real name,
     * unit and image.
     *
     * unit_price still comes from the line, never from products: a later price
     * change must not rewrite what someone already paid.
     */
    const items = await this.db
      .select({
        product_id: schema.order_items.product_id,
        quantity: schema.order_items.quantity,
        unit_price_kobo: schema.order_items.unit_price_kobo,
        name: schema.productsTable.name,
        unit: schema.productsTable.unit,
        image_url: schema.productsTable.image_url,
      })
      .from(schema.order_items)
      .innerJoin(
        schema.productsTable,
        eq(schema.productsTable.id, schema.order_items.product_id),
      )
      .where(eq(schema.order_items.order_id, orderId));

    const zone = await this.db
      .select()
      .from(schema.zones)
      .where(eq(schema.zones.id, order.zone_id))
      .limit(1);

    return {
      id: order.id,
      status: order.status,
      payment_method: order.order_mode || "unknown",
      payment_status: order.payment_status,
      items: items.map((item) => ({
        product_id: item.product_id,
        name: item.name,
        unit: item.unit,
        image_url: item.image_url,
        qty: item.quantity,
        unit_price: item.unit_price_kobo,
        subtotal: item.quantity * item.unit_price_kobo,
      })),
      subtotal_kobo: order.total_amount - order.delivery_fee,
      delivery_fee_kobo: order.delivery_fee,
      total_kobo: order.total_amount,
      delivery_address: order.delivery_address,
      zone_name: zone?.[0]?.name || "Unknown",
      created_at: order.created_at,
      estimated_delivery: new Date(
        Date.now() + 48 * 60 * 60 * 1000,
      ).toISOString(),
      tracking_url: `https://debridgers.com/track/${order.id}`,
    };
  }

  /**
   * Update order status
   */
  async updateOrderStatus(orderId: number, status: string) {
    const [updated] = await this.db
      .update(schema.orders)
      // @ts-ignore - Drizzle enum type mismatch
      .set({ status: status })
      .where(eq(schema.orders.id, orderId))
      .returning();

    return updated;
  }

  /*
   * Used when Paystack initialisation fails after the order row already
   * exists, and by the reconciliation sweep for checkouts that were never
   * paid. Only ever touches orders that are still unpaid, so a payment that
   * landed in the meantime can never be cancelled out from under the buyer.
   */
  async cancelOrderForFailedPayment(
    orderId: number,
    reason = "Payment initialization failed",
  ) {
    const [updated] = await this.db
      .update(schema.orders)
      // @ts-ignore - Drizzle enum type mismatch
      .set({ status: "cancelled", cancellation_reason: reason })
      .where(
        and(
          eq(schema.orders.id, orderId),
          eq(schema.orders.payment_status, "unpaid"),
        ),
      )
      .returning();

    return updated;
  }

  /**
   * Update payment status
   */
  async updatePaymentStatus(orderId: number, status: string) {
    const [updated] = await this.db
      .update(schema.orders)
      // @ts-ignore - Drizzle enum type mismatch
      .set({ payment_status: status })
      .where(eq(schema.orders.id, orderId))
      .returning();

    return updated;
  }

  /**
   * Cancel order (only if not yet confirmed)
   */
  async cancelOrder(userId: number, orderId: number, reason: string) {
    const [order] = await this.db
      .select()
      .from(schema.orders)
      .where(
        and(eq(schema.orders.id, orderId), eq(schema.orders.buyer_id, userId)),
      )
      .limit(1);

    if (!order) {
      throw new NotFoundException("Order not found");
    }

    if (order.status === "delivered" || order.status === "cancelled") {
      throw new BadRequestException(
        "Cannot cancel a delivered or already cancelled order",
      );
    }

    if (order.payment_status === "paid" && order.status !== "pending") {
      throw new BadRequestException(
        "Cannot cancel paid orders. Request refund instead",
      );
    }

    const [updated] = await this.db
      .update(schema.orders)
      .set({ status: "cancelled", cancellation_reason: reason })
      .where(eq(schema.orders.id, orderId))
      .returning();

    return updated;
  }

  /**
   * Request refund for order
   */
  async requestRefund(userId: number, orderId: number, reason: string) {
    const [order] = await this.db
      .select()
      .from(schema.orders)
      .where(
        and(eq(schema.orders.id, orderId), eq(schema.orders.buyer_id, userId)),
      )
      .limit(1);

    if (!order) {
      throw new NotFoundException("Order not found");
    }

    if (order.payment_status !== "paid") {
      throw new BadRequestException("Only paid orders can be refunded");
    }

    /*
     * This used to set status to "delivered", which marked an order the buyer
     * is disputing as successfully completed and fed it into the spending
     * totals. The request is now persisted as a real refund row for admin to
     * action, and the order goes to the status that means "under review".
     */
    const [existing] = await this.db
      .select()
      .from(schema.refunds)
      .where(eq(schema.refunds.order_id, orderId))
      .limit(1);

    if (existing) {
      throw new BadRequestException(
        "A refund has already been requested for this order",
      );
    }

    const reference = `RF_${orderId}_${Date.now()}`;

    const [refund] = await this.db
      .insert(schema.refunds)
      .values({
        order_id: orderId,
        amount: String(order.total_amount),
        reference,
        reason,
        status: "initiated",
      })
      .returning();

    await this.db
      .update(schema.orders)
      .set({ notes: `Refund requested: ${reason}` })
      .where(eq(schema.orders.id, orderId));

    await this.db.insert(schema.notifications).values({
      user_id: userId,
      title: `Refund requested for order #${orderId}`,
      description:
        "We have received your refund request and will review it shortly.",
      read: false,
    });

    return {
      order_id: orderId,
      refund_id: refund.id,
      status: refund.status,
      reference,
      reason,
      amount_kobo: order.total_amount,
      requested_at: refund.initiated_at.toISOString(),
    };
  }

  /**
   * List orders by status with pagination
   */
  async getOrdersByStatus(
    userId: number,
    status: string,
    page: number = 1,
    limit: number = 10,
  ) {
    const offset = (page - 1) * limit;

    const [orders, [{ total }]] = await Promise.all([
      this.db
        .select()
        .from(schema.orders)
        .where(
          and(
            eq(schema.orders.buyer_id, userId),
            // @ts-ignore - Drizzle enum type mismatch
            eq(schema.orders.status, status),
          ),
        )
        .orderBy(desc(schema.orders.created_at))
        .limit(limit)
        .offset(offset),
      this.db
        .select({ total: count() })
        .from(schema.orders)
        .where(
          and(
            eq(schema.orders.buyer_id, userId),
            // @ts-ignore - Drizzle enum type mismatch
            eq(schema.orders.status, status),
          ),
        ),
    ]);

    return {
      orders: orders.map((order) => ({
        id: order.id,
        status: order.status,
        total_kobo: order.total_amount,
        created_at: order.created_at,
      })),
      pagination: { page, limit, total: Number(total) },
    };
  }
}
