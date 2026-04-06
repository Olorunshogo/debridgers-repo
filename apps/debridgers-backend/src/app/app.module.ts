import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { ScheduleModule } from "@nestjs/schedule";

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
import { AdminModule } from "./admin/admin.module";
import { PaymentModule } from "./payment/payment.module";
import { CommissionModule } from "./commission/commission.module";

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
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
    DatabaseModule,
    RedisModule,
    LoggerModule,
    EmailModule,
    AuthModule,
    ContactModule,
    AgentModule,
    AdminModule,
    PaymentModule,
    CommissionModule,
  ],
  controllers: [AppController],
  providers: [AppService, UserListeners],
})
export class AppModule {}
