import { Module, forwardRef } from "@nestjs/common";
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
import { AdminInviteController } from "./admin-invite/admin-invite.controller";
import { AdminInviteService } from "./admin-invite/admin-invite.service";
import { EmailModule } from "../../../notification/features/email/email.module";
import { AgentWalletService } from "../wallet/agent-wallet.service";

@Module({
  imports: [
    DatabaseModule,
    forwardRef(() => AuthModule),
    AgentModule,
    AuditModule,
    EmailModule,
  ],
  controllers: [
    AdminController,
    BuyerAdminController,
    DeliveryAdminController,
    AdminInviteController,
  ],
  providers: [
    AdminService,
    AdminApiKeysService,
    CloudinaryService,
    BuyerAdminService,
    DeliveryAdminService,
    NotificationsService,
    AdminInviteService,
    AgentWalletService,
    // Remove EmailService - it comes from EmailModule
  ],
  exports: [
    AdminApiKeysService,
    BuyerAdminService,
    DeliveryAdminService,
    AdminInviteService,
  ],
})
export class AdminModule {}
