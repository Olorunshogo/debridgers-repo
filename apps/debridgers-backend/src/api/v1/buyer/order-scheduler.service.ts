import { Injectable, Logger } from "@nestjs/common";
import { Inject } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { NodePgDatabase } from "drizzle-orm/node-postgres";
import { and, eq, isNull, lte } from "drizzle-orm";
import * as schema from "../../../infrastructure/persistence/index";
import { DATABASE_CONNECTION } from "../../../infrastructure/database/database.provider";

@Injectable()
export class OrderSchedulerService {
  private readonly logger = new Logger(OrderSchedulerService.name);

  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  @Cron("0 */30 * * * *", {
    name: "cancel-expired-unpaid-orders",
    timeZone: "UTC",
  })
  async cancelExpiredUnpaidOrders() {
    try {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const expiredOrders = await this.db
        .select({ id: schema.orders.id })
        .from(schema.orders)
        .where(
          and(
            eq(schema.orders.payment_status, "unpaid"),
            eq(schema.orders.status, "pending"),
            lte(schema.orders.created_at, twentyFourHoursAgo),
            isNull(schema.orders.deleted_at),
          ),
        );

      if (expiredOrders.length > 0) {
        await this.db
          .update(schema.orders)
          .set({
            status: "cancelled",
            cancellation_reason:
              "Automatic cancellation: unpaid after 24 hours",
            updated_at: new Date(),
          })
          .where(
            and(
              eq(schema.orders.payment_status, "unpaid"),
              eq(schema.orders.status, "pending"),
              lte(schema.orders.created_at, twentyFourHoursAgo),
            ),
          );

        this.logger.log(
          `Cancelled ${expiredOrders.length} unpaid orders older than 24 hours`,
        );
      }
    } catch (error) {
      this.logger.error(
        "Error in cancelExpiredUnpaidOrders scheduler",
        error instanceof Error ? error.message : String(error),
      );
    }
  }
}
