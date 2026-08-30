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

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.id) {
      throw new UnauthorizedException("User not authenticated");
    }

    // Get admin key and tier from headers (optional for JWT-authenticated users)
    const adminKey = request.headers["x-admin-key"];
    const adminTier = request.headers["x-admin-tier"];

    // If both headers are present, validate them strictly
    if (adminKey || adminTier) {
      if (!adminKey || !adminTier) {
        throw new UnauthorizedException(
          "Both X-Admin-Key and X-Admin-Tier headers are required together.",
        );
      }

      // Validate tier format
      if (!["super", "sub"].includes(adminTier)) {
        throw new UnauthorizedException(
          'X-Admin-Tier must be "super" or "sub"',
        );
      }

      // Fetch the user
      const userRecord = await this.db
        .select()
        .from(users)
        .where(eq(users.id, user.id));

      if (userRecord.length === 0) {
        throw new UnauthorizedException("User not found");
      }

      const userObj = userRecord[0];

      // Check if user has admin access
      if (!userObj.admin_tier) {
        throw new UnauthorizedException("User does not have admin access");
      }

      // Verify tier matches
      if (userObj.admin_tier !== adminTier) {
        throw new UnauthorizedException(
          `Tier mismatch: user is ${userObj.admin_tier}, but X-Admin-Tier is ${adminTier}`,
        );
      }

      // Validate key based on tier
      if (adminTier === "super") {
        // Super admin can use either SUPER_ADMIN_KEY_1 or SUPER_ADMIN_KEY_2
        const superKey1 = this.configService.get<string>("SUPER_ADMIN_KEY_1");
        const superKey2 = this.configService.get<string>("SUPER_ADMIN_KEY_2");

        if (!superKey1 && !superKey2) {
          throw new UnauthorizedException("Super admin keys not configured");
        }

        const isValidKey =
          (superKey1 && adminKey === superKey1) ||
          (superKey2 && adminKey === superKey2);

        if (!isValidKey) {
          throw new UnauthorizedException("Invalid super admin key");
        }
      } else if (adminTier === "sub") {
        // Sub admin must have their unique admin_api_key
        if (!userObj.admin_api_key) {
          throw new UnauthorizedException("Sub admin key not set");
        }

        if (userObj.admin_api_key !== adminKey) {
          throw new UnauthorizedException("Invalid sub admin key");
        }
      }
      return true;
    }

    // No admin key headers provided - allow JWT-authenticated admin users through
    const userRecord = await this.db
      .select()
      .from(users)
      .where(eq(users.id, user.id));

    if (userRecord.length === 0) {
      throw new UnauthorizedException("User not found");
    }

    const userObj = userRecord[0];

    // For JWT auth, just check if user has admin access (admin_tier is set)
    if (!userObj.admin_tier) {
      throw new UnauthorizedException("User does not have admin access");
    }

    return true;
  }
}
