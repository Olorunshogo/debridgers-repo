import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from "@nestjs/common";
import { Request } from "express";
import { AdminApiKeysService } from "../../v1/admin/admin-api-keys.service";

interface ApiKeyRequest extends Request {
  adminId?: number;
}

/**
 * SECURITY FIX: API Key authentication for admin endpoints
 *
 * Validates API key from Authorization header: "Bearer <key>"
 * More secure than JWT for service-to-service auth
 */
@Injectable()
export class ApiKeyGuard implements CanActivate {
  private readonly logger = new Logger(ApiKeyGuard.name);

  constructor(private readonly adminApiKeysService: AdminApiKeysService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<ApiKeyRequest>();
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      this.logger.warn("API Key: Missing authorization header");
      throw new UnauthorizedException("Missing API key");
    }

    // Extract key from "Bearer <key>" format
    const parts = authHeader.split(" ");
    if (parts.length !== 2 || parts[0] !== "Bearer") {
      this.logger.warn("API Key: Invalid authorization header format");
      throw new UnauthorizedException("Invalid API key format");
    }

    const apiKey = parts[1];

    // Validate key against database
    const adminId = await this.adminApiKeysService.validateApiKey(apiKey);

    if (!adminId) {
      this.logger.warn("API Key: Invalid or inactive key");
      throw new UnauthorizedException("Invalid API key");
    }

    // Attach admin ID to request for use in controllers
    request.adminId = adminId;
    return true;
  }
}
