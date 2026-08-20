import { Module } from "@nestjs/common";
import { WalletController } from "./wallet.controller";
import { WalletService } from "./wallet.service";
import { AgentWalletService } from "./agent-wallet.service";
import { AgentLedgerService } from "./agent-ledger.service";
import { DatabaseModule } from "../../../infrastructure/database/database.module";
import { PaymentModule } from "../payment/payment.module";

@Module({
  imports: [DatabaseModule, PaymentModule],
  controllers: [WalletController],
  providers: [WalletService, AgentWalletService, AgentLedgerService],
  exports: [WalletService, AgentWalletService, AgentLedgerService],
})
export class WalletModule {}
