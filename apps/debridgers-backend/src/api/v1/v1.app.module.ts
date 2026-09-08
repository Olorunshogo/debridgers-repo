import { Module } from "@nestjs/common";

// V1 Feature Modules
import { AuthModule } from "./auth/auth.module";
import { AdminModule } from "./admin/admin.module";
import { AgentModule } from "./agent/agent.module";
import { BuyerModule } from "./buyer/buyer.module";
import { PaymentModule } from "./payment/payment.module";
import { ContactModule } from "./contact/contact.module";
import { NewsletterModule } from "./newsletter/newsletter.module";
import { CommissionModule } from "./commission/commission.module";
import { SystemSettingsModule } from "./settings/system-settings.module";
import { PublicModule } from "./public/public.module";
import { CatalogModule } from "./catalog/catalog.module";
import { RatingsModule } from "./ratings/ratings.module";

@Module({
  imports: [
    AuthModule,
    AdminModule,
    AgentModule,
    BuyerModule,
    PaymentModule,
    ContactModule,
    NewsletterModule,
    CommissionModule,
    SystemSettingsModule,
    PublicModule,
    CatalogModule,
    RatingsModule,
  ],
})
export class V1AppModule {}
