import {
  Injectable,
  BadRequestException,
  Inject,
  Logger,
} from "@nestjs/common";
import { randomBytes } from "crypto";
import { eq, and, isNull } from "drizzle-orm";
import { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as bcrypt from "bcryptjs";
import { DATABASE_CONNECTION } from "../../../../infrastructure/database/database.provider";
import { adminInvites, users } from "../../../../infrastructure/persistence";
import { EmailService } from "../../../../notification/features/email/email.service";

// === Types

/*
 * `email_sent` is false when the row work committed but the invite email did not send (dev has no SMTP);
 * the caller then hands the code and password over manually.
 * `reissued` is true when an active invite already existed and this call rotated its code and temp password rather than creating a second one.
 */
export interface CreateInviteResult {
  invite_id: number;
  invite_code: string;
  email: string;
  temp_password: string;
  expires_at: Date;
  email_sent: boolean;
  reissued: boolean;
}

@Injectable()
export class AdminInviteService {
  private readonly logger = new Logger(AdminInviteService.name);

  constructor(
    @Inject(DATABASE_CONNECTION)
    private db: NodePgDatabase<Record<string, unknown>>,
    private emailService: EmailService,
  ) {}

  /* Super admin only. Invite expires in 10 minutes. */
  async createInvite(
    email: string,
    superAdminId: number,
    desk: "buyer" | "agent" | "hr" = "buyer",
  ): Promise<CreateInviteResult> {
    const inviteCode: string = randomBytes(16).toString("hex");
    const tempPassword: string = this.generateTempPassword();
    const hashedPassword: string = await bcrypt.hash(tempPassword, 10);
    const expiresAt: Date = new Date(Date.now() + 10 * 60 * 1000);

    /*
     * The user upsert, the invite row and (previously) the email all ran with no
     * transaction and no catch. With no SMTP in dev the email threw and the
     * whole request 500'd, leaving an orphan user + invite and losing the
     * one-time code. Row work now commits atomically; the email is best-effort
     * and reported back.
     */
    const { inviteId, reissued } = await this.db.transaction(async (tx) => {
      const now: Date = new Date();

      const activeInvites = await tx
        .select()
        .from(adminInvites)
        .where(
          and(eq(adminInvites.email, email), isNull(adminInvites.used_at)),
        );

      const validInvite = activeInvites.find(
        (inv: (typeof activeInvites)[number]) => inv.expires_at > now,
      );

      const existingUser = await tx
        .select()
        .from(users)
        .where(eq(users.email, email));

      if (existingUser.length === 0) {
        await tx.insert(users).values({
          email,
          password: hashedPassword,
          role: "admin",
          admin_tier: "sub",
          admin_desk: desk,
          first_name: email.split("@")[0],
          last_name: "Admin",
          is_email_verified: true,
          must_change_password: true,
        });
      } else {
        await tx
          .update(users)
          .set({
            password: hashedPassword,
            must_change_password: true,
            admin_tier: "sub",
            admin_desk: desk,
            role: "admin",
          })
          .where(eq(users.email, email));
      }

      /*
       * A repeat call for an email that still has a live invite rotates that
       * invite's code and window in place rather than dead-ending on a 400 or
       * stacking a second active row. verifyInviteCode matches on the current
       * (email, invite_code) pair, so the previous code stops working once it is
       * overwritten.
       */
      if (validInvite) {
        const [updated] = await tx
          .update(adminInvites)
          .set({ invite_code: inviteCode, expires_at: expiresAt })
          .where(eq(adminInvites.id, validInvite.id))
          .returning();
        return { inviteId: updated.id, reissued: true };
      }

      const [created] = await tx
        .insert(adminInvites)
        .values({
          invite_code: inviteCode,
          email,
          invited_by_admin_id: superAdminId,
          expires_at: expiresAt,
        })
        .returning();
      return { inviteId: created.id, reissued: false };
    });

    let emailSent = true;
    try {
      await this.emailService.sendAdminInvite({
        email,
        invite_code: inviteCode,
        temp_password: tempPassword,
      });
    } catch (error) {
      emailSent = false;
      this.logger.warn(
        `Admin invite row created for ${email} but the email failed to send: ${
          error instanceof Error ? error.message : String(error)
        }. The code and temp password are in the response for manual hand-over.`,
      );
    }

    return {
      invite_id: inviteId,
      invite_code: inviteCode,
      email,
      temp_password: tempPassword,
      expires_at: expiresAt,
      email_sent: emailSent,
      reissued,
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

    if (inv.used_at !== null) {
      throw new BadRequestException({
        message: "Invite code has already been used",
        errors: [
          {
            field: "invite_code",
            message: "Invite code has already been used",
          },
        ],
      });
    }

    const now = new Date();
    if (inv.expires_at <= now) {
      throw new BadRequestException({
        message: "Invite code has expired",
        errors: [{ field: "invite_code", message: "Invite code has expired" }],
      });
    }

    return {
      invite_id: inv.id,
      email: inv.email,
      invited_by_admin_id: inv.invited_by_admin_id,
    };
  }

  async markInviteAsUsed(inviteId: number, newAdminId: number): Promise<void> {
    await this.db
      .update(adminInvites)
      .set({
        used_at: new Date(),
        used_by_admin_id: newAdminId,
      })
      .where(eq(adminInvites.id, inviteId));
  }

  async listInvites(): Promise<(typeof adminInvites.$inferSelect)[]> {
    return await this.db
      .select()
      .from(adminInvites)
      .orderBy(adminInvites.created_at);
  }

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

    await this.markInviteAsUsed(inv.id, adminId);
  }

  /* Called unauthenticated, from the email verification link, before the admin logs in. */
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

    const [admin] = await this.db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email));

    if (!admin) {
      throw new BadRequestException("Admin user not found");
    }

    await this.markInviteAsUsed(inv.id, admin.id);

    return admin.id;
  }
}
