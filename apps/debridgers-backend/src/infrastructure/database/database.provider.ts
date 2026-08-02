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

    // SECURITY FIX: Always verify SSL certificates in production
    // Only disable SSL for localhost development
    const isLocal = url?.includes("localhost") || url?.includes("127.0.0.1");

    const pool = new Pool({
      connectionString: url,
      ssl: isLocal
        ? false // Local development: no SSL required
        : {
            rejectUnauthorized: true, // CRITICAL: Always true (was false - VULNERABLE!)
            ca: configService.get<string>("DB_SSL_CA"),
            cert: configService.get<string>("DB_SSL_CERT"),
            key: configService.get<string>("DB_SSL_KEY"),
          },
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
