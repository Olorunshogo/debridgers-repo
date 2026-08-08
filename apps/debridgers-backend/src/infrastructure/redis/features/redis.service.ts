import {
  Inject,
  Injectable,
  Logger,
  OnApplicationBootstrap,
} from "@nestjs/common";
import Keyv from "keyv";
import { REDIS_CACHE } from "../core/redis.provider";

const COMMAND_TIMEOUT_MS = 1000;
const PING_TIMEOUT_MS = 5000;
/*
 * How long to stop issuing commands after a failure. Without this, every
 * request during an outage pays the timeout once per cache call - a login makes
 * several, so a dead host turned a 40ms login into a 3.4s one. The breaker
 * keeps that cost to the single probe that reopens the circuit.
 */
const DEGRADED_COOLDOWN_MS = 30000;

@Injectable()
export class RedisService implements OnApplicationBootstrap {
  private readonly logger = new Logger(RedisService.name);
  /* Tracks the healthy/degraded transition so an outage logs once, not per command. */
  private degraded: boolean = false;
  /* Epoch ms until which commands are skipped outright. 0 means the circuit is closed. */
  private skipUntil: number = 0;

  constructor(@Inject(REDIS_CACHE) private readonly cache: Keyv) {}

  async onApplicationBootstrap(): Promise<void> {
    const reachable = await this.withTimeout(
      "keep-alive ping",
      this.cache.set("keep-alive", "ping", 60000),
      PING_TIMEOUT_MS,
    );

    if (reachable !== undefined) {
      this.logger.log("Redis reachable - keep-alive ping sent");
    }
  }

  async set(key: string, value: unknown, ttlMs?: number): Promise<void> {
    await this.withTimeout(`set ${key}`, this.cache.set(key, value, ttlMs));
  }

  async get<T>(key: string): Promise<T | undefined> {
    return this.withTimeout(`get ${key}`, this.cache.get<T>(key));
  }

  async del(key: string): Promise<void> {
    await this.withTimeout(`del ${key}`, this.cache.delete(key));
  }

  async has(key: string): Promise<boolean> {
    return (await this.withTimeout(`has ${key}`, this.cache.has(key))) ?? false;
  }

  /*
   * Every cache command is bounded, and a timeout resolves to undefined rather
   * than throwing.
   *
   * Keyv's redis store connects lazily and retries forever, so an unreachable
   * host leaves commands pending instead of rejecting. That is not theoretical:
   * a dead Upstash host once hung every login indefinitely, because
   * AuthAttemptService.checkAttemptAllowed is the first await in the login path.
   *
   * Failing open is deliberate. This cache backs rate-limit counters, which are
   * defense in depth - the per-endpoint ThrottlerGuard still caps login attempts
   * from its own in-memory store. Failing closed would turn a cache outage into
   * a total authentication outage, which is the worse failure.
   */
  private async withTimeout<T>(
    operation: string,
    work: Promise<T>,
    timeoutMs: number = COMMAND_TIMEOUT_MS,
  ): Promise<T | undefined> {
    /*
     * The losing side of the race can still settle later. Attaching a handler
     * up front keeps a late rejection from surfacing as an unhandled rejection
     * and taking the process down. Done before the breaker check so a skipped
     * command's promise is still handled.
     */
    work.catch(() => undefined);

    if (Date.now() < this.skipUntil) return undefined;

    let timer: NodeJS.Timeout | undefined;

    try {
      const result = await Promise.race([
        work,
        new Promise<never>((_, reject) => {
          timer = setTimeout(
            () => reject(new Error(`timed out after ${timeoutMs}ms`)),
            timeoutMs,
          );
        }),
      ]);

      this.skipUntil = 0;

      if (this.degraded) {
        this.degraded = false;
        this.logger.log("Redis recovered - cache commands succeeding again");
      }

      return result;
    } catch (err) {
      this.skipUntil = Date.now() + DEGRADED_COOLDOWN_MS;

      if (!this.degraded) {
        this.degraded = true;
        this.logger.warn(
          `Redis degraded, skipping cache for ${DEGRADED_COOLDOWN_MS / 1000}s. First failure: ${operation} ${(err as Error).message}`,
        );
      }
      return undefined;
    } finally {
      if (timer) clearTimeout(timer);
    }
  }
}
