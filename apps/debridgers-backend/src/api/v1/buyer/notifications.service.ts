import { Injectable, Inject } from "@nestjs/common";
import { NodePgDatabase } from "drizzle-orm/node-postgres";
import { eq, desc } from "drizzle-orm";
import * as schema from "../../../infrastructure/persistence/index";
import { DATABASE_CONNECTION } from "../../../infrastructure/database/database.provider";

@Injectable()
export class NotificationsService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  /**
   * Send order status notification
   */
  async notifyOrderStatus(
    userId: number,
    orderId: number,
    status: string,
    message: string,
  ) {
    await this.db.insert(schema.notifications).values({
      user_id: userId,
      title: `Order #${orderId} ${status}`,
      description: message,
      read: false,
    });
  }

  /**
   * Send payment confirmation
   */
  async notifyPaymentConfirmed(
    userId: number,
    orderId: number,
    amount: number,
    method: string,
  ) {
    await this.db.insert(schema.notifications).values({
      user_id: userId,
      title: `Payment Confirmed`,
      description: `Your payment of ₦${amount / 100} via ${method} for order #${orderId} has been confirmed.`,
      read: false,
    });
  }

  /**
   * Send wallet notification
   */
  async notifyWalletTransaction(
    userId: number,
    type: "deposit" | "withdrawal",
    amount: number,
    status: string,
  ) {
    const typeLabel = type === "deposit" ? "Deposit" : "Withdrawal";
    await this.db.insert(schema.notifications).values({
      user_id: userId,
      title: `Wallet ${typeLabel}`,
      description: `Your wallet ${typeLabel.toLowerCase()} of ₦${amount / 100} is ${status}.`,
      read: false,
    });
  }

  /**
   * Get buyer notifications
   */
  async getNotifications(userId: number, page: number = 1, limit: number = 10) {
    const offset = (page - 1) * limit;

    const notifications = await this.db
      .select()
      .from(schema.notifications)
      .where(eq(schema.notifications.user_id, userId))
      .orderBy(desc(schema.notifications.created_at))
      .limit(limit)
      .offset(offset);

    return notifications;
  }

  /**
   * Mark notification as read
   */
  async markAsRead(userId: number, notificationId: number) {
    await this.db
      .update(schema.notifications)
      .set({ read: true })
      .where(eq(schema.notifications.id, notificationId));
  }

  /**
   * Mark all as read
   */
  async markAllAsRead(userId: number) {
    await this.db
      .update(schema.notifications)
      .set({ read: true })
      .where(eq(schema.notifications.user_id, userId));
  }
}
