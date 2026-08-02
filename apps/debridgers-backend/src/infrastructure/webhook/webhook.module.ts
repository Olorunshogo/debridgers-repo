import { Module } from "@nestjs/common";
import { WebhookDeduplicationService } from "./webhook-deduplication.service";
import { RedisModule } from "../redis/core/redis.module";

/**
 * Webhook infrastructure module providing:
 * - Replay attack protection via Redis deduplication
 * - Reusable webhook utilities for any payment provider
 */
@Module({
  imports: [RedisModule],
  providers: [WebhookDeduplicationService],
  exports: [WebhookDeduplicationService],
})
export class WebhookModule {}
