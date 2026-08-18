import { Module } from "@nestjs/common";
import { CommissionService } from "./commission.service";
import { DatabaseModule } from "../../../infrastructure/database/database.module";
import { WalletService } from "../agent/wallet.service";
import { SystemSettingsModule } from "../settings/system-settings.module";

@Module({
  imports: [DatabaseModule, SystemSettingsModule],
  providers: [CommissionService, WalletService],
})
export class CommissionModule {}
