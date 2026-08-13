import { Inject, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NodePgDatabase } from "drizzle-orm/node-postgres";
import { eq } from "drizzle-orm";
import * as schema from "../../../infrastructure/persistence/index";
import { DATABASE_CONNECTION } from "../../../infrastructure/database/database.provider";

/*
 * Single reader for the `system_settings` table. Before this existed, four
 * call sites each ran their own inline query with their own fallback, and the
 * agent commission rate was read from an env var entirely, which is why
 * changing it in the admin UI had no effect on what agents were actually paid.
 */

/*
 * Settings sit on hot paths (the payment webhook, checkout pricing), so reads
 * are cached briefly rather than hitting the database per call. Admin writes
 * call `invalidate`, so the cache never delays an intentional change - the TTL
 * only bounds staleness if a row is changed directly in the database.
 */
const CACHE_TTL_MS = 30_000;

interface CacheEntry {
  value: string | null;
  expiresAt: number;
}

@Injectable()
export class SystemSettingsService {
  private readonly logger = new Logger(SystemSettingsService.name);
  private readonly cache: Map<string, CacheEntry> = new Map();

  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
    private readonly config: ConfigService,
  ) {}

  // === Reads

  async get(key: string): Promise<string | null> {
    const cached = this.cache.get(key);
    if (cached && cached.expiresAt > Date.now()) return cached.value;

    const [row] = await this.db
      .select({ value: schema.system_settings.value })
      .from(schema.system_settings)
      .where(eq(schema.system_settings.key, key))
      .limit(1);

    const value = row?.value ?? null;
    this.cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
    return value;
  }

  async getAll(): Promise<Record<string, string>> {
    const rows = await this.db.select().from(schema.system_settings);

    const stored: Record<string, string> = {};
    for (const row of rows) {
      stored[row.key] = row.value;
      this.cache.set(row.key, {
        value: row.value,
        expiresAt: Date.now() + CACHE_TTL_MS,
      });
    }
    return stored;
  }

  async getNumber(key: string, fallback: number): Promise<number> {
    const raw = await this.get(key);
    if (raw === null) return fallback;

    const parsed = parseFloat(raw);
    if (Number.isNaN(parsed)) {
      this.logger.warn(
        `Setting "${key}" holds a non-numeric value ("${raw}"); using fallback ${fallback}`,
      );
      return fallback;
    }
    return parsed;
  }

  async getInt(key: string, fallback: number): Promise<number> {
    const raw = await this.get(key);
    if (raw === null) return fallback;

    const parsed = parseInt(raw, 10);
    if (Number.isNaN(parsed)) {
      this.logger.warn(
        `Setting "${key}" holds a non-integer value ("${raw}"); using fallback ${fallback}`,
      );
      return fallback;
    }
    return parsed;
  }

  // === Commission rate

  /*
   * The stored value is a percentage (the admin UI and `updateSetting` both
   * validate 1-100), but every consumer needs a fraction. Converting in one
   * place keeps a 30 from ever being multiplied as 30x instead of 0.30.
   */
  async getAgentCommissionRate(): Promise<number> {
    const envFraction = parseFloat(
      String(this.config.get("PaystackConfig.commissionRate") ?? "0.30"),
    );
    const fallback = Number.isNaN(envFraction) ? 0.3 : envFraction;

    const stored = await this.get("agent_commission_rate");
    if (stored === null) return fallback;

    const percent = parseFloat(stored);
    if (Number.isNaN(percent) || percent < 1 || percent > 100) {
      this.logger.warn(
        `agent_commission_rate is out of range ("${stored}"); using ${fallback}`,
      );
      return fallback;
    }

    return percent / 100;
  }

  /* Percentage form, for the admin and public config responses. */
  async getAgentCommissionPercent(): Promise<number> {
    return (await this.getAgentCommissionRate()) * 100;
  }

  // === Writes

  invalidate(key: string): void {
    this.cache.delete(key);
  }

  invalidateAll(): void {
    this.cache.clear();
  }
}
