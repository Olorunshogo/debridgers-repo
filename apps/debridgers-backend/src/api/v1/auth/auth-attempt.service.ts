import { Injectable } from "@nestjs/common";
import { RedisService } from "../../../infrastructure/redis/features/redis.service";

interface AttemptData {
  count: number;
  timestamp: number;
}

@Injectable()
export class AuthAttemptService {
  constructor(private readonly redis: RedisService) {}

  private getIpKey(ip: string) {
    return `auth_attempts:ip:${ip}`;
  }

  private getEmailIpKey(email: string, ip: string) {
    return `auth_attempts:email_ip:${email}:${ip}`;
  }

  /*
   * Backoff schedule by failure count: 1-5 none, 6-9 twenty minutes, 10-14 thirty minutes, 15-19 forty-five minutes, 20+ a day.
   */
  private getBackoffTime(failureCount: number): number {
    if (failureCount < 6) return 0;
    if (failureCount <= 9) return 20 * 60 * 1000;
    if (failureCount <= 14) return 30 * 60 * 1000;
    if (failureCount <= 19) return 45 * 60 * 1000;
    return 24 * 60 * 60 * 1000;
  }

  /* Return value's remainingTime is in seconds, unlike the internal backoff which is tracked in milliseconds. */
  async checkAttemptAllowed(
    email: string,
    ip: string,
  ): Promise<{ allowed: boolean; remainingTime?: number }> {
    const ipKey = this.getIpKey(ip);
    const emailIpKey = this.getEmailIpKey(email, ip);

    const ipData = await this.redis.get<AttemptData>(ipKey);
    if (ipData) {
      const elapsed = Date.now() - ipData.timestamp;
      const backoff = this.getBackoffTime(ipData.count);
      if (elapsed < backoff) {
        return {
          allowed: false,
          remainingTime: Math.ceil((backoff - elapsed) / 1000),
        };
      }
      await this.redis.del(ipKey);
    }

    const emailIpData = await this.redis.get<AttemptData>(emailIpKey);
    if (emailIpData) {
      const elapsed = Date.now() - emailIpData.timestamp;
      const backoff = this.getBackoffTime(emailIpData.count);
      if (elapsed < backoff) {
        return {
          allowed: false,
          remainingTime: Math.ceil((backoff - elapsed) / 1000),
        };
      }
      await this.redis.del(emailIpKey);
    }

    return { allowed: true };
  }

  async recordFailedAttempt(email: string, ip: string): Promise<void> {
    const ipKey = this.getIpKey(ip);
    const emailIpKey = this.getEmailIpKey(email, ip);

    const ipData = await this.redis.get<AttemptData>(ipKey);
    const newIpCount = (ipData?.count ?? 0) + 1;
    const backoff = this.getBackoffTime(newIpCount);
    // Store for 24 hours minimum to track attempts (even during free attempts 1-5)
    const ttl = backoff > 0 ? backoff : 24 * 60 * 60 * 1000;
    await this.redis.set(
      ipKey,
      { count: newIpCount, timestamp: Date.now() },
      ttl,
    );

    const emailIpData = await this.redis.get<AttemptData>(emailIpKey);
    const newEmailIpCount = (emailIpData?.count ?? 0) + 1;
    const emailIpBackoff = this.getBackoffTime(newEmailIpCount);
    const emailIpTtl =
      emailIpBackoff > 0 ? emailIpBackoff : 24 * 60 * 60 * 1000;
    await this.redis.set(
      emailIpKey,
      { count: newEmailIpCount, timestamp: Date.now() },
      emailIpTtl,
    );
  }

  async resetAttempts(email: string, ip: string): Promise<void> {
    const ipKey = this.getIpKey(ip);
    const emailIpKey = this.getEmailIpKey(email, ip);

    await Promise.all([this.redis.del(ipKey), this.redis.del(emailIpKey)]);
  }

  /**
   * Get current attempt count (for debugging/monitoring)
   */
  async getAttemptCount(
    email: string,
    ip: string,
  ): Promise<{ ipAttempts: number; emailIpAttempts: number }> {
    const ipKey = this.getIpKey(ip);
    const emailIpKey = this.getEmailIpKey(email, ip);

    const [ipData, emailIpData] = await Promise.all([
      this.redis.get<AttemptData>(ipKey),
      this.redis.get<AttemptData>(emailIpKey),
    ]);

    return {
      ipAttempts: ipData?.count ?? 0,
      emailIpAttempts: emailIpData?.count ?? 0,
    };
  }
}
