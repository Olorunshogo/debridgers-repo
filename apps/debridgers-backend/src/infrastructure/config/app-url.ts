import type { ConfigService } from "@nestjs/config";

/*
 * Every Paystack callback the buyer app receives belongs on that app, which
 * email-links.ts already resolves via BUYER_APP_URL with APP_URL as fallback.
 * Kept here so wallet deposit, checkout and order-payment retry cannot drift
 * onto their own env var name the way FRONTEND_URL and APP_URL already had.
 */
export function resolveBuyerAppUrl(config: ConfigService): string {
  return (
    config.get<string>("BUYER_APP_URL") ??
    config.get<string>("APP_URL") ??
    "http://localhost:5174"
  );
}
