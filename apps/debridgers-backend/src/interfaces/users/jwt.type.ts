import { Request } from "express";
import { UserRole } from "./roles.type";

export interface JwtPayload {
  sub: number;
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  admin_tier?: "super" | "sub";
  admin_desk?: "buyer" | "agent" | "hr";
  api_version: string;
  device: string;
  ip_address: string;
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
