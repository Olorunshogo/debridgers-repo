import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { PostHog } from "posthog-node";

@Injectable()
export class PostHogService implements OnModuleDestroy {
  private posthog: PostHog;

  constructor() {
    this.posthog = new PostHog(process.env.POSTHOG_API_KEY || "", {
      host: process.env.POSTHOG_HOST || "https://us.posthog.com",
      flushInterval: 10000, // Flush events every 10 seconds
    });
  }

  /**
   * Track an event
   */
  capture(
    distinctId: string,
    event: string,
    properties?: Record<string, unknown>,
  ): void {
    if (!process.env.POSTHOG_API_KEY) return;

    this.posthog.capture({
      distinctId,
      event,
      properties: {
        ...properties,
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
      },
    });
  }

  /**
   * Track user login
   */
  trackLogin(userId: number, email: string, role: string, ip: string): void {
    this.capture(String(userId), "user_login", {
      email,
      role,
      ip,
    });
  }

  /**
   * Track failed login attempt
   */
  trackFailedLogin(email: string, ip: string, reason: string): void {
    this.capture(`failed_${email}`, "login_failed", {
      email,
      ip,
      reason,
    });
  }

  /**
   * Track payment initialization
   */
  trackPaymentInit(userId: number, orderId: number, amount: number): void {
    this.capture(String(userId), "payment_initialized", {
      order_id: orderId,
      amount,
    });
  }

  /**
   * Track successful payment
   */
  trackPaymentSuccess(userId: number, orderId: number, amount: number): void {
    this.capture(String(userId), "payment_success", {
      order_id: orderId,
      amount,
    });
  }

  /**
   * Track API errors
   */
  trackError(userId: string, error: string, path: string): void {
    this.capture(userId, "api_error", {
      error,
      path,
    });
  }

  /**
   * Track agent approval
   */
  trackAgentApproved(agentId: number, email: string, state: string): void {
    this.capture(String(agentId), "agent_approved", {
      email,
      state,
    });
  }

  /**
   * Flush events on app shutdown
   */
  async onModuleDestroy(): Promise<void> {
    await this.posthog.shutdown();
  }
}
