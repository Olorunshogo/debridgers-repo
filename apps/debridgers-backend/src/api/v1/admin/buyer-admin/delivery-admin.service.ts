import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
} from "@nestjs/common";
import { NodePgDatabase } from "drizzle-orm/node-postgres";
import { eq, and, desc, isNull } from "drizzle-orm";
import * as schema from "../../../../infrastructure/persistence/index";
import { DATABASE_CONNECTION } from "../../../../infrastructure/database/database.provider";
import { NotificationsService } from "../../buyer/notifications.service";

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
        created_at: schema.orders.created_at,
      })
      .from(schema.orders)
      .innerJoin(schema.users, eq(schema.orders.buyer_id, schema.users.id))
      .where(
        and(
          eq(schema.orders.status, "confirmed"),
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
        created_at: o.created_at,
      })),
      total: orders.length,
    };
  }

  async verifyDelivery(
    orderId: number,
    data: {
      photos: string[];
      notes?: string;
      recipient_name?: string;
    },
    adminId: number,
  ) {
    const [order] = await this.db
      .select()
      .from(schema.orders)
      .where(eq(schema.orders.id, orderId));

    if (!order) {
      throw new NotFoundException("Order not found");
    }

    if (order.status !== "confirmed") {
      throw new BadRequestException(
        "Order must be confirmed before marking as delivered",
      );
    }

    if (order.delivery_verified_at) {
      throw new BadRequestException("Delivery already verified");
    }

    // Update order
    await this.db
      .update(schema.orders)
      .set({
        status: "delivered",
        delivery_verified_at: new Date(),
        delivery_verified_by_admin_id: adminId,
        delivery_proof_photos: data.photos,
        delivery_notes: data.notes || null,
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
      },
    });

    // Send notification to buyer
    await this.notificationsService.notifyPaymentConfirmed(
      order.buyer_id,
      orderId,
      order.total_amount,
      "wallet",
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
    };
  }
}
