import { Module, forwardRef } from "@nestjs/common";
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
import { PaystackSubaccountService } from "./paystack-subaccount.service";
import { PaystackInvoiceService } from "./paystack-invoice.service";
import { LedgerService } from "./ledger.service";
import { BuyerPaymentService } from "./buyer-payment.service";
import { AdminAccountService } from "./admin-account.service";
import { PaystackWebhookController } from "./paystack-webhook.controller";
import { OrderReconciliationService } from "./order-reconciliation.service";
import { NotificationsService } from "../buyer/notifications.service";
import { OrderService } from "../buyer/order.service";
import { EmailModule } from "../../../notification/features/email/email.module";
import { AuthGuard } from "../../shared/guards/auth.guard";
import { RolesGuard } from "../../shared/guards/roles.guard";
import { DatabaseModule } from "../../../infrastructure/database/database.module";
import { WebhookModule } from "../../../infrastructure/webhook/webhook.module";
import { WalletModule } from "../wallet/wallet.module";

@Module({
  imports: [
    DatabaseModule,
    WebhookModule,
    JwtModule.register({}),
    ScheduleModule.forRoot(),
    EmailModule, // ← Add this
    forwardRef(() => WalletModule),
  ],
  controllers: [PaymentController, PaystackWebhookController],
  providers: [
    LedgerService,
    PaymentService,
    BuyerPaymentService,
    PaystackSubaccountService,
    PaystackInvoiceService,
    PayoutService,
    PayoutSchedulerService,
    RefundService,
    PaystackDvaService,
    WithdrawalService,
    PaystackBankService,
    OrderReconciliationService,
    NotificationsService,
    OrderService,
    AdminAccountService,
    AuthGuard,
    RolesGuard,
  ],
  exports: [
    LedgerService,
    PaymentService,
    BuyerPaymentService,
    PaystackSubaccountService,
    PaystackInvoiceService,
    PayoutService,
    RefundService,
    PaystackDvaService,
    WithdrawalService,
    PaystackBankService,
    OrderReconciliationService,
  ],
})
export class PaymentModule {}
