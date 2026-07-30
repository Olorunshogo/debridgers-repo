import { Module } from "@nestjs/common";
import { PaymentController } from "./payment.controller";
import { PaymentService } from "./payment.service";
import { SafeHavenService } from "./safehaven.service";
import { PayoutService } from "./payout.service";
import { DatabaseModule } from "../../infrastructure/database/database.module";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [PaymentController],
  providers: [PaymentService, SafeHavenService, PayoutService],
  exports: [SafeHavenService, PaymentService, PayoutService],
})
export class PaymentModule {}
