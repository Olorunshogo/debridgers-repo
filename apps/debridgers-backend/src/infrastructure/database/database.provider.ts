import * as path from "path";
import { drizzle, NodePgDatabase } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
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

    const db = drizzle(pool, { schema }) as NodePgDatabase<typeof schema>;

    // Run any pending migrations before the app accepts requests.
    // In production: migrations are copied to dist/ by nest-cli assets config.
    // In development: path resolves to src/ via ts-node.
    const migrationsFolder = path.join(__dirname, "../persistence/migrations");
    try {
      await migrate(db, { migrationsFolder });
      logger.log("Database migrations up to date");
    } catch (err) {
      logger.error("Migration failed — server will not start", err);
      throw err;
    }

    logger.log("Database connection established");
    return db;
  },
};

export default connectionProvider;
