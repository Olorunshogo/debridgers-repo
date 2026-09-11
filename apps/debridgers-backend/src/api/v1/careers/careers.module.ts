import { Module } from "@nestjs/common";
import { MulterModule } from "@nestjs/platform-express";
import { CareersController } from "./careers.controller";
import { CareersService } from "./careers.service";
import { CareersPeopleService } from "./careers-people.service";
import { CareersOpsService } from "./careers-ops.service";
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
  controllers: [CareersController],
  providers: [
    CareersService,
    CareersPeopleService,
    CareersOpsService,
    CloudinaryService,
  ],
  exports: [CareersService, CareersPeopleService, CareersOpsService],
})
export class CareersModule {}
