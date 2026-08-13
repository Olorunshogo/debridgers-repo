import { Module } from "@nestjs/common";
import { AdminController } from "./admin.controller";
import { AdminService } from "./admin.service";
import { AdminApiKeysService } from "./admin-api-keys.service";
import { DatabaseModule } from "../../../infrastructure/database/database.module";
import { AuthModule } from "../auth/auth.module";
import { AgentModule } from "../agent/agent.module";
import { CloudinaryService } from "../../../infrastructure/cloudinary/cloudinary.service";
import { AuditModule } from "../../../infrastructure/audit/audit.module";

@Module({
  /*
   * AgentModule for BankDetailsService, used by the bank-code backfill route.
   * AuditModule for the F9 trail on privileged mutations.
   */
  imports: [DatabaseModule, AuthModule, AgentModule, AuditModule],
  controllers: [AdminController],
  providers: [AdminService, AdminApiKeysService, CloudinaryService],
  exports: [AdminApiKeysService], // Export for ApiKeyGuard
})
export class AdminModule {}
