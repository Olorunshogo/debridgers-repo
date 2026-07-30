import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { ScheduleModule } from "@nestjs/schedule";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import { APP_GUARD } from "@nestjs/core";

import { AppController } from "./app.controller";
import { AppService } from "./app.service";

// Infrastructure
import { databaseConfig } from "../infrastructure/config/database.config";
import { jwtConfig } from "../infrastructure/config/jwt.config";
import { cloudinaryConfig } from "../infrastructure/config/cloudinary.config";
import { paystackConfig } from "../infrastructure/config/paystack.config";
import { mailtrapConfig } from "../infrastructure/config/mailtrap.config";
import { safehavenConfig } from "../infrastructure/config/safehaven.config";
import { DatabaseModule } from "../infrastructure/database/database.module";
import { RedisModule } from "../infrastructure/redis/core/redis.module";
import { LoggerModule } from "../infrastructure/logger/logger.module";

// Notification
import { EmailModule } from "../notification/features/email/email.module";

// Events
import { UserListeners } from "../events/listeners/user-listeners";

// Features
import { AuthModule } from "./auth/auth.module";
import { accessJwtConfig } from "./auth/config/access-jwt";
import { refreshJwtConfig } from "./auth/config/refresh-jwt";
import { ContactModule } from "./contact/contact.module";
import { AgentModule } from "./agent/agent.module";
import { BuyerModule } from "./buyer/buyer.module";
import { AdminModule } from "./admin/admin.module";
import { PaymentModule } from "./payment/payment.module";
import { CommissionModule } from "./commission/commission.module";
import { PublicModule } from "./public/public.module";
import { SystemSettingsModule } from "./settings/system-settings.module";
import { CatalogModule } from "./catalog/catalog.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [
        databaseConfig,
        jwtConfig,
        cloudinaryConfig,
        paystackConfig,
        safehavenConfig,
        mailtrapConfig,
        accessJwtConfig,
        refreshJwtConfig,
      ],
      envFilePath: [".env"],
    }),
    ThrottlerModule.forRoot([
      { name: "short", ttl: 1000, limit: 10 }, // 10 req/s per IP
      { name: "medium", ttl: 60000, limit: 100 }, // 100 req/min per IP
    ]),
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
    DatabaseModule,
    RedisModule,
    LoggerModule,
    SystemSettingsModule,
    CatalogModule,
    EmailModule,
    AuthModule,
    ContactModule,
    AgentModule,
    BuyerModule,
    AdminModule,
    PaymentModule,
    CommissionModule,
    PublicModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    UserListeners,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
