import { Module } from "@nestjs/common";

// V1 Feature Modules
import { AuthModule } from "./auth/auth.module";
import { AdminModule } from "./admin/admin.module";
import { AgentModule } from "./agent/agent.module";
import { BuyerModule } from "./buyer/buyer.module";
import { PaymentModule } from "./payment/payment.module";
import { ContactModule } from "./contact/contact.module";
import { CommissionModule } from "./commission/commission.module";
import { SystemSettingsModule } from "./settings/system-settings.module";
import { PublicModule } from "./public/public.module";
import { CatalogModule } from "./catalog/catalog.module";

/**
 * V1 API Module
 * Bundles all v1 feature modules for the API
 * Routes are prefixed with /api/v1
 */
@Module({
  imports: [
    AuthModule,
    AdminModule,
    AgentModule,
    BuyerModule,
    PaymentModule,
    ContactModule,
    CommissionModule,
    SystemSettingsModule,
    PublicModule,
    CatalogModule,
  ],
})
export class V1AppModule {}
