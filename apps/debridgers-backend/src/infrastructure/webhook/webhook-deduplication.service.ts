import { Injectable, Logger } from "@nestjs/common";
import { RedisService } from "../redis/features/redis.service";

/**
 * SECURITY: Prevents webhook replay attacks via Redis-based deduplication
 *
 * Webhooks are idempotent by storing a deduplication key in Redis.
 * If the same webhook ID is received multiple times, it's skipped
 * on subsequent attempts, preventing duplicate processing.
 */
@Injectable()
export class WebhookDeduplicationService {
  private readonly logger = new Logger(WebhookDeduplicationService.name);

  // 24 hours: sufficient for webhook retries from payment providers
  private readonly WEBHOOK_TTL_MS = 24 * 60 * 60 * 1000;

  constructor(private readonly redis: RedisService) {}

  /**
   * Check if webhook was already processed and mark it as processed.
   * Returns true if this is a new webhook, false if it's a duplicate.
   *
   * @param provider - Webhook provider name (e.g., "paystack", "stripe")
   * @param webhookId - Unique webhook identifier from provider
   * @returns true if new, false if duplicate
   */
  async isNewWebhook(provider: string, webhookId: string): Promise<boolean> {
    if (!webhookId) {
      this.logger.warn(
        `${provider}: webhook ID missing, cannot check for duplicates`,
      );
      return true; // Process anyway if ID is missing
    }

    const dedupeKey = `webhook:${provider}:${webhookId}`;
    const isProcessed = await this.redis.has(dedupeKey);

    if (isProcessed) {
      this.logger.warn(
        `${provider}: duplicate webhook detected (${webhookId}), skipping`,
      );
      return false;
    }

    // Mark as processed before returning
    await this.redis.set(dedupeKey, true, this.WEBHOOK_TTL_MS);
    return true;
  }

  /**
   * Extract reference from common webhook payload structures.
   * Tries multiple common field names to find the unique identifier.
   */
  extractWebhookId(payload: Record<string, unknown>): string | undefined {
    return (
      (payload.id as string) ||
      ((payload.data as Record<string, unknown>)?.reference as string) ||
      ((payload.data as Record<string, unknown>)?.id as string) ||
      (payload.reference as string)
    );
  }

  /**
   * Revoke a webhook from the deduplication cache.
   * Useful if webhook processing fails and should be retried immediately.
   */
  async revokeWebhook(provider: string, webhookId: string): Promise<void> {
    const dedupeKey = `webhook:${provider}:${webhookId}`;
    await this.redis.del(dedupeKey);
    this.logger.debug(
      `${provider}: webhook deduplication revoked (${webhookId})`,
    );
  }
}
