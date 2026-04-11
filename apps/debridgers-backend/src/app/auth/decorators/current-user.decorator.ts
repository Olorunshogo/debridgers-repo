import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { AuthRequest } from "../../../interfaces/users/jwt.type";

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const req = ctx.switchToHttp().getRequest<AuthRequest>();
    return req.user;
  },
);
