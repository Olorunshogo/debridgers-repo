import { registerAs } from "@nestjs/config";

export const refreshJwtConfig = registerAs("RefreshJwt", () => ({
  secret: process.env.REFRESH_TOKEN_SECRET,
  expiresIn: process.env.REFRESH_TOKEN_EXPIRY || "7d",
}));
