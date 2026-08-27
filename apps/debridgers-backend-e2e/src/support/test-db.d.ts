export interface TestDatabaseConfig {
  databaseUrl: string;
  adminEmail: string;
  adminPassword: string;
}
export declare function resolveTestDatabaseUrl(devDatabaseUrl: string): string;
export declare function assertIsTestDatabase(databaseUrl: string): void;
export declare function ensureDatabaseExists(
  databaseUrl: string,
): Promise<void>;
export declare function truncateAllTables(databaseUrl: string): Promise<void>;
export declare function runMigrations(
  backendRoot: string,
  databaseUrl: string,
): void;
export declare function runSeed(
  backendRoot: string,
  config: TestDatabaseConfig,
): void;
