import { Request } from "express";
import { UserRole } from "./roles.type";

export interface JwtUser {
  id: number;
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

export interface JwtPayload extends JwtUser {
  sub: number;
}

export interface JwtRefreshPayload extends JwtPayload {
  refreshToken: string;
}

export interface AuthRequest extends Request {
  user: JwtUser;
}

export interface RefreshAuthRequest extends Request {
  user: JwtRefreshPayload;
}
