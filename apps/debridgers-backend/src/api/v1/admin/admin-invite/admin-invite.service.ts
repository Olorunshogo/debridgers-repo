import { Injectable, BadRequestException, Inject } from "@nestjs/common";
import { randomBytes } from "crypto";
import { eq, and, isNull } from "drizzle-orm";
import { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as bcrypt from "bcryptjs";
import { DATABASE_CONNECTION } from "../../../../infrastructure/database/database.provider";
import { adminInvites, users } from "../../../../infrastructure/persistence";
import { EmailService } from "../../../../notification/features/email/email.service";

@Injectable()
export class AdminInviteService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private db: NodePgDatabase<Record<string, unknown>>,
    private emailService: EmailService,
  ) {}

  /**
   * Create an invite for a new sub_admin
   * Super admin only. Generates temp password and creates admin account.
   * Invite expires in 10 minutes.
   */
  async createInvite(
    email: string,
    superAdminId: number,
  ): Promise<{
    invite_id: number;
    invite_code: string;
    email: string;
    temp_password: string;
    expires_at: Date;
  }> {
    // Check if there's an active (unused, non-expired) invite for this email
    const activeInvite = await this.db
      .select()
      .from(adminInvites)
      .where(and(eq(adminInvites.email, email), isNull(adminInvites.used_at)));

    // Filter in memory for expiry check
    const now = new Date();
    const validInvite = activeInvite.find(
      (inv: (typeof activeInvite)[0]) => inv.expires_at > now,
    );

    if (validInvite) {
      throw new BadRequestException(
        "Active invite already exists for this email",
      );
    }

    // Check if user exists
    const existingUser = await this.db
      .select()
      .from(users)
      .where(eq(users.email, email));

    // Generate 32-character random invite code and temporary password
    const inviteCode = randomBytes(16).toString("hex");
    const tempPassword = this.generateTempPassword();
    const hashedPassword = await bcrypt.hash(tempPassword, 10);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

    // Create or update admin account with new password
    if (existingUser.length === 0) {
      // Create new admin account
      await this.db
        .insert(users)
        .values({
          email,
          password: hashedPassword,
          role: "admin",
          admin_tier: "sub",
          first_name: email.split("@")[0],
          last_name: "Admin",
          is_email_verified: true,
          must_change_password: true,
        })
        .returning();
    } else {
      // Update password for existing user (allows re-inviting with new temp password)
      await this.db
        .update(users)
        .set({
          password: hashedPassword,
          must_change_password: true,
        })
        .where(eq(users.email, email));
    }

    // Create the invite record
    const [created] = await this.db
      .insert(adminInvites)
      .values({
        invite_code: inviteCode,
        email,
        invited_by_admin_id: superAdminId,
        expires_at: expiresAt,
      })
      .returning();

    // Send invite email with temp password
    await this.emailService.sendAdminInvite({
      email,
      invite_code: inviteCode,
      temp_password: tempPassword,
    });

    return {
      invite_id: created.id,
      invite_code: inviteCode,
      email,
      temp_password: tempPassword,
      expires_at: expiresAt,
    };
  }

  private generateTempPassword(): string {
    const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const lowercase = "abcdefghijklmnopqrstuvwxyz";
    const numbers = "0123456789";
    const symbols = "!@#$%";

    const chars = uppercase + lowercase + numbers + symbols;
    let password = "";
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }

  /**
   * Validate an invite code and return its details
   * Used during registration to verify the invite is valid
   */
  async validateInviteCode(
    email: string,
    inviteCode: string,
  ): Promise<{
    invite_id: number;
    email: string;
    invited_by_admin_id: number;
  }> {
    const invite = await this.db
      .select()
      .from(adminInvites)
      .where(
        and(
          eq(adminInvites.email, email),
          eq(adminInvites.invite_code, inviteCode),
        ),
      );

    if (invite.length === 0) {
      throw new BadRequestException("Invalid invite code or email");
    }

    const inv = invite[0];

    // Check if already used
    if (inv.used_at !== null) {
      throw new BadRequestException("Invite code has already been used");
    }

    // Check if expired
    const now = new Date();
    if (inv.expires_at <= now) {
      throw new BadRequestException("Invite code has expired");
    }

    return {
      invite_id: inv.id,
      email: inv.email,
      invited_by_admin_id: inv.invited_by_admin_id,
    };
  }

  /**
   * Mark an invite as used after successful registration
   */
  async markInviteAsUsed(inviteId: number, newAdminId: number): Promise<void> {
    await this.db
      .update(adminInvites)
      .set({
        used_at: new Date(),
        used_by_admin_id: newAdminId,
      })
      .where(eq(adminInvites.id, inviteId));
  }

  /**
   * List all invites (used and pending)
   */
  async listInvites(): Promise<(typeof adminInvites.$inferSelect)[]> {
    return await this.db
      .select()
      .from(adminInvites)
      .orderBy(adminInvites.created_at);
  }

  /**
   * Verify invite code after admin logs in
   * Checks if the code matches the email and marks invite as used
   */
  async verifyInviteCode(
    email: string,
    inviteCode: string,
    adminId: number,
  ): Promise<void> {
    const invite = await this.db
      .select()
      .from(adminInvites)
      .where(
        and(
          eq(adminInvites.email, email),
          eq(adminInvites.invite_code, inviteCode),
        ),
      );

    if (invite.length === 0) {
      throw new BadRequestException("Invalid invite code");
    }

    const inv = invite[0];

    if (inv.used_at !== null) {
      throw new BadRequestException("Invite code has already been used");
    }

    const now = new Date();
    if (inv.expires_at <= now) {
      throw new BadRequestException("Invite code has expired");
    }

    // Mark invite as used
    await this.markInviteAsUsed(inv.id, adminId);
  }

  /**
   * Verify invite code BEFORE login (unauthenticated)
   * Called from email verification link
   * Returns admin_id if verification succeeds
   */
  async verifyInviteCodeUnauthenticated(
    email: string,
    inviteCode: string,
  ): Promise<number> {
    const invite = await this.db
      .select()
      .from(adminInvites)
      .where(
        and(
          eq(adminInvites.email, email),
          eq(adminInvites.invite_code, inviteCode),
        ),
      );

    if (invite.length === 0) {
      throw new BadRequestException("Invalid invite code or email");
    }

    const inv = invite[0];

    if (inv.used_at !== null) {
      throw new BadRequestException("Invite code has already been used");
    }

    const now = new Date();
    if (inv.expires_at <= now) {
      throw new BadRequestException("Invite code has expired");
    }

    // Get the admin user
    const [admin] = await this.db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email));

    if (!admin) {
      throw new BadRequestException("Admin user not found");
    }

    // Mark invite as used
    await this.markInviteAsUsed(inv.id, admin.id);

    return admin.id;
  }
}
