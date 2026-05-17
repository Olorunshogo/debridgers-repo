import { Request } from "express";
import { UserRole } from "./roles.type";

export interface JwtPayload {
  sub: number;
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

export interface JwtUser extends JwtPayload {
  id: number;
}

export interface JwtRefreshPayload extends JwtUser {
  refreshToken: string;
}

export interface AuthRequest extends Request {
  user: JwtUser;
}

export interface RefreshAuthRequest extends Request {
  user: JwtRefreshPayload;
}
