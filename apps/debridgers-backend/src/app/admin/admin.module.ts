import { Module } from "@nestjs/common";
import { AdminController } from "./admin.controller";
import { AdminService } from "./admin.service";
import { DatabaseModule } from "../../infrastructure/database/database.module";
import { AuthModule } from "../auth/auth.module";
import { AgentModule } from "../agent/agent.module";
import { CloudinaryService } from "../../infrastructure/cloudinary/cloudinary.service";

@Module({
  /* AgentModule for BankDetailsService, used by the bank-code backfill route. */
  imports: [DatabaseModule, AuthModule, AgentModule],
  controllers: [AdminController],
  providers: [AdminService, CloudinaryService],
})
export class AdminModule {}
