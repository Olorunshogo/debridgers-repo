import { Module } from "@nestjs/common";
import { MulterModule } from "@nestjs/platform-express";
import { AgentController } from "./agent.controller";
import { AgentService } from "./agent.service";
import { StockService } from "./stock.service";
import { KycService } from "./kyc.service";
import { BankDetailsService } from "./bank-details.service";
import { DatabaseModule } from "../../../infrastructure/database/database.module";
import { AuthModule } from "../auth/auth.module";
import { PaymentModule } from "../payment/payment.module";
import { WalletModule } from "../wallet/wallet.module";
import { CloudinaryService } from "../../../infrastructure/cloudinary/cloudinary.service";

@Module({
  imports: [
    DatabaseModule,
    AuthModule,
    /* For SafeHavenService: bank list and account name resolution. */
    PaymentModule,
    WalletModule,
    MulterModule.register({ dest: "/tmp/uploads" }),
  ],
  controllers: [AgentController],
  providers: [
    AgentService,
    StockService,
    KycService,
    BankDetailsService,
    CloudinaryService,
  ],
  exports: [BankDetailsService],
})
export class AgentModule {}
