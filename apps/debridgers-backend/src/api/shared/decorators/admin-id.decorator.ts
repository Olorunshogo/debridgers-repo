import { createParamDecorator, ExecutionContext } from "@nestjs/common";

/**
 * Extracts admin ID from request (injected by ApiKeyGuard)
 */
export const AdminId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.adminId;
  },
);
