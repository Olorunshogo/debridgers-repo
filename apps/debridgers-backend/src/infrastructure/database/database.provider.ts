import { drizzle, NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { ConfigService } from "@nestjs/config";
import * as schema from "../persistence/index";
import { Logger } from "@nestjs/common";

export const DATABASE_CONNECTION = Symbol("DATABASE_CONNECTION");

const connectionProvider = {
  provide: DATABASE_CONNECTION,
  inject: [ConfigService],
  useFactory: async (configService: ConfigService) => {
    const logger = new Logger("DatabaseModule");
    const url = configService.get<string>("DBConfig.url");

    // SSL is required for hosted providers (Neon, Supabase, etc.) but not for local Docker
    const isLocal = url?.includes("localhost") || url?.includes("127.0.0.1");

    const pool = new Pool({
      connectionString: url,
      ssl: isLocal ? false : { rejectUnauthorized: false },
      allowExitOnIdle: true,
      connectionTimeoutMillis: 72000,
    });

    logger.log("Database connection established");
    return drizzle(pool, { schema }) as NodePgDatabase<typeof schema>;
  },
};

export default connectionProvider;
