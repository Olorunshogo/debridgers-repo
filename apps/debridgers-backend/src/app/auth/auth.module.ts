import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { AuthGuard } from "./guards/auth.guard";
import { RolesGuard } from "./guards/roles.guard";
import { RefreshGuard } from "./guards/refresh.guard";
import { DatabaseModule } from "../../infrastructure/database/database.module";
import { accessJwtConfig } from "./config/access-jwt";
import { refreshJwtConfig } from "./config/refresh-jwt";

@Module({
  imports: [DatabaseModule, JwtModule.register({})],
  controllers: [AuthController],
  providers: [AuthService, AuthGuard, RolesGuard, RefreshGuard],
  exports: [AuthGuard, RolesGuard, RefreshGuard, JwtModule],
})
export class AuthModule {}

export { accessJwtConfig, refreshJwtConfig };
