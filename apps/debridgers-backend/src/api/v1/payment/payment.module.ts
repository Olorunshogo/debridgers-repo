import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { ScheduleModule } from "@nestjs/schedule";
import { PaymentController } from "./payment.controller";
import { PaymentService } from "./payment.service";
import { PayoutService } from "./payout.service";
import { PayoutSchedulerService } from "./payout-scheduler.service";
import { RefundService } from "./refund.service";
import { PaystackDvaService } from "./paystack-dva.service";
import { WithdrawalService } from "./withdrawal.service";
import { PaystackBankService } from "./paystack-bank.service";
import { LedgerService } from "./ledger.service";
import { BuyerPaymentService } from "./buyer-payment.service";
import { PaystackWebhookController } from "./paystack-webhook.controller";
import { OrderReconciliationService } from "./order-reconciliation.service";
/*
 * Provided here rather than imported from BuyerModule: BuyerModule already
 * imports this module, so pulling it back the other way would close a cycle.
 * The service holds no state beyond the db handle, so a second instance is fine.
 */
import { NotificationsService } from "../buyer/notifications.service";
import { AuthGuard } from "../../shared/guards/auth.guard";
import { RolesGuard } from "../../shared/guards/roles.guard";
import { DatabaseModule } from "../../../infrastructure/database/database.module";
import { WebhookModule } from "../../../infrastructure/webhook/webhook.module";

@Module({
  /*
   * JwtModule and the guards are registered locally rather than imported from
   * AuthModule: AuthModule already imports this module for PaystackDvaService,
   * so importing it back would close a cycle. AuthGuard resolves the signing
   * secret through ConfigService, so a bare register({}) is all it needs.
   */
  imports: [
    DatabaseModule,
    WebhookModule,
    JwtModule.register({}),
    ScheduleModule.forRoot(),
  ],
  controllers: [PaymentController, PaystackWebhookController],
  providers: [
    LedgerService,
    PaymentService,
    BuyerPaymentService,
    PayoutService,
    PayoutSchedulerService,
    RefundService,
    PaystackDvaService,
    WithdrawalService,
    PaystackBankService,
    OrderReconciliationService,
    NotificationsService,
    AuthGuard,
    RolesGuard,
  ],
  exports: [
    LedgerService,
    PaymentService,
    BuyerPaymentService,
    PayoutService,
    RefundService,
    PaystackDvaService,
    WithdrawalService,
    PaystackBankService,
    OrderReconciliationService,
  ],
})
export class PaymentModule {}
