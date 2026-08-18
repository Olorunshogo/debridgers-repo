import * as crypto from "crypto";
import { readBackendEnv } from "./backend-env";

/*
 * Reads PAYSTACK_SECRET_KEY straight from the backend's own .env rather than
 * process.env, through the same parser global-setup uses to build the spawned
 * server's env. The webhook signature has to be computed with the exact secret
 * the running server holds.
 */
export function readPaystackSecret(): string {
  const secret = readBackendEnv().PAYSTACK_SECRET_KEY;
  if (!secret) {
    throw new Error("PAYSTACK_SECRET_KEY not found in backend .env");
  }
  return secret;
}

/* HMAC-SHA512 over the exact raw body bytes, matching the server's own check. */
export function signPaystackPayload(secret: string, rawBody: string): string {
  return crypto.createHmac("sha512", secret).update(rawBody).digest("hex");
}

export interface PaystackWebhookEvent {
  event: string;
  data: Record<string, unknown>;
}

/*
 * Posts a webhook event with a correctly signed body by default. Passing an
 * explicit `signature` overrides it, so callers can post an unsigned or
 * wrongly signed request through the same helper.
 */
export async function postWebhook(
  base: string,
  secret: string,
  event: PaystackWebhookEvent,
  signature?: string | null,
): Promise<{ status: number; body: unknown }> {
  const rawBody = JSON.stringify(event);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (signature !== null) {
    headers["x-paystack-signature"] =
      signature ?? signPaystackPayload(secret, rawBody);
  }

  const res = await fetch(`${base}/webhook`, {
    method: "POST",
    headers,
    body: rawBody,
  });

  const body = (await res.json()) as unknown;
  return { status: res.status, body };
}
