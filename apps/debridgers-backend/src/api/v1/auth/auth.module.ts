import { Module, forwardRef } from "@nestjs/common";
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
import { EmailModule } from "../../../notification/features/email/email.module";
import { accessJwtConfig } from "./config/access-jwt";
import { refreshJwtConfig } from "./config/refresh-jwt";
import { AdminRegisterController } from "./admin-register/admin-register.controller";
import { AdminRegisterService } from "./admin-register/admin-register.service";
import { AdminInviteService } from "../admin/admin-invite/admin-invite.service";

@Module({
  imports: [
    DatabaseModule,
    JwtModule.register({}),
    RedisModule,
    AnalyticsModule,
    forwardRef(() => PaymentModule),
    EmailModule, // ← Import EmailModule instead
  ],
  controllers: [AuthController, AdminRegisterController],
  providers: [
    AuthService,
    AuthAttemptService,
    AuthGuard,
    RolesGuard,
    RefreshGuard,
    AdminRegisterService,
    AdminInviteService,
    // Remove EmailService from here
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
