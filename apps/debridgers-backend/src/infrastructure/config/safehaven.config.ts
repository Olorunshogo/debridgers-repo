import { registerAs } from "@nestjs/config";

export const safehavenConfig = registerAs("SafeHavenConfig", () => ({
  baseUrl: process.env.SAFEHAVEN_BASE_URL ?? "https://api.safehavenmfb.com",
  clientId: process.env.SAFEHAVEN_CLIENT_ID ?? "",
  ibsClientId: process.env.SAFEHAVEN_IBS_CLIENT_ID ?? "",
  debitAccountNumber: process.env.SAFEHAVEN_DEBIT_ACCOUNT_NUMBER ?? "",
  bankCode: process.env.SAFEHAVEN_BANK_CODE ?? "",
  webhookSecret: process.env.SAFEHAVEN_WEBHOOK_SECRET ?? "",
  callbackUrl: process.env.SAFEHAVEN_CALLBACK_URL ?? "",
}));
