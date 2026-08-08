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
      /*
       * No try/catch around the construction: KeyvRedis connects lazily and
       * retries indefinitely, so it never throws here and a catch block would
       * be dead code. It also means "configured" is not "reachable" - the
       * previous log claimed a connection that may never have happened.
       * RedisService bounds each command and degrades to no-cache instead.
       */
      const keyv = new Keyv({ store: new KeyvRedis(redisUrl) });
      keyv.on("error", (err: Error) => {
        logger.warn(`Redis client error: ${err.message}`);
      });
      logger.log("Redis configured - connection is established lazily");
      return keyv;
    }

    logger.warn("No UPSTASH_REDIS_URL set - using in-memory cache");
    return new Keyv({ store: new CacheableMemory({ ttl: 60000 }) });
  },
};
