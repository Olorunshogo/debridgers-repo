import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
} from "@nestjs/common";
import { NodePgDatabase } from "drizzle-orm/node-postgres";
import { eq, and, desc, isNull, inArray } from "drizzle-orm";
import * as schema from "../../../../infrastructure/persistence/index";
import { DATABASE_CONNECTION } from "../../../../infrastructure/database/database.provider";
import { NotificationsService } from "../../buyer/notifications.service";
import type { VerifyDeliveryDto } from "./dto/verify-delivery.dto";
import type { OrderStatus } from "../../../shared/order-status";

/*
 * An order awaiting proof of delivery is one that has been confirmed and may
 * also have been dispatched. Filtering on "confirmed" alone meant an order moved
 * to out_for_delivery left this queue and could never be verified, which is why
 * a confirmed -> delivered shortcut was added to the transition table to work
 * around it. That shortcut is now gone.
 *
 * Note the asymmetry, which is deliberate. The manual status endpoint can no
 * longer move an order from confirmed straight to delivered, because that would
 * record a delivery nobody was ever dispatched for. This endpoint can, because
 * it demands photographic evidence to do it: the proof is what earns the right
 * to skip the dispatch step.
 */
const AWAITING_VERIFICATION: readonly OrderStatus[] = [
  "confirmed",
  "out_for_delivery",
];

@Injectable()
export class DeliveryAdminService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
    private readonly notificationsService: NotificationsService,
  ) {}

  async listPendingDeliveries() {
    const orders = await this.db
      .select({
        id: schema.orders.id,
        order_reference: schema.orders.order_reference,
        buyer_id: schema.orders.buyer_id,
        buyer_name: schema.users.first_name,
        buyer_phone: schema.users.phone,
        delivery_address: schema.orders.delivery_address,
        total_amount: schema.orders.total_amount,
        status: schema.orders.status,
        created_at: schema.orders.created_at,
      })
      .from(schema.orders)
      .innerJoin(schema.users, eq(schema.orders.buyer_id, schema.users.id))
      .where(
        and(
          inArray(schema.orders.status, [...AWAITING_VERIFICATION]),
          isNull(schema.orders.delivery_verified_at),
        ),
      )
      .orderBy(desc(schema.orders.created_at));

    return {
      orders: orders.map((o) => ({
        id: o.id,
        order_reference: o.order_reference,
        buyer_name: o.buyer_name,
        buyer_phone: o.buyer_phone,
        delivery_address: o.delivery_address,
        amount: o.total_amount,
        status: o.status,
        created_at: o.created_at,
      })),
      total: orders.length,
    };
  }

  async verifyDelivery(
    orderId: number,
    data: VerifyDeliveryDto,
    adminId: number,
  ) {
    /*
     * Explicit columns. A bare select() pulled the whole row, including any
     * proof photos already stored on it, which on this table means dragging
     * megabytes of base64 through memory to read a status.
     */
    const [order] = await this.db
      .select({
        id: schema.orders.id,
        buyer_id: schema.orders.buyer_id,
        order_reference: schema.orders.order_reference,
        status: schema.orders.status,
        delivery_verified_at: schema.orders.delivery_verified_at,
      })
      .from(schema.orders)
      .where(eq(schema.orders.id, orderId));

    if (!order) {
      throw new NotFoundException("Order not found");
    }

    if (!AWAITING_VERIFICATION.includes(order.status)) {
      throw new BadRequestException(
        "Order must be confirmed or out for delivery before it can be verified",
      );
    }

    if (order.delivery_verified_at) {
      throw new BadRequestException("Delivery already verified");
    }

    // Update order
    await this.db
      // delivery_recipient_name records who actually took delivery, rather than who placed the order.
      .update(schema.orders)
      .set({
        status: "delivered",
        delivery_verified_at: new Date(),
        delivery_verified_by_admin_id: adminId,
        delivery_proof_photos: data.photos,
        delivery_notes: data.notes || null,
        delivery_recipient_name: data.recipient_name || null,
      })
      .where(eq(schema.orders.id, orderId));

    // Log action
    await this.db.insert(schema.buyerAdminLogs).values({
      admin_id: adminId,
      buyer_id: order.buyer_id,
      action: "verify_delivery",
      details: {
        order_id: orderId,
        order_reference: order.order_reference,
        photos_count: data.photos.length,
        recipient_name: data.recipient_name ?? null,
      },
    });

    /*
     * A delivery notification, not a payment one. This previously called
     * notifyPaymentConfirmed, so a buyer whose goods had just arrived was told
     * their payment had cleared by wallet, which was neither the event that
     * happened nor, in most cases, the method they had paid by.
     */
    await this.notificationsService.notifyOrderStatus(
      order.buyer_id,
      orderId,
      "delivered",
      data.recipient_name
        ? `Order ${order.order_reference} was delivered and received by ${data.recipient_name}.`
        : `Order ${order.order_reference} was delivered.`,
    );

    return {
      order_id: orderId,
      status: "delivered",
      verified_at: new Date(),
      verified_by_admin_id: adminId,
    };
  }

  async getOrderDetails(orderId: number) {
    const [order] = await this.db
      .select({
        id: schema.orders.id,
        order_reference: schema.orders.order_reference,
        buyer_id: schema.orders.buyer_id,
        buyer_name: schema.users.first_name,
        buyer_phone: schema.users.phone,
        delivery_address: schema.orders.delivery_address,
        total_amount: schema.orders.total_amount,
        status: schema.orders.status,
        payment_status: schema.orders.payment_status,
        created_at: schema.orders.created_at,
        delivery_verified_at: schema.orders.delivery_verified_at,
        delivery_proof_photos: schema.orders.delivery_proof_photos,
        delivery_notes: schema.orders.delivery_notes,
        delivery_recipient_name: schema.orders.delivery_recipient_name,
      })
      .from(schema.orders)
      .innerJoin(schema.users, eq(schema.orders.buyer_id, schema.users.id))
      .where(eq(schema.orders.id, orderId));

    if (!order) {
      throw new NotFoundException("Order not found");
    }

    return {
      id: order.id,
      order_reference: order.order_reference,
      buyer_name: order.buyer_name,
      buyer_phone: order.buyer_phone,
      delivery_address: order.delivery_address,
      amount: order.total_amount,
      status: order.status,
      payment_status: order.payment_status,
      created_at: order.created_at,
      delivery_verified_at: order.delivery_verified_at,
      delivery_proof_photos: order.delivery_proof_photos,
      delivery_notes: order.delivery_notes,
      delivery_recipient_name: order.delivery_recipient_name,
    };
  }
}
