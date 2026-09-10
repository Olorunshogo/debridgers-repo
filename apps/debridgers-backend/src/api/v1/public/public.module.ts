import { Module } from "@nestjs/common";
import { PublicController } from "./public.controller";
import { DatabaseModule } from "../../../infrastructure/database/database.module";
import { RatingsModule } from "../ratings/ratings.module";

@Module({
  imports: [DatabaseModule, RatingsModule],
  controllers: [PublicController],
})
export class PublicModule {}
