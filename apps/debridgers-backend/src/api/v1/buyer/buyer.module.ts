import { Module } from "@nestjs/common";
import { MulterModule } from "@nestjs/platform-express";
import { BuyerController } from "./buyer.controller";
import { BuyerService } from "./buyer.service";
import { WalletController } from "./wallet.controller";
import { WalletService } from "./wallet.service";
import { OrderController } from "./order.controller";
import { OrderService } from "./order.service";
import { PaymentService } from "./payment.service";
import { NotificationsService } from "./notifications.service";
import { NotificationsController } from "./notifications.controller";
import { BuyerRateLimitService } from "./buyer-rate-limit.service";
import { DatabaseModule } from "../../../infrastructure/database/database.module";
import { AuthModule } from "../auth/auth.module";
import { PaymentModule } from "../payment/payment.module";
import { CloudinaryService } from "../../../infrastructure/cloudinary/cloudinary.service";

@Module({
  imports: [DatabaseModule, AuthModule, MulterModule.register(), PaymentModule],
  controllers: [
    BuyerController,
    WalletController,
    OrderController,
    NotificationsController,
  ],
  providers: [
    BuyerService,
    WalletService,
    OrderService,
    PaymentService,
    NotificationsService,
    BuyerRateLimitService,
    CloudinaryService,
  ],
})
export class BuyerModule {}
