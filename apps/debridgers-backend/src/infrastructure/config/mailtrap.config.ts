import { registerAs } from "@nestjs/config";

export const mailtrapConfig = registerAs("MailtrapConfig", () => ({
  token: process.env.MAILTRAP_TOKEN,
  fromEmail: process.env.MAILTRAP_FROM_EMAIL || "noreply@debridgers.com",
  fromName: process.env.MAILTRAP_FROM_NAME || "Debridgers",
}));
