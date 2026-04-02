import { Logger } from "@nestjs/common";
import KeyvRedis from "@keyv/redis";
import Keyv from "keyv";
import { CacheableMemory } from "cacheable";

export const REDIS_CACHE = Symbol("REDIS_CACHE");

export const redisProvider = {
  provide: REDIS_CACHE,
  useFactory: () => {
    const logger = new Logger("RedisModule");
    const redisUrl = process.env.UPSTASH_REDIS_URL;

    if (redisUrl) {
      try {
        const keyv = new Keyv({
          store: new KeyvRedis(redisUrl),
        });
        logger.log("Redis cache connected (Upstash)");
        return keyv;
      } catch {
        logger.warn("Redis unavailable — falling back to in-memory cache");
      }
    }

    logger.warn("No UPSTASH_REDIS_URL set — using in-memory cache");
    return new Keyv({ store: new CacheableMemory({ ttl: 60000 }) });
  },
};
