import { Module, forwardRef } from "@nestjs/common";
import { AdminController } from "./admin.controller";
import { AdminService } from "./admin.service";
import { AdminApiKeysService } from "./admin-api-keys.service";
import { DatabaseModule } from "../../../infrastructure/database/database.module";
import { AuthModule } from "../auth/auth.module";
import { AgentModule } from "../agent/agent.module";
import { CloudinaryService } from "../../../infrastructure/cloudinary/cloudinary.service";
import { AuditModule } from "../../../infrastructure/audit/audit.module";
import { DeliveryAdminController } from "./buyer-admin/delivery-admin.controller";
import { DeliveryAdminService } from "./buyer-admin/delivery-admin.service";
import { NotificationsService } from "../buyer/notifications.service";
import { NotificationsAdminController } from "./notifications-admin.controller";
import { AdminInviteController } from "./admin-invite/admin-invite.controller";
import { AdminInviteService } from "./admin-invite/admin-invite.service";
import { EmailModule } from "../../../notification/features/email/email.module";
import { AgentWalletService } from "../wallet/agent-wallet.service";
import { PricingAdminController } from "./pricing/pricing-admin.controller";
import { ZoneAdminService } from "./pricing/zone-admin.service";
import { DeliveryPromotionModule } from "./pricing/delivery-promotion.module";

@Module({
  imports: [
    DatabaseModule,
    forwardRef(() => AuthModule),
    AgentModule,
    AuditModule,
    EmailModule,
    DeliveryPromotionModule,
  ],
  controllers: [
    AdminController,
    DeliveryAdminController,
    NotificationsAdminController,
    AdminInviteController,
    PricingAdminController,
  ],
  providers: [
    AdminService,
    AdminApiKeysService,
    CloudinaryService,
    DeliveryAdminService,
    NotificationsService,
    AdminInviteService,
    AgentWalletService,
    ZoneAdminService,
    // Remove EmailService - it comes from EmailModule
  ],
  exports: [AdminApiKeysService, DeliveryAdminService, AdminInviteService],
})
export class AdminModule {}
