import { Global, Module } from "@nestjs/common";
import { SystemSettingsService } from "./system-settings.service";
import { DatabaseModule } from "../../../infrastructure/database/database.module";

/*
 * Global because settings are read from unrelated feature modules (payment,
 * buyer, admin, public) and threading an import through each one buys nothing.
 */
@Global()
@Module({
  imports: [DatabaseModule],
  providers: [SystemSettingsService],
  exports: [SystemSettingsService],
})
export class SystemSettingsModule {}
