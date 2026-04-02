import { Inject, Injectable } from "@nestjs/common";
import Keyv from "keyv";
import { REDIS_CACHE } from "../core/redis.provider";

@Injectable()
export class RedisService {
  constructor(@Inject(REDIS_CACHE) private readonly cache: Keyv) {}

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
