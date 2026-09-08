import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import { PostHog } from "posthog-node";

/*
 * Event ingestion needs a PROJECT key, which PostHog prefixes with `phc_`.
 * A personal key (`phx_`) authenticates the management API and is rejected by
 * /batch/ with a 401 - which the client then retries, so one wrong key produced
 * a stack trace every flush interval and buried real errors in the log.
 */
const PROJECT_KEY_PREFIX = "phc_";

@Injectable()
export class PostHogService implements OnModuleDestroy {
  private readonly logger = new Logger(PostHogService.name);
  /* Null when analytics is not usable, so nothing is queued and nothing flushes. */
  private readonly posthog: PostHog | null;

  constructor() {
    const key = process.env.POSTHOG_API_KEY?.trim();

    if (!key) {
      this.posthog = null;
      return;
    }

    if (!key.startsWith(PROJECT_KEY_PREFIX)) {
      /*
       * Warn once at boot rather than failing per flush. Analytics is not worth
       * an error loop, and a silent drop would leave nobody knowing it is off.
       */
      this.logger.warn(
        `POSTHOG_API_KEY does not look like a project key (expected "${PROJECT_KEY_PREFIX}…"). Analytics disabled.`,
      );
      this.posthog = null;
      return;
    }

    // Flush events every 10 seconds.
    this.posthog = new PostHog(key, {
      host: process.env.POSTHOG_HOST || "https://us.posthog.com",
      flushInterval: 10000,
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
    if (!this.posthog) return;

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
    /* Nothing to flush when analytics never initialised, and calling shutdown
       on a null client would take the whole shutdown path down with it. */
    await this.posthog?.shutdown();
  }
}
