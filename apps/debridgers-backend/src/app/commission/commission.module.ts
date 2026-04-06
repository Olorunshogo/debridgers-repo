import { Module } from "@nestjs/common";
import { CommissionService } from "./commission.service";
import { DatabaseModule } from "../../infrastructure/database/database.module";
import { WalletService } from "../agent/wallet.service";

@Module({
  imports: [DatabaseModule],
  providers: [CommissionService, WalletService],
})
export class CommissionModule {}
