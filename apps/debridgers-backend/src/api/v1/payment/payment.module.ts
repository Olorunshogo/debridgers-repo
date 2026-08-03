import { Module } from "@nestjs/common";
import { PaymentController } from "./payment.controller";
import { PaymentService } from "./payment.service";
import { PayoutService } from "./payout.service";
import { DatabaseModule } from "../../../infrastructure/database/database.module";
import { AuthModule } from "../auth/auth.module";
import { WebhookModule } from "../../../infrastructure/webhook/webhook.module";

@Module({
  imports: [DatabaseModule, AuthModule, WebhookModule],
  controllers: [PaymentController],
  providers: [PaymentService, PayoutService],
  exports: [PaymentService, PayoutService],
})
export class PaymentModule {}
