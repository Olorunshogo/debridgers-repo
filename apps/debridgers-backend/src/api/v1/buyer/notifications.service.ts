import { Injectable, Inject, Logger } from "@nestjs/common";
import { NodePgDatabase } from "drizzle-orm/node-postgres";
import { eq, desc, and, count } from "drizzle-orm";
import * as schema from "../../../infrastructure/persistence/index";
import type { NotificationType } from "../../../infrastructure/persistence/schemas/notifications.schema";
import { DATABASE_CONNECTION } from "../../../infrastructure/database/database.provider";

export interface NotificationInput {
  type: NotificationType;
  title: string;
  description: string;
}

export type NotificationStatus = "unread" | "read" | "done";

/* `done` wins over `read`: a handled notification is read by definition. */
function toStatus(row: { read: boolean; done: boolean }): NotificationStatus {
  if (row.done) return "done";
  return row.read ? "read" : "unread";
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  // === Writing

  /** The one insert path. Every notify* helper below funnels through it. */
  async notify(userId: number, input: NotificationInput): Promise<void> {
    await this.db.insert(schema.notifications).values({
      user_id: userId,
      type: input.type,
      title: input.title,
      description: input.description,
      read: false,
    });
  }

  /*
   * Fans one notification out to every admin.
   *
   * Admins are ordinary rows in `users`, so an admin notification is just a
   * row per admin. Failure is logged and swallowed: an admin not hearing about
   * a withdrawal must never roll back the withdrawal itself.
   */
  async notifyAdmins(input: NotificationInput): Promise<void> {
    try {
      /* Sub-admins are role "admin" with a tier, so this reaches them too. */
      const admins = await this.db
        .select({ id: schema.users.id })
        .from(schema.users)
        .where(eq(schema.users.role, "admin"));

      if (admins.length === 0) return;

      await this.db.insert(schema.notifications).values(
        admins.map((admin) => ({
          user_id: admin.id,
          type: input.type,
          title: input.title,
          description: input.description,
          read: false,
        })),
      );
    } catch (error) {
      this.logger.error(
        `Failed to notify admins: ${input.title}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  /**
   * Send order status notification
   */
  async notifyOrderStatus(
    userId: number,
    orderId: number,
    status: string,
    message: string,
  ) {
    await this.notify(userId, {
      type: "order",
      title: `Order #${orderId} ${status}`,
      description: message,
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
    await this.notify(userId, {
      type: "payment",
      title: `Payment Confirmed`,
      description: `Your payment of ₦${amount / 100} via ${method} for order #${orderId} has been confirmed.`,
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
    await this.notify(userId, {
      type: "wallet",
      title: `Wallet ${typeLabel}`,
      description: `Your wallet ${typeLabel.toLowerCase()} of ₦${amount / 100} is ${status}.`,
    });
  }

  // === Reading

  /**
   * Get notifications for any user. Role is enforced by the calling
   * controller's guard; the query itself is only ever scoped by user id.
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

    /* The dashboards work in one status, not two booleans. Deriving it here
       keeps that collapse in a single place instead of in every client. */
    return notifications.map((row) => ({
      ...row,
      status: toStatus(row),
    }));
  }

  /**
   * Mark notification as read
   */
  async markAsRead(userId: number, notificationId: number) {
    // user_id is part of the predicate: without it any buyer could mark
    // another buyer's notification read by guessing an id.
    await this.db
      .update(schema.notifications)
      .set({ read: true })
      .where(
        and(
          eq(schema.notifications.id, notificationId),
          eq(schema.notifications.user_id, userId),
        ),
      );
  }

  /*
   * Marking done also marks read. Writing only `done` would leave a row that
   * the unread badge still counts, so the bell would keep a dot for something
   * the user has explicitly finished with.
   */
  async markAsDone(userId: number, notificationId: number) {
    await this.db
      .update(schema.notifications)
      .set({ done: true, read: true })
      .where(
        and(
          eq(schema.notifications.id, notificationId),
          eq(schema.notifications.user_id, userId),
        ),
      );
  }

  async getUnreadCount(userId: number): Promise<number> {
    const [row] = await this.db
      .select({ total: count() })
      .from(schema.notifications)
      .where(
        and(
          eq(schema.notifications.user_id, userId),
          eq(schema.notifications.read, false),
        ),
      );

    return Number(row?.total ?? 0);
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
