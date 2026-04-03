import { registerAs } from "@nestjs/config";

export const accessJwtConfig = registerAs("AccessJwt", () => ({
  secret: process.env.ACCESS_TOKEN_SECRET,
  expiresIn: process.env.ACCESS_TOKEN_EXPIRY || "15m",
}));
