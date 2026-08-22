import { Module } from "@nestjs/common";
import { MulterModule } from "@nestjs/platform-express";
import { AgentController } from "./agent.controller";
import { AgentService } from "./agent.service";
import { WalletService } from "./wallet.service";
import { StockService } from "./stock.service";
import { KycService } from "./kyc.service";
import { BankDetailsService } from "./bank-details.service";
import { DatabaseModule } from "../../../infrastructure/database/database.module";
import { AuthModule } from "../auth/auth.module";
import { PaymentModule } from "../payment/payment.module";
import { CloudinaryService } from "../../../infrastructure/cloudinary/cloudinary.service";

@Module({
  imports: [
    DatabaseModule,
    AuthModule,
    /* For SafeHavenService: bank list and account name resolution. */
    PaymentModule,
    /*
     * No `dest`/`storage` option: Multer defaults to memory storage, so
     * uploaded files arrive with `.buffer` populated for CloudinaryService to
     * stream - matching buyer.module.ts. A `dest` here previously forced disk
     * storage, which left `.buffer` undefined and saved files to local paths
     * with no route serving them (unreachable, and gone on container restart).
     */
    MulterModule.register(),
  ],
  controllers: [AgentController],
  providers: [
    AgentService,
    WalletService,
    StockService,
    KycService,
    BankDetailsService,
    CloudinaryService,
  ],
  exports: [WalletService, BankDetailsService],
})
export class AgentModule {}
