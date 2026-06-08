export const USER_EVENTS = {
  USER_REGISTERED: "user.registered",
  CONTACT_SUBMITTED: "contact.submitted",
  AGENT_APPLIED: "agent.applied",
  AGENT_APPROVED: "agent.approved",
  AGENT_REJECTED: "agent.rejected",
  PASSWORD_RESET_REQUESTED: "password.reset.requested",
  PASSWORD_RESET_COMPLETED: "password.reset.completed",
  EMAIL_VERIFICATION_REQUESTED: "email.verification.requested",
  USER_LOGGED_IN: "user.logged.in",
} as const;

export interface ContactSubmittedPayload {
  name: string;
  email: string;
}

export interface UserRegisteredPayload {
  name: string;
  email: string;
  otp: string;
  role: "admin" | "agent" | "buyer" | "company";
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

export interface PasswordResetCompletedPayload {
  name: string;
  email: string;
}

export interface EmailVerificationRequestedPayload {
  name: string;
  email: string;
  token: string;
  role: "admin" | "agent" | "buyer" | "company";
}

export interface UserLoggedInPayload {
  name: string;
  email: string;
  role: "admin" | "agent" | "buyer" | "company";
}
