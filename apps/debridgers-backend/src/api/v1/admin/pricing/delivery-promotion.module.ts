import { Global, Module } from "@nestjs/common";
import { DeliveryPromotionService } from "./delivery-promotion.service";
import { DatabaseModule } from "../../../../infrastructure/database/database.module";

/*
 * Global for the same reason SystemSettingsModule is: promotions are resolved
 * on the buyer pricing path, administered from the admin module and announced
 * by the public controller, and threading an import through each one buys
 * nothing.
 */
@Global()
@Module({
  imports: [DatabaseModule],
  providers: [DeliveryPromotionService],
  exports: [DeliveryPromotionService],
})
export class DeliveryPromotionModule {}
