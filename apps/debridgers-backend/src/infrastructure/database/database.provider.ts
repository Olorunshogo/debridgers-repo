import * as path from "path";
import { drizzle, NodePgDatabase } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import { ConfigService } from "@nestjs/config";
import * as schema from "../persistence/index";
import { Logger } from "@nestjs/common";

export const DATABASE_CONNECTION = Symbol("DATABASE_CONNECTION");

/*
 * A containerised Postgres is reached by service name rather than localhost, so
 * the hostname alone cannot tell a throwaway database from a hosted one, and
 * assuming remote means assuming SSL that a local container will not offer.
 * DATABASE_SSL lets the caller say outright; without it the old hostname
 * heuristic still applies, so existing deployments are unaffected.
 *
 * Kept deliberately identical to shouldUseSsl in dev-seeder.ts: when the two
 * disagree, migrations succeed and every runtime query fails.
 */
function shouldUseSsl(
  url: string | undefined,
  configService: ConfigService,
): boolean {
  const override = configService.get<string>("DATABASE_SSL");

  if (override === "false") return false;
  if (override === "true") return true;

  return !(url?.includes("localhost") || url?.includes("127.0.0.1"));
}

const connectionProvider = {
  provide: DATABASE_CONNECTION,
  inject: [ConfigService],
  useFactory: async (configService: ConfigService) => {
    const logger = new Logger("DatabaseModule");
    const url = configService.get<string>("DBConfig.url");

    const pool = new Pool({
      connectionString: url,
      // Certificates are always verified when SSL is on; only a database that
      // has explicitly been declared local is allowed to skip SSL entirely.
      ssl: shouldUseSsl(url, configService)
        ? {
            rejectUnauthorized: true,
            ca: configService.get<string>("DB_SSL_CA"),
            cert: configService.get<string>("DB_SSL_CERT"),
            key: configService.get<string>("DB_SSL_KEY"),
          }
        : false,
      allowExitOnIdle: true,
      connectionTimeoutMillis: 72000,
      // Keep connections alive so the server (Neon in particular) does not
      // silently close them while they sit idle in the pool.
      keepAlive: true,
      keepAliveInitialDelayMillis: 10000,
      // Give idle connections 30 s before the pool recycles them. This is long
      // enough to survive brief quiet spells but short enough that the pool
      // does not try to reuse a connection that Neon has already terminated.
      idleTimeoutMillis: 30000,
      // Default pg max is 10, which is easily exhausted under concurrent load.
      max: 20,
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
      // In development, skip migration errors if database is already initialized
      if (process.env.NODE_ENV === "development") {
        logger.warn(
          "Migration error (dev mode - continuing):",
          (err as Error).message,
        );
      } else {
        logger.error("Migration failed — server will not start", err);
        throw err;
      }
    }
    logger.log("Database connection established");
    return db;
  },
};

export default connectionProvider;
