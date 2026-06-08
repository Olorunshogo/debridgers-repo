import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { EmailService } from "../../notification/features/email/email.service";
import {
  USER_EVENTS,
  UserRegisteredPayload,
  ContactSubmittedPayload,
  AgentAppliedPayload,
  AgentApprovedPayload,
  AgentRejectedPayload,
  PasswordResetRequestedPayload,
  PasswordResetCompletedPayload,
  EmailVerificationRequestedPayload,
  UserLoggedInPayload,
} from "../event-types/user.event.types";

@Injectable()
export class UserListeners {
  private readonly logger = new Logger(UserListeners.name);

  constructor(private readonly emailService: EmailService) {}

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
  }

  @OnEvent(USER_EVENTS.CONTACT_SUBMITTED)
  async onContactSubmitted(payload: ContactSubmittedPayload): Promise<void> {
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
    } catch (error) {
      this.logger.warn(`Verification email failed for ${payload.email}`);
      this.logger.debug(error);
    }
  }

  @OnEvent(USER_EVENTS.USER_LOGGED_IN)
  async onUserLoggedIn(payload: UserLoggedInPayload): Promise<void> {
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
