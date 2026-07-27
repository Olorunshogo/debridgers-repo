import { publicPost } from "../../transport/public-request";
import type {
  AuthUser,
  LoginResponse,
  RegisterResponse,
  UserRole,
} from "../../types/auth";

/*
 * One function per auth endpoint. Each is a thin call with no state, no
 * storage, and no navigation - hooks own those. Paths mirror the backend's
 * auth.controller.ts.
 */

// === Payloads

export interface LoginPayload {
  email: string;
  password: string;
}

/**
 * Roles a user may create for themselves. Admin is deliberately excluded, and
 * the backend enforces the same allow-list - this type is a convenience, not
 * the security boundary.
 */
export type SelfRegisterableRole = Extract<UserRole, "buyer" | "agent">;

export interface RegisterPayload {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  role: SelfRegisterableRole;
  phone?: string;
  referred_by_agent_code?: string;
}

export interface ResetPasswordPayload {
  token: string;
  password: string;
}

export interface VerifyEmailPayload {
  email: string;
  otp: string;
}

// === Sessions

export function login(payload: LoginPayload): Promise<LoginResponse> {
  return publicPost<LoginResponse>("/auth/login", payload);
}

/*
 * Separate endpoint from `login`, not a variant of it. The backend rejects
 * non-admin users here and issues admin sessions through its own path, so the
 * two must stay distinct even though the UI is shared.
 */
export function adminLogin(payload: LoginPayload): Promise<LoginResponse> {
  return publicPost<LoginResponse>("/auth/admin/login", payload);
}

// === Registration

export function register(
  payload: RegisterPayload,
): Promise<RegisterResponse | { user: AuthUser }> {
  return publicPost<RegisterResponse | { user: AuthUser }>(
    "/auth/register",
    payload,
  );
}

// === Password reset

export function forgotPassword(email: string): Promise<unknown> {
  return publicPost("/auth/forgot-password", { email });
}

export function resetPassword(payload: ResetPasswordPayload): Promise<unknown> {
  return publicPost("/auth/reset-password", payload);
}

// === Email verification

export function verifyEmail(
  payload: VerifyEmailPayload,
): Promise<Partial<LoginResponse>> {
  return publicPost<Partial<LoginResponse>>("/auth/verify-email", payload);
}

export function resendOtp(email: string): Promise<unknown> {
  return publicPost("/auth/resend-otp", { email });
}

export function resendVerification(email: string): Promise<unknown> {
  return publicPost("/auth/resend-verification", { email });
}
