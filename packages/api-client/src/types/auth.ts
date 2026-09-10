/*
 * investor, farmer and logistics are reserved, not active roles: no schema, signup config or dashboard exists for them yet.
 * Uncomment as each gets real backend support, matching apps/debridgers-backend's roles.type.ts.
 *
 * hr / hiring_manager remain for a future dedicated HR product surface; staffing gates on admin + admin_desk.
 * applicant / employee power careers and hired-staff paths.
 */
export type UserRole =
  | "admin"
  | "agent"
  | "buyer"
  | "company"
  | "hr"
  | "hiring_manager"
  | "applicant"
  | "employee";
// | "investor"
// | "farmer"
// | "logistics";

export interface AuthUser {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  role: UserRole;
  is_email_verified: boolean;
  created_at?: string;
}

export interface JwtPayload {
  sub: number;
  email: string;
  role: UserRole;
  iat: number;
  exp: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginResponse {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
}

export interface RegisterResponse {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
}
