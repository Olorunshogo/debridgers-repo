export const USER_EVENTS = {
  CONTACT_SUBMITTED: "contact.submitted",
  AGENT_APPLIED: "agent.applied",
  AGENT_APPROVED: "agent.approved",
  AGENT_REJECTED: "agent.rejected",
  PASSWORD_RESET_REQUESTED: "password.reset.requested",
} as const;

export interface ContactSubmittedPayload {
  name: string;
  email: string;
}

export interface AgentAppliedPayload {
  name: string;
  email: string;
}

export interface AgentApprovedPayload {
  name: string;
  email: string;
}

export interface AgentRejectedPayload {
  name: string;
  email: string;
  reason?: string;
}

export interface PasswordResetRequestedPayload {
  name: string;
  email: string;
  token: string;
}
