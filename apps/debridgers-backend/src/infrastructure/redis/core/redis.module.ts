import { Global, Module } from "@nestjs/common";
import { redisProvider, REDIS_CACHE } from "./redis.provider";
import { RedisService } from "../features/redis.service";

@Global()
@Module({
  providers: [redisProvider, RedisService],
  exports: [REDIS_CACHE, RedisService],
})
export class RedisModule {}
