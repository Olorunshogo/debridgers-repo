import { Injectable } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { EmailService } from "../../notification/features/email/email.service";
import {
  USER_EVENTS,
  ContactSubmittedPayload,
  AgentAppliedPayload,
  AgentApprovedPayload,
  AgentRejectedPayload,
  PasswordResetRequestedPayload,
} from "../event-types/user.event.types";

@Injectable()
export class UserListeners {
  constructor(private readonly emailService: EmailService) {}

  @OnEvent(USER_EVENTS.CONTACT_SUBMITTED)
  async onContactSubmitted(payload: ContactSubmittedPayload): Promise<void> {
    await this.emailService.sendContactConfirmation(
      payload.email,
      payload.name,
    );
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
    await this.emailService.sendAgentApproved(payload.email, payload.name);
  }

  @OnEvent(USER_EVENTS.AGENT_REJECTED)
  async onAgentRejected(payload: AgentRejectedPayload): Promise<void> {
    await this.emailService.sendAgentRejected(
      payload.email,
      payload.name,
      payload.reason,
    );
  }

  @OnEvent(USER_EVENTS.PASSWORD_RESET_REQUESTED)
  async onPasswordResetRequested(
    payload: PasswordResetRequestedPayload,
  ): Promise<void> {
    await this.emailService.sendPasswordReset(
      payload.email,
      payload.name,
      payload.token,
    );
  }
}
