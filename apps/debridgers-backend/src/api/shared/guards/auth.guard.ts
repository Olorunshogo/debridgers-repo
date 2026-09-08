import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { AuthRequest, JwtPayload } from "../../../interfaces/users/jwt.type";

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AuthRequest>();
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedException("Missing Authorization header");
    }

    const [type, token] = authHeader.split(" ");

    if (type !== "Bearer") {
      throw new UnauthorizedException(
        "Invalid token type - expected 'Bearer <token>'",
      );
    }

    if (!token) {
      throw new UnauthorizedException("No access token provided");
    }

    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: this.config.get<string>("AccessJwt.secret"),
      });

      // Explicitly map payload properties to user
      req.user = {
        sub: payload.sub,
        id: payload.id,
        email: payload.email,
        first_name: payload.first_name,
        last_name: payload.last_name,
        role: payload.role,
        /*
         * Gates super-only admin writes (PricingAdminController.assertSuper).
         * Dropping it here made every super admin look like a sub and 403'd real pricing writes.
         */
        admin_tier: payload.admin_tier,
        api_version: payload.api_version,
        device: payload.device,
        ip_address: payload.ip_address,
        iat: payload.iat,
        exp: payload.exp,
      };

      return true;
    } catch (error) {
      let message = "Invalid access token";
      if (error instanceof Error && error.name === "TokenExpiredError") {
        message = "Access token has expired";
      }
      throw new UnauthorizedException(message);
    }
  }
}
