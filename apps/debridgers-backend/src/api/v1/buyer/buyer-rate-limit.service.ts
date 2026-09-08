import { Injectable } from "@nestjs/common";
// TooManyRequestsException removed - using HttpException instead
import { RedisService } from "../../../infrastructure/redis/features/redis.service";

@Injectable()
export class BuyerRateLimitService {
  constructor(private readonly redis: RedisService) {}

  async checkOrderLimit(userId: number): Promise<{
    allowed: boolean;
    remaining?: number;
    resetIn?: number;
  }> {
    const key = `buyer_orders:${userId}`;
    const limit = 5;
    const window = 60 * 60 * 1000;

    const count = await this.redis.get<number>(key);
    const currentCount = (count ?? 0) + 1;

    if (currentCount > limit) {
      return {
        allowed: false,
        remaining: 0,
        resetIn: Math.ceil(window / 1000),
      };
    }

    await this.redis.set(key, currentCount, window);

    return {
      allowed: true,
      remaining: limit - currentCount,
    };
  }

  async recordOrderAttempt(userId: number): Promise<void> {
    const key = `buyer_orders:${userId}`;
    const window = 60 * 60 * 1000;

    const count = await this.redis.get<number>(key);
    await this.redis.set(key, (count ?? 0) + 1, window);
  }

  async checkPaymentAttempt(
    userId: number,
    orderId: number,
  ): Promise<{
    allowed: boolean;
    remaining?: number;
    resetIn?: number;
  }> {
    const key = `payment_attempt:${userId}:${orderId}`;
    const limit = 3;
    const window = 60 * 1000;

    const count = await this.redis.get<number>(key);
    const currentCount = (count ?? 0) + 1;

    if (currentCount > limit) {
      return {
        allowed: false,
        remaining: 0,
        resetIn: Math.ceil(window / 1000),
      };
    }

    await this.redis.set(key, currentCount, window);

    return {
      allowed: true,
      remaining: limit - currentCount,
    };
  }

  async checkDepositLimit(userId: number): Promise<{
    allowed: boolean;
    remaining?: number;
    resetIn?: number;
  }> {
    const key = `wallet_deposits:${userId}`;
    const limit = 10;
    const window = 24 * 60 * 60 * 1000;

    const count = await this.redis.get<number>(key);
    const currentCount = (count ?? 0) + 1;

    if (currentCount > limit) {
      return {
        allowed: false,
        remaining: 0,
        resetIn: Math.ceil(window / 1000),
      };
    }

    await this.redis.set(key, currentCount, window);

    return {
      allowed: true,
      remaining: limit - currentCount,
    };
  }
}
