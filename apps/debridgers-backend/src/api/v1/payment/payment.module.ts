import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { PaymentController } from "./payment.controller";
import { PaymentService } from "./payment.service";
import { PayoutService } from "./payout.service";
import { PayoutSchedulerService } from "./payout-scheduler.service";
import { RefundService } from "./refund.service";
import { DatabaseModule } from "../../../infrastructure/database/database.module";
import { AuthModule } from "../auth/auth.module";
import { WebhookModule } from "../../../infrastructure/webhook/webhook.module";

@Module({
  imports: [
    DatabaseModule,
    AuthModule,
    WebhookModule,
    ScheduleModule.forRoot(),
  ],
  controllers: [PaymentController],
  providers: [
    PaymentService,
    PayoutService,
    PayoutSchedulerService,
    RefundService,
  ],
  exports: [PaymentService, PayoutService, RefundService],
})
export class PaymentModule {}
