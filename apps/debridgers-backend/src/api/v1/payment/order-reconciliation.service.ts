import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Cron } from "@nestjs/schedule";
import { NodePgDatabase } from "drizzle-orm/node-postgres";
import { and, asc, eq, lt } from "drizzle-orm";
import * as schema from "../../../infrastructure/persistence/index";
import { DATABASE_CONNECTION } from "../../../infrastructure/database/database.provider";
import { OrderService } from "../buyer/order.service";
import { BuyerPaymentService } from "./buyer-payment.service";
import { NotificationsService } from "../buyer/notifications.service";

/*
 * Buyers who reach Paystack and never come back leave their order pending and
 * unpaid forever, and a webhook that is delayed or unreachable leaves a real
 * payment unsettled. Both are the same problem seen from opposite sides, so
 * this sweep resolves them together: ask Paystack what actually happened,
 * settle anything that succeeded, and only then expire what did not.
 *
 * Reconcile before expiring is the whole point. Cancelling on a timer alone
 * would eventually cancel an order whose money we already took.
 */

/* Long enough that a buyer still typing their card details is never touched. */
const RECONCILE_AFTER_MINUTES = 15;

/* Never ask Paystack about more than this in one pass. */
const BATCH_LIMIT = 100;

const DEFAULT_TTL_HOURS = 24;

@Injectable()
export class OrderReconciliationService {
  private readonly logger = new Logger(OrderReconciliationService.name);
  private readonly ttlHours: number;

  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
    private readonly orderService: OrderService,
    private readonly buyerPaymentService: BuyerPaymentService,
    private readonly notificationsService: NotificationsService,
    private readonly config: ConfigService,
  ) {
    const configured = Number(
      this.config.get<string>("ORDER_PAYMENT_TTL_HOURS"),
    );
    this.ttlHours =
      Number.isFinite(configured) && configured > 0
        ? configured
        : DEFAULT_TTL_HOURS;
  }

  @Cron("*/15 * * * *", {
    name: "buyer-order-reconciliation",
  })
  async reconcilePendingOrders(): Promise<void> {
    const now = Date.now();
    const reconcileBefore = new Date(now - RECONCILE_AFTER_MINUTES * 60 * 1000);
    const expireBefore = new Date(now - this.ttlHours * 60 * 60 * 1000);

    const stale = await this.db
      .select()
      .from(schema.orders)
      .where(
        and(
          eq(schema.orders.status, "pending"),
          eq(schema.orders.payment_status, "unpaid"),
          lt(schema.orders.created_at, reconcileBefore),
        ),
      )
      .orderBy(asc(schema.orders.created_at))
      .limit(BATCH_LIMIT);

    if (stale.length === 0) return;

    let settled = 0;
    let expired = 0;

    for (const order of stale) {
      const expiredByAge = order.created_at < expireBefore;

      if (order.payment_reference) {
        try {
          const verified =
            await this.buyerPaymentService.verifyPaystackTransaction(
              order.payment_reference,
            );

          if (verified.status === "success") {
            // Only settle when the amount matches, same rule as the buyer path.
            if (verified.amount !== order.total_amount) {
              this.logger.error(
                `Order ${order.id} paid ${verified.amount} but totals ${order.total_amount}; left for manual review`,
              );
              continue;
            }

            await this.orderService.updatePaymentStatus(order.id, "paid");
            await this.orderService.updateOrderStatus(order.id, "confirmed");
            await this.notificationsService.notifyPaymentConfirmed(
              order.buyer_id,
              order.id,
              order.total_amount,
              "paystack",
            );

            settled += 1;
            this.logger.warn(
              `Order ${order.id} settled by reconciliation (ref ${order.payment_reference}); its webhook never landed`,
            );
            continue;
          }

          /* Still on Paystack's side and inside the TTL: leave it alone. */
          if (!expiredByAge) continue;
        } catch (error) {
          /*
           * A BadRequest is Paystack answering: it read the reference and has
           * no successful charge for it, so the order can expire on schedule.
           * Anything else means we never got an answer - an outage, a timeout,
           * a DNS failure - and guessing there would cancel orders we may have
           * already been paid for. Those wait for a later pass.
           */
          const answered = error instanceof BadRequestException;

          if (!answered || !expiredByAge) {
            this.logger.error(
              `Could not verify order ${order.id} (ref ${order.payment_reference}); leaving it pending`,
              error,
            );
            continue;
          }
        }
      } else if (!expiredByAge) {
        continue;
      }

      const cancelled = await this.orderService.cancelOrderForFailedPayment(
        order.id,
        `Payment not completed within ${this.ttlHours} hours`,
      );

      /* Undefined means the row stopped being unpaid mid-sweep, so it was paid. */
      if (!cancelled) continue;

      expired += 1;
      this.logger.log(
        `Order ${order.id} cancelled after ${this.ttlHours}h unpaid (buyer ${order.buyer_id})`,
      );

      await this.notificationsService.notifyOrderStatus(
        order.buyer_id,
        order.id,
        "cancelled",
        "This order was cancelled because payment was not completed. Your items are still in the shop if you would like to try again.",
      );
    }

    this.logger.log(
      `Reconciliation pass: ${stale.length} checked, ${settled} settled, ${expired} expired`,
    );
  }
}
