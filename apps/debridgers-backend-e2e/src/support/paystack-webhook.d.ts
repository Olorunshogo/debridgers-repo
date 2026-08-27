export declare function readPaystackSecret(): string;
export declare function signPaystackPayload(
  secret: string,
  rawBody: string,
): string;
export interface PaystackWebhookEvent {
  event: string;
  data: Record<string, unknown>;
}
export declare function postWebhook(
  base: string,
  secret: string,
  event: PaystackWebhookEvent,
  signature?: string | null,
): Promise<{
  status: number;
  body: unknown;
}>;
