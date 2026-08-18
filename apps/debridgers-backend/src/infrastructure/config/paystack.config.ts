import { registerAs } from "@nestjs/config";

export const paystackConfig = registerAs("PaystackConfig", () => ({
  secretKey: process.env.PAYSTACK_SECRET_KEY,
  publicKey: process.env.PAYSTACK_PUBLIC_KEY,
  /* Percent, 0-100, matching the stored setting and the admin UI. */
  agentCommissionPercent: parseFloat(process.env.AGENT_COMMISSION_RATE || "5"),
}));
