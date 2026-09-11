import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Inject,
} from "@nestjs/common";
import { NodePgDatabase } from "drizzle-orm/node-postgres";
import { eq } from "drizzle-orm";
import { ConfigService } from "@nestjs/config";
import { DATABASE_CONNECTION } from "../../../infrastructure/database/database.provider";
import { users } from "../../../infrastructure/persistence";

@Injectable()
export class AdminKeyGuard implements CanActivate {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private db: NodePgDatabase<Record<string, unknown>>,
    private configService: ConfigService,
  ) {}

  private envAdminKeys(): string[] {
    return [
      this.configService.get<string>("SUPER_ADMIN_KEY_1"),
      this.configService.get<string>("SUPER_ADMIN_KEY_2"),
    ].filter((k): k is string => Boolean(k));
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.id) {
      throw new UnauthorizedException("User not authenticated");
    }

    /*
     * This guard's admin_tier check is specific to the admin role. A route
     * with a `@Roles` override - e.g. `POST /admin/outreach` also allowing
     * "agent" - runs this guard before RolesGuard, so an agent (who has no
     * admin_tier by definition) was rejected here with 401 before RolesGuard
     * ever got to allow them. Deferring non-admin roles to RolesGuard lets it
     * make the actual admission decision, and a role that isn't allowed still
     * ends up correctly rejected there with 403, not misreported as 401 here.
     */
    if (user.role !== "admin") {
      return true;
    }

    const userRecord = await this.db
      .select()
      .from(users)
      .where(eq(users.id, user.id));

    if (userRecord.length === 0) {
      throw new UnauthorizedException("User not found");
    }

    const userObj = userRecord[0];

    if (!userObj.admin_tier) {
      throw new UnauthorizedException("User does not have admin access");
    }

    const adminKey = request.headers["x-admin-key"] as string | undefined;
    const adminTier = request.headers["x-admin-tier"] as string | undefined;

    /*
     * Sub admins must always send both headers. Key is one of the shared env
     * secrets (SUPER_ADMIN_KEY_1 or _2), not a per-user admin_api_key.
     * Super may use JWT alone (browser) or the same two-header path (scripts).
     */
    if (userObj.admin_tier === "sub") {
      if (!adminKey || !adminTier) {
        throw new UnauthorizedException(
          "Sub admins must send both X-Admin-Key and X-Admin-Tier headers.",
        );
      }

      if (adminTier !== "sub") {
        throw new UnauthorizedException(
          `Tier mismatch: user is sub, but X-Admin-Tier is ${adminTier}`,
        );
      }

      const keys = this.envAdminKeys();
      if (keys.length === 0) {
        throw new UnauthorizedException("Admin keys not configured");
      }

      if (!keys.includes(adminKey)) {
        throw new UnauthorizedException("Invalid sub admin key");
      }

      return true;
    }

    // Super: optional headers; if present, both required and key must match env.
    if (adminKey || adminTier) {
      if (!adminKey || !adminTier) {
        throw new UnauthorizedException(
          "Both X-Admin-Key and X-Admin-Tier headers are required together.",
        );
      }

      if (adminTier !== "super") {
        throw new UnauthorizedException(
          `Tier mismatch: user is super, but X-Admin-Tier is ${adminTier}`,
        );
      }

      const keys = this.envAdminKeys();
      if (keys.length === 0) {
        throw new UnauthorizedException("Super admin keys not configured");
      }

      if (!keys.includes(adminKey)) {
        throw new UnauthorizedException("Invalid super admin key");
      }
    }

    return true;
  }
}
