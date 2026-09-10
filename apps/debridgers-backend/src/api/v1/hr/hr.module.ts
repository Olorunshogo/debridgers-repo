import { Module } from "@nestjs/common";
import { MulterModule } from "@nestjs/platform-express";
import { HrController } from "./hr.controller";
import { HrService } from "./hr.service";
import { HrPeopleService } from "./hr-people.service";
import { HrOpsService } from "./hr-ops.service";
import { DatabaseModule } from "../../../infrastructure/database/database.module";
import { AuthModule } from "../auth/auth.module";
import { EmailModule } from "../../../notification/features/email/email.module";
import { CloudinaryService } from "../../../infrastructure/cloudinary/cloudinary.service";

@Module({
  imports: [
    DatabaseModule,
    AuthModule,
    EmailModule,
    MulterModule.register({ dest: "/tmp/uploads" }),
  ],
  controllers: [HrController],
  providers: [HrService, HrPeopleService, HrOpsService, CloudinaryService],
  exports: [HrService, HrPeopleService, HrOpsService],
})
export class HrModule {}
