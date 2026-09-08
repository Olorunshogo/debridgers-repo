import { Module } from "@nestjs/common";
import { WebhookDeduplicationService } from "./webhook-deduplication.service";
import { RedisModule } from "../redis/core/redis.module";

@Module({
  imports: [RedisModule],
  providers: [WebhookDeduplicationService],
  exports: [WebhookDeduplicationService],
})
export class WebhookModule {}
