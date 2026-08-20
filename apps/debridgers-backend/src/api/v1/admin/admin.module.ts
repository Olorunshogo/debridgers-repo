import { Module } from "@nestjs/common";
import { AdminController } from "./admin.controller";
import { AdminService } from "./admin.service";
import { AdminApiKeysService } from "./admin-api-keys.service";
import { DatabaseModule } from "../../../infrastructure/database/database.module";
import { AuthModule } from "../auth/auth.module";
import { AgentModule } from "../agent/agent.module";
import { CloudinaryService } from "../../../infrastructure/cloudinary/cloudinary.service";
import { AuditModule } from "../../../infrastructure/audit/audit.module";
import { BuyerAdminController } from "./buyer-admin/buyer-admin.controller";
import { BuyerAdminService } from "./buyer-admin/buyer-admin.service";
import { DeliveryAdminController } from "./buyer-admin/delivery-admin.controller";
import { DeliveryAdminService } from "./buyer-admin/delivery-admin.service";
import { NotificationsService } from "../buyer/notifications.service";

@Module({
  /*
   * AgentModule for BankDetailsService, used by the bank-code backfill route.
   * AuditModule for the F9 trail on privileged mutations.
   */
  imports: [DatabaseModule, AuthModule, AgentModule, AuditModule],
  controllers: [AdminController, BuyerAdminController, DeliveryAdminController],
  providers: [
    AdminService,
    AdminApiKeysService,
    CloudinaryService,
    BuyerAdminService,
    DeliveryAdminService,
    NotificationsService,
  ],
  exports: [AdminApiKeysService, BuyerAdminService, DeliveryAdminService],
})
export class AdminModule {}
