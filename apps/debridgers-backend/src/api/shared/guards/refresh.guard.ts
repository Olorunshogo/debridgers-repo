import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import {
  JwtPayload,
  RefreshAuthRequest,
} from "../../../interfaces/users/jwt.type";

@Injectable()
export class RefreshGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<RefreshAuthRequest>();
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedException("Missing Authorization header");
    }

    const [type, token] = authHeader.split(" ");

    if (type !== "Refresh") {
      throw new UnauthorizedException(
        "Invalid token type - expected 'Refresh <token>'",
      );
    }

    if (!token) {
      throw new UnauthorizedException("No refresh token provided");
    }

    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: this.config.get<string>("RefreshJwt.secret"),
      });

      req.user = {
        sub: payload.sub,
        id: payload.sub,
        email: payload.email,
        role: payload.role,
        iat: payload.iat,
        exp: payload.exp,
        refreshToken: token,
      };

      return true;
    } catch (error) {
      let message = "Invalid refresh token";
      if (error instanceof Error && error.name === "TokenExpiredError") {
        message = "Refresh token has expired";
      }
      throw new UnauthorizedException(message);
    }
  }
}
