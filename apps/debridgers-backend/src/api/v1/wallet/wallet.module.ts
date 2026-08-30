import { Module, forwardRef } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { WalletController } from "./wallet.controller";
import { WalletService } from "./wallet.service";
import { AgentWalletService } from "./agent-wallet.service";
import { AgentLedgerService } from "./agent-ledger.service";
import { DatabaseModule } from "../../../infrastructure/database/database.module";
import { PaymentModule } from "../payment/payment.module";
import { EmailModule } from "../../../notification/features/email/email.module";
import { NotificationsService } from "../buyer/notifications.service";
import { BuyerRateLimitService } from "../buyer/buyer-rate-limit.service";

@Module({
  imports: [
    DatabaseModule,
    JwtModule.register({}),
    EmailModule,
    forwardRef(() => PaymentModule),
  ],
  controllers: [WalletController],
  providers: [
    WalletService,
    AgentWalletService,
    AgentLedgerService,
    NotificationsService,
    BuyerRateLimitService,
  ],
  exports: [WalletService, AgentWalletService, AgentLedgerService],
})
export class WalletModule {}
