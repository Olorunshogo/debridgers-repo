import { registerAs } from "@nestjs/config";

export const databaseConfig = registerAs("DBConfig", () => ({
  url: process.env.DATABASE_URL,
}));
