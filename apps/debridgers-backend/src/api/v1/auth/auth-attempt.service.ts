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

  /**
   * Get backoff time in milliseconds based on failure count
   * 1-5 failures: allowed (no lockout)
   * 6-9 failures: 20 min lockout
   * 10-14 failures: 30 min lockout
   * 15-19 failures: 45 min lockout
   * 20+ failures: 24 hrs lockout (comeback tomorrow)
   */
  private getBackoffTime(failureCount: number): number {
    if (failureCount < 6) return 0; // No lockout for first 5 attempts
    if (failureCount <= 9) return 20 * 60 * 1000; // 20 minutes
    if (failureCount <= 14) return 30 * 60 * 1000; // 30 minutes
    if (failureCount <= 19) return 45 * 60 * 1000; // 45 minutes
    return 24 * 60 * 60 * 1000; // 24 hours (1 day)
  }

  /**
   * Check if login attempt is allowed
   * Returns: { allowed: boolean, remainingTime?: number (in seconds) }
   */
  async checkAttemptAllowed(
    email: string,
    ip: string,
  ): Promise<{ allowed: boolean; remainingTime?: number }> {
    const ipKey = this.getIpKey(ip);
    const emailIpKey = this.getEmailIpKey(email, ip);

    // Check IP-level attempts
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
      // Backoff expired, delete it
      await this.redis.del(ipKey);
    }

    // Check Email+IP-level attempts
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
      // Backoff expired, delete it
      await this.redis.del(emailIpKey);
    }

    return { allowed: true };
  }

  /**
   * Record a failed login attempt
   */
  async recordFailedAttempt(email: string, ip: string): Promise<void> {
    const ipKey = this.getIpKey(ip);
    const emailIpKey = this.getEmailIpKey(email, ip);

    // Update IP attempts
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

    // Update Email+IP attempts
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

  /**
   * Reset attempts on successful login
   */
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
