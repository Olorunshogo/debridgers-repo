import { createParamDecorator, ExecutionContext } from "@nestjs/common";

/*
 * Extracts the acting admin's user id.
 *
 * Reads request.user, populated by AuthGuard. It previously read
 * request.adminId, described as "injected by ApiKeyGuard" - a guard that is not
 * in any chain, so this always returned undefined and POST /admin/api-keys
 * could not insert its NOT NULL admin_id.
 */
export const AdminId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx
      .switchToHttp()
      .getRequest<{ user?: { sub?: number }; adminId?: number }>();

    return request.user?.sub ?? request.adminId;
  },
);
