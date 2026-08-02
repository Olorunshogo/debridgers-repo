import { Module } from "@nestjs/common";
import { MulterModule } from "@nestjs/platform-express";
import { BuyerController } from "./buyer.controller";
import { BuyerService } from "./buyer.service";
import { DatabaseModule } from "../../../infrastructure/database/database.module";
import { AuthModule } from "../auth/auth.module";
import { PaymentModule } from "../payment/payment.module";
import { CloudinaryService } from "../../../infrastructure/cloudinary/cloudinary.service";

@Module({
  imports: [DatabaseModule, AuthModule, MulterModule.register(), PaymentModule],
  controllers: [BuyerController],
  providers: [BuyerService, CloudinaryService],
})
export class BuyerModule {}
