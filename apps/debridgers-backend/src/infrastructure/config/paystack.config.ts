import { registerAs } from "@nestjs/config";

export const paystackConfig = registerAs("PaystackConfig", () => ({
  secretKey: process.env.PAYSTACK_SECRET_KEY,
  publicKey: process.env.PAYSTACK_PUBLIC_KEY,
  commissionRate: parseFloat(process.env.AGENT_COMMISSION_RATE || "0.30"),
}));
