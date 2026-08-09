import {
  Injectable,
  Inject,
  BadRequestException,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { randomBytes, createHash } from "crypto";
import { NodePgDatabase } from "drizzle-orm/node-postgres";
import { eq, and } from "drizzle-orm";
import * as schema from "../../../infrastructure/persistence/index";
import { DATABASE_CONNECTION } from "../../../infrastructure/database/database.provider";

/**
 * Manages admin API keys for secure service-to-service authentication
 *
 * Each admin can have multiple API keys with different names for different environments.
 * Keys are hashed in the database and never stored in plaintext.
 */
@Injectable()
export class AdminApiKeysService {
  private readonly logger = new Logger(AdminApiKeysService.name);
  private readonly API_KEY_PREFIX = "debridgers_";
  private readonly API_KEY_LENGTH = 32; // 256 bits

  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  /**
   * Generate a new API key for an admin
   *
   * @param adminId - The admin user ID
   * @param name - Friendly name for this key (e.g., "Production", "Local Dev")
   * @returns The plain API key (only shown once) and the key ID
   */
  async createApiKey(
    adminId: number,
    name: string,
  ): Promise<{ key: string; keyId: number }> {
    if (!name || name.trim().length === 0) {
      throw new BadRequestException("Key name is required");
    }

    // Generate random bytes and prefix for identification
    const randomPart = randomBytes(this.API_KEY_LENGTH).toString("hex");
    const plainKey = `${this.API_KEY_PREFIX}${randomPart}`;
    const keyHash = this.hashKey(plainKey);

    // Store hashed key in database
    const result = await this.db
      .insert(schema.admin_api_keys)
      .values({
        admin_id: adminId,
        name: name.trim(),
        key_hash: keyHash,
        is_active: true,
      })
      .returning({ id: schema.admin_api_keys.id });

    this.logger.log(`API key created for admin ${adminId}: ${name}`);

    return {
      key: plainKey, // Only returned once at creation
      keyId: result[0].id,
    };
  }

  /**
   * Validate an API key and return the admin ID if valid
   *
   * @param plainKey - The plain API key to validate
   * @returns Admin ID if valid, null if invalid or inactive
   */
  async validateApiKey(plainKey: string): Promise<number | null> {
    if (!plainKey) return null;

    const keyHash = this.hashKey(plainKey);

    const [record] = await this.db
      .select({ admin_id: schema.admin_api_keys.admin_id })
      .from(schema.admin_api_keys)
      .where(
        and(
          eq(schema.admin_api_keys.key_hash, keyHash),
          eq(schema.admin_api_keys.is_active, true),
        ),
      )
      .limit(1);

    if (!record) {
      this.logger.warn("Invalid or inactive API key attempt");
      return null;
    }

    // Update last_used_at timestamp
    await this.db
      .update(schema.admin_api_keys)
      .set({ last_used_at: new Date() })
      .where(eq(schema.admin_api_keys.key_hash, keyHash));

    return record.admin_id;
  }

  /**
   * List all API keys for an admin (without showing the actual keys)
   */
  /*
   * Revoked keys are hidden unless explicitly asked for. Listing them beside
   * live ones with only a boolean to tell them apart invited the reader to
   * treat a revoked key as usable, which is F11.
   */
  async listApiKeys(adminId: number, isActive?: boolean) {
    const conditions = [eq(schema.admin_api_keys.admin_id, adminId)];

    conditions.push(
      eq(schema.admin_api_keys.is_active, isActive === undefined || isActive),
    );

    const keys = await this.db
      .select({
        id: schema.admin_api_keys.id,
        name: schema.admin_api_keys.name,
        is_active: schema.admin_api_keys.is_active,
        last_used_at: schema.admin_api_keys.last_used_at,
        created_at: schema.admin_api_keys.created_at,
      })
      .from(schema.admin_api_keys)
      .where(and(...conditions));

    return keys;
  }

  /**
   * Deactivate an API key (soft delete)
   */
  async deactivateApiKey(keyId: number, adminId: number): Promise<void> {
    const updated = await this.db
      .update(schema.admin_api_keys)
      .set({ is_active: false })
      /* is_active in the predicate: without it, re-revoking an already revoked
         key matched a row and reported success. */
      .where(
        and(
          eq(schema.admin_api_keys.id, keyId),
          eq(schema.admin_api_keys.admin_id, adminId),
          eq(schema.admin_api_keys.is_active, true),
        ),
      )
      .returning({ id: schema.admin_api_keys.id });

    if (updated.length === 0) {
      throw new NotFoundException("No active API key with that id");
    }

    this.logger.log(`API key ${keyId} deactivated for admin ${adminId}`);
  }

  /**
   * Hash an API key using SHA256
   *
   * @private
   */
  private hashKey(key: string): string {
    return createHash("sha256").update(key).digest("hex");
  }
}
