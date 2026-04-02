import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { Request } from "express";
import { JwtPayload } from "../../../interfaces/users/jwt.type";

@Injectable()
export class RefreshGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context
      .switchToHttp()
      .getRequest<Request & { user: JwtPayload & { refreshToken: string } }>();
    const token = this.extractToken(req);

    if (!token) throw new UnauthorizedException("No refresh token");

    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: this.config.get<string>("RefreshJwt.secret"),
      });
      req.user = { ...payload, refreshToken: token };
      return true;
    } catch {
      throw new UnauthorizedException("Invalid or expired refresh token");
    }
  }

  private extractToken(req: Request): string | undefined {
    const [type, token] = req.headers.authorization?.split(" ") ?? [];
    return type === "Refresh" ? token : undefined;
  }
}
