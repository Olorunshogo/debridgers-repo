import {
  Injectable,
  BadRequestException,
  ConflictException,
  Inject,
} from "@nestjs/common";
import { randomBytes } from "crypto";
import * as bcrypt from "bcryptjs";
import { NodePgDatabase } from "drizzle-orm/node-postgres";
import { DATABASE_CONNECTION } from "../../../../infrastructure/database/database.provider";
import { users } from "../../../../infrastructure/persistence";
import { AdminInviteService } from "../../admin/admin-invite/admin-invite.service";

interface RegisterSubAdminDto {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  invite_code: string;
}

@Injectable()
export class AdminRegisterService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private db: NodePgDatabase<Record<string, unknown>>,
    private adminInviteService: AdminInviteService,
  ) {}

  async registerSubAdmin(dto: RegisterSubAdminDto): Promise<{
    user_id: number;
    email: string;
    admin_tier: string;
    admin_api_key: string;
  }> {
    // Validate invite code and get invite details
    const inviteDetails = await this.adminInviteService.validateInviteCode(
      dto.email,
      dto.invite_code,
    );

    // Double-check email matches
    if (inviteDetails.email !== dto.email) {
      throw new BadRequestException("Email does not match invite");
    }

    // Check password length (minimum 8 chars)
    if (dto.password.length < 8) {
      throw new BadRequestException("Password must be at least 8 characters");
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    // Generate unique admin API key (32 bytes hex = 64 chars)
    const adminApiKey = randomBytes(32).toString("hex");

    try {
      // Create the new sub_admin user
      const [newUser] = await this.db
        .insert(users)
        .values({
          first_name: dto.first_name,
          last_name: dto.last_name,
          email: dto.email,
          password: hashedPassword,
          role: "admin",
          admin_tier: "sub_admin",
          admin_api_key: adminApiKey,
          is_email_verified: true, // Invite validates email ownership
        })
        .returning();

      // Mark the invite as used
      await this.adminInviteService.markInviteAsUsed(
        inviteDetails.invite_id,
        newUser.id,
      );

      return {
        user_id: newUser.id,
        email: newUser.email,
        admin_tier: newUser.admin_tier!,
        admin_api_key: adminApiKey,
      };
    } catch (error) {
      // Handle duplicate email (race condition)
      const dbError = error as { code?: string };
      if (dbError.code === "23505") {
        throw new ConflictException("Email already registered");
      }
      throw error;
    }
  }
}
