import {
  Inject,
  Injectable,
  Logger,
  OnApplicationBootstrap,
} from "@nestjs/common";
import Keyv from "keyv";
import { REDIS_CACHE } from "../core/redis.provider";

@Injectable()
export class RedisService implements OnApplicationBootstrap {
  private readonly logger = new Logger(RedisService.name);

  constructor(@Inject(REDIS_CACHE) private readonly cache: Keyv) {}

  async onApplicationBootstrap(): Promise<void> {
    try {
      await Promise.race([
        this.cache.set("keep-alive", "ping", 60000),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Redis ping timed out")), 5000),
        ),
      ]);
      this.logger.log("Upstash keep-alive ping sent");
    } catch (err) {
      this.logger.warn(`Redis keep-alive skipped: ${(err as Error).message}`);
    }
  }

  async set(key: string, value: unknown, ttlMs?: number): Promise<void> {
    await this.cache.set(key, value, ttlMs);
  }

  async get<T>(key: string): Promise<T | undefined> {
    return this.cache.get<T>(key);
  }

  async del(key: string): Promise<void> {
    await this.cache.delete(key);
  }

  async has(key: string): Promise<boolean> {
    return this.cache.has(key);
  }
}
