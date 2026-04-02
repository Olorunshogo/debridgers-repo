import { UserRole } from "./roles.type";

export interface JwtPayload {
  sub: number;
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

export interface JwtRefreshPayload extends JwtPayload {
  refreshToken: string;
}
