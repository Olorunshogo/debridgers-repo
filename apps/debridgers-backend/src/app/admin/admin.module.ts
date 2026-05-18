import { Module } from "@nestjs/common";
import { AdminController } from "./admin.controller";
import { AdminService } from "./admin.service";
import { DatabaseModule } from "../../infrastructure/database/database.module";
import { AuthModule } from "../auth/auth.module";
import { CloudinaryService } from "../../infrastructure/cloudinary/cloudinary.service";

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [AdminController],
  providers: [AdminService, CloudinaryService],
})
export class AdminModule {}
