import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { PaymentController } from "./payment.controller";
import { PaymentService } from "./payment.service";
import { PayoutService } from "./payout.service";
import { PayoutSchedulerService } from "./payout-scheduler.service";
import { RefundService } from "./refund.service";
import { PaystackDvaService } from "./paystack-dva.service";
import { WithdrawalService } from "./withdrawal.service";
import { DatabaseModule } from "../../../infrastructure/database/database.module";
import { WebhookModule } from "../../../infrastructure/webhook/webhook.module";

@Module({
  imports: [DatabaseModule, WebhookModule, ScheduleModule.forRoot()],
  controllers: [PaymentController],
  providers: [
    PaymentService,
    PayoutService,
    PayoutSchedulerService,
    RefundService,
    PaystackDvaService,
    WithdrawalService,
  ],
  exports: [
    PaymentService,
    PayoutService,
    RefundService,
    PaystackDvaService,
    WithdrawalService,
  ],
})
export class PaymentModule {}
