import { Inject, Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { NodePgDatabase } from "drizzle-orm/node-postgres";
import { eq } from "drizzle-orm";
import * as schema from "../../infrastructure/persistence/index";
import { lower } from "../../infrastructure/persistence/schemas/users.schema";
import { DATABASE_CONNECTION } from "../../infrastructure/database/database.provider";
import { EmailService } from "../../notification/features/email/email.service";
import {
  USER_EVENTS,
  UserRegisteredPayload,
  ContactSubmittedPayload,
  AgentAppliedPayload,
  AgentApprovedPayload,
  AgentRejectedPayload,
  AgentKycApprovedPayload,
  AgentKycRejectedPayload,
  PasswordResetRequestedPayload,
  PasswordResetCompletedPayload,
  EmailVerificationRequestedPayload,
  UserLoggedInPayload,
} from "../event-types/user.event.types";

@Injectable()
export class UserListeners {
  private readonly logger = new Logger(UserListeners.name);

  constructor(
    private readonly emailService: EmailService,
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  // === Notification preference gate

  /*
   * Whether an optional email may be sent to this address.
   *
   * Only applies to emails the user can reasonably live without. Account and
   * security mail - welcome, verification, password reset, agent application
   * outcomes - ignores this flag entirely, because switching off notifications
   * must not lock someone out of their own account.
   *
   * Events carry an email rather than a user id, and the unique index is on
   * lower(email), so the lookup matches case-insensitively. An address with no
   * user row (a contact form from a non-customer) is allowed through: there is
   * no preference to respect.
   */
  private async optionalEmailAllowed(email: string): Promise<boolean> {
    try {
      const [row] = await this.db
        .select({ email_notifications: schema.users.email_notifications })
        .from(schema.users)
        .where(eq(lower(schema.users.email), email.toLowerCase()))
        .limit(1);

      if (!row) return true;
      return row.email_notifications;
    } catch (error) {
      /* A lookup failure must not silently swallow mail the user expects. */
      this.logger.warn(
        `Could not read notification preference for ${email}; sending anyway`,
      );
      this.logger.debug(error);
      return true;
    }
  }

  @OnEvent(USER_EVENTS.USER_REGISTERED)
  async onUserRegistered(payload: UserRegisteredPayload): Promise<void> {
    if (payload.role === "agent") {
      await this.emailService.sendAgentWelcome(payload.email, payload.name);
    } else {
      await this.emailService.sendWelcome(
        payload.email,
        payload.name,
        payload.role,
      );
    }

    await this.emailService.sendEmailVerification(
      payload.email,
      payload.name,
      payload.otp,
      payload.role,
    );

    if (process.env.NODE_ENV !== "production") {
      console.log(`📧 [OTP] Email: ${payload.email} | OTP: ${payload.otp}`);
    }
  }

  @OnEvent(USER_EVENTS.CONTACT_SUBMITTED)
  async onContactSubmitted(payload: ContactSubmittedPayload): Promise<void> {
    if (!(await this.optionalEmailAllowed(payload.email))) {
      this.logger.log(
        `Contact confirmation skipped for ${payload.email} - notifications off`,
      );
      return;
    }

    try {
      await this.emailService.sendContactConfirmation(
        payload.email,
        payload.name,
      );
    } catch (error) {
      this.logger.warn(
        `Contact confirmation email failed for ${payload.email}`,
      );
      this.logger.debug(error);
    }
  }

  @OnEvent(USER_EVENTS.AGENT_APPLIED)
  async onAgentApplied(payload: AgentAppliedPayload): Promise<void> {
    await this.emailService.sendAgentApplicationReceived(
      payload.email,
      payload.name,
    );
  }

  @OnEvent(USER_EVENTS.AGENT_APPROVED)
  async onAgentApproved(payload: AgentApprovedPayload): Promise<void> {
    try {
      await this.emailService.sendAgentApproved(payload.email, payload.name);
    } catch (error) {
      this.logger.warn(`Agent approval email failed for ${payload.email}`);
      this.logger.debug(error);
    }
  }

  @OnEvent(USER_EVENTS.AGENT_REJECTED)
  async onAgentRejected(payload: AgentRejectedPayload): Promise<void> {
    try {
      await this.emailService.sendAgentRejected(
        payload.email,
        payload.name,
        payload.reason,
      );
    } catch (error) {
      this.logger.warn(`Agent rejection email failed for ${payload.email}`);
      this.logger.debug(error);
    }
  }

  @OnEvent(USER_EVENTS.AGENT_KYC_APPROVED)
  async onAgentKycApproved(payload: AgentKycApprovedPayload): Promise<void> {
    try {
      await this.emailService.sendAgentKycApproved(payload.email, payload.name);
    } catch (error) {
      this.logger.warn(`Agent KYC approval email failed for ${payload.email}`);
      this.logger.debug(error);
    }
  }

  @OnEvent(USER_EVENTS.AGENT_KYC_REJECTED)
  async onAgentKycRejected(payload: AgentKycRejectedPayload): Promise<void> {
    try {
      await this.emailService.sendAgentKycRejected(
        payload.email,
        payload.name,
        payload.reason,
      );
    } catch (error) {
      this.logger.warn(`Agent KYC rejection email failed for ${payload.email}`);
      this.logger.debug(error);
    }
  }

  @OnEvent(USER_EVENTS.PASSWORD_RESET_REQUESTED)
  async onPasswordResetRequested(
    payload: PasswordResetRequestedPayload,
  ): Promise<void> {
    try {
      await this.emailService.sendPasswordReset(
        payload.email,
        payload.name,
        payload.token,
      );
      if (process.env.NODE_ENV !== "production") {
        console.log(
          `📧 [PASSWORD_RESET] Email: ${payload.email} | Token: ${payload.token}`,
        );
      }
    } catch (error) {
      this.logger.warn(`Password reset email failed for ${payload.email}`);
      this.logger.debug(error);
    }
  }

  @OnEvent(USER_EVENTS.PASSWORD_RESET_COMPLETED)
  async onPasswordResetCompleted(
    payload: PasswordResetCompletedPayload,
  ): Promise<void> {
    try {
      await this.emailService.sendPasswordResetConfirmation(
        payload.email,
        payload.name,
      );
    } catch (error) {
      this.logger.warn(
        `Password reset confirmation email failed for ${payload.email}`,
      );
      this.logger.debug(error);
    }
  }

  @OnEvent(USER_EVENTS.EMAIL_VERIFICATION_REQUESTED)
  async onEmailVerificationRequested(
    payload: EmailVerificationRequestedPayload,
  ): Promise<void> {
    try {
      await this.emailService.sendEmailVerification(
        payload.email,
        payload.name,
        payload.token,
        payload.role,
      );
      if (process.env.NODE_ENV !== "production") {
        console.log(
          `📧 [EMAIL_VERIFICATION] Email: ${payload.email} | OTP: ${payload.token}`,
        );
      }
    } catch (error) {
      this.logger.warn(`Verification email failed for ${payload.email}`);
      this.logger.debug(error);
    }
  }

  @OnEvent(USER_EVENTS.USER_LOGGED_IN)
  async onUserLoggedIn(payload: UserLoggedInPayload): Promise<void> {
    if (!(await this.optionalEmailAllowed(payload.email))) {
      this.logger.log(
        `Login notice skipped for ${payload.email} - notifications off`,
      );
      return;
    }

    try {
      if (payload.role === "agent") {
        await this.emailService.sendAgentLoginMessage(
          payload.email,
          payload.name,
        );
        return;
      }

      await this.emailService.sendBuyerLoginMessage(
        payload.email,
        payload.name,
      );
    } catch (error) {
      this.logger.warn(`Login email failed for ${payload.email}`);
      this.logger.debug(error);
    }
  }
}
