export declare const TEST_REDIS_DB = 9;
export declare function resolveTestRedisUrl(devRedisUrl: string): string;
export declare function flushTestRedis(redisUrl: string): Promise<void>;
