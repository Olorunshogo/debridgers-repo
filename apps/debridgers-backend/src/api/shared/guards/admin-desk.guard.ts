import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import {
  ADMIN_DESKS_KEY,
  type AdminDesk,
} from "../decorators/admin-desks.decorator";
import { JwtPayload } from "../../../interfaces/users/jwt.type";

@Injectable()
export class AdminDeskGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const desks = this.reflector.getAllAndOverride<AdminDesk[] | undefined>(
      ADMIN_DESKS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!desks || desks.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user?: JwtPayload }>();
    const user = request.user;

    if (!user || user.role !== "admin") {
      return true;
    }

    if (user.admin_tier === "super") {
      return true;
    }

    const desk = user.admin_desk;
    if (desk && desks.includes(desk)) {
      return true;
    }

    throw new ForbiddenException(
      `This action requires an admin desk of: ${desks.join(", ")}`,
    );
  }
}
