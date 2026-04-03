import { registerAs } from "@nestjs/config";

export const jwtConfig = registerAs("JwtConfig", () => ({
  accessSecret: process.env.ACCESS_TOKEN_SECRET,
  accessExpiry: process.env.ACCESS_TOKEN_EXPIRY || "15m",
  refreshSecret: process.env.REFRESH_TOKEN_SECRET,
  refreshExpiry: process.env.REFRESH_TOKEN_EXPIRY || "7d",
}));
