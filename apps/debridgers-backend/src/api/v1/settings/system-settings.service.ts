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
   * Both sources are percentages: the stored setting (the admin UI and
   * `updateSetting` validate 1-100) and AGENT_COMMISSION_RATE. Consumers need
   * a fraction, so the divide happens here, once. Doing it in one place keeps
   * a 5 from ever being multiplied as 5x instead of 0.05.
   */
  async getAgentCommissionRate(): Promise<number> {
    const envPercent = parseFloat(
      String(this.config.get("PaystackConfig.agentCommissionPercent") ?? "5"),
    );
    const fallback =
      Number.isNaN(envPercent) || envPercent < 1 || envPercent > 100
        ? 0.05
        : envPercent / 100;

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

  // === Referral and override rates

  /*
   * Generic percent reader. Every percentage setting is stored 1-100 and every
   * consumer needs a fraction, so the divide happens here rather than at each
   * call site. `getAgentCommissionRate` predates this and keeps its own env
   * fallback; everything else routes through here.
   */
  async getPercentAsFraction(key: string, fallback: number): Promise<number> {
    const stored = await this.get(key);
    if (stored === null) return fallback / 100;

    const percent = parseFloat(stored);
    if (Number.isNaN(percent) || percent < 0 || percent > 100) {
      this.logger.warn(
        `${key} is out of range ("${stored}"); using ${fallback}%`,
      );
      return fallback / 100;
    }

    return percent / 100;
  }

  /* Whole kobo reader for money-valued settings. */
  async getKobo(key: string, fallback: number): Promise<number> {
    const stored = await this.get(key);
    if (stored === null) return fallback;

    const kobo = parseInt(stored, 10);
    if (Number.isNaN(kobo) || kobo < 0) {
      this.logger.warn(
        `${key} is not valid kobo ("${stored}"); using ${fallback}`,
      );
      return fallback;
    }

    return kobo;
  }

  async getAgentOverrideRate(): Promise<number> {
    return this.getPercentAsFraction("agent_override_rate_percent", 5);
  }

  async getStateManagerOverrideRate(): Promise<number> {
    return this.getPercentAsFraction("state_manager_override_rate_percent", 2);
  }

  // === Writes

  invalidate(key: string): void {
    this.cache.delete(key);
  }

  invalidateAll(): void {
    this.cache.clear();
  }
}
