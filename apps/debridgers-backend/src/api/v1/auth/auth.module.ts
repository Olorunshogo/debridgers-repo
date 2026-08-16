import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { AuthAttemptService } from "./auth-attempt.service";
import { AuthGuard } from "../../shared/guards/auth.guard";
import { RolesGuard } from "../../shared/guards/roles.guard";
import { RefreshGuard } from "../../shared/guards/refresh.guard";
import { DatabaseModule } from "../../../infrastructure/database/database.module";
import { RedisModule } from "../../../infrastructure/redis/core/redis.module";
import { AnalyticsModule } from "../../../infrastructure/analytics/analytics.module";
import { PaymentModule } from "../payment/payment.module";
import { accessJwtConfig } from "./config/access-jwt";
import { refreshJwtConfig } from "./config/refresh-jwt";

@Module({
  imports: [
    DatabaseModule,
    JwtModule.register({}),
    RedisModule,
    AnalyticsModule,
    PaymentModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthAttemptService,
    AuthGuard,
    RolesGuard,
    RefreshGuard,
  ],
  exports: [
    AuthGuard,
    RolesGuard,
    RefreshGuard,
    JwtModule,
    AuthAttemptService,
    AuthService,
  ],
})
export class AuthModule {}

export { accessJwtConfig, refreshJwtConfig };
