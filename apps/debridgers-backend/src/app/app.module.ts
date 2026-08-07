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
import { DatabaseModule } from "../infrastructure/database/database.module";
import { RedisModule } from "../infrastructure/redis/core/redis.module";
import { LoggerModule } from "../infrastructure/logger/logger.module";
import { AnalyticsModule } from "../infrastructure/analytics/analytics.module";

// Notification
import { EmailModule } from "../notification/features/email/email.module";

// Events
import { UserListeners } from "../events/listeners/user-listeners";

// API Versions
import { V1AppModule } from "../api/v1/v1.app.module";
import { V2AppModule } from "../api/v2/v2.app.module";

// JWT Config (shared across versions)
import { accessJwtConfig } from "../api/v1/auth/config/access-jwt";
import { refreshJwtConfig } from "../api/v1/auth/config/refresh-jwt";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [
        databaseConfig,
        jwtConfig,
        cloudinaryConfig,
        paystackConfig,
        mailtrapConfig,
        accessJwtConfig,
        refreshJwtConfig,
      ],
      envFilePath: [".env"],
    }),
    ThrottlerModule.forRoot([
      { name: "short", ttl: 60000, limit: 1000 }, // Disabled: using per-endpoint limiters
    ]),
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
    DatabaseModule,
    RedisModule,
    LoggerModule,
    AnalyticsModule,
    EmailModule,
    V1AppModule,
    V2AppModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    UserListeners,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
