import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { Inject } from "@nestjs/common";
import { NodePgDatabase } from "drizzle-orm/node-postgres";
import { eq, desc, and, count } from "drizzle-orm";
import * as schema from "../../../infrastructure/persistence/index";
import { DATABASE_CONNECTION } from "../../../infrastructure/database/database.provider";

export interface CartItem {
  product_id: number;
  name: string;
  price_kobo: number;
  unit: string;
  qty: number;
}

export interface CreateOrderDto {
  delivery_address: string;
  zone_id: number;
  delivery_time: string;
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

    // Verify zone exists
    const [zone] = await this.db
      .select()
      .from(schema.zones)
      .where(eq(schema.zones.id, dto.zone_id))
      .limit(1);

    if (!zone) {
      throw new BadRequestException("Invalid zone");
    }

    // Calculate totals
    let subtotal = 0;
    const items = dto.cart.map((item) => {
      const lineTotal = item.price_kobo * item.qty;
      subtotal += lineTotal;
      return {
        ...item,
        subtotal: lineTotal,
      };
    });

    const deliveryFee = zone.delivery_fee || 0;
    const handlingFee = 10000;
    const total = subtotal + deliveryFee + handlingFee;

    // Create order
    const [order] = await this.db
      .insert(schema.orders)
      .values({
        buyer_id: userId,
        zone_id: dto.zone_id,
        quantity: dto.cart.reduce((sum, item) => sum + item.qty, 0),
        unit_price: items[0]?.price_kobo || 0,
        delivery_fee: deliveryFee,
        handling_fee: handlingFee,
        total_amount: total,
        delivery_address: dto.delivery_address,
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
        total_amount: total,
        delivery_address: dto.delivery_address,
        zone_id: dto.zone_id,
        created_at: order.created_at,
      },
    };
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

    const items = await this.db
      .select()
      .from(schema.order_items)
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
        name: item.product_id.toString(), // TODO: Join with products table
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

    // Create refund request record (you may want a separate refunds table)
    await this.db
      .update(schema.orders)
      .set({
        status: "delivered",
        notes: `Refund requested: ${reason}`,
      })
      .where(eq(schema.orders.id, orderId));

    return {
      order_id: orderId,
      status: "refund_pending",
      reason,
      amount_kobo: order.total_amount,
      requested_at: new Date().toISOString(),
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
