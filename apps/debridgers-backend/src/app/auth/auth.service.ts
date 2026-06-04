import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
  BadRequestException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { JwtService } from "@nestjs/jwt";
import { NodePgDatabase } from "drizzle-orm/node-postgres";
import { eq, sql } from "drizzle-orm";
import * as bcrypt from "bcryptjs";
import * as crypto from "crypto";
import * as schema from "../../infrastructure/persistence/index";
import { DATABASE_CONNECTION } from "../../infrastructure/database/database.provider";
import { JwtPayload } from "../../interfaces/users/jwt.type";
import { USER_EVENTS } from "../../events/event-types/user.event.types";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";

@Injectable()
export class AuthService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.db
      .select()
      .from(schema.users)
      .where(eq(sql`lower(${schema.users.email})`, dto.email.toLowerCase()))
      .limit(1);

    if (existing.length > 0) {
      throw new ConflictException("Email already registered");
    }

    const referredByAgentId = await this.resolveBuyerReferrerId(
      dto.referred_by_agent_code,
    );

    const hashed = await bcrypt.hash(dto.password, 12);

    const verificationToken = this.generateVerificationOtp();
    const verificationExpiresAt = new Date(Date.now() + 24 * 3600 * 1000);

    const isTestMode = process.env.NODE_ENV === "test";

    const [user] = await this.db.transaction(async (tx) => {
      const [createdUser] = await tx
        .insert(schema.users)
        .values({
          first_name: dto.first_name,
          last_name: dto.last_name,
          email: dto.email.toLowerCase(),
          phone: dto.phone,
          password: hashed,
          role: "buyer",
          referred_by_agent_id: referredByAgentId,
          // Auto-verify email in test mode so e2e tests can login immediately
          is_email_verified: isTestMode,
        })
        .returning();

      if (!isTestMode) {
        await tx.insert(schema.email_verification).values({
          user_id: createdUser.id,
          token: verificationToken,
          expires_at: verificationExpiresAt,
        });

        await this.eventEmitter.emitAsync(USER_EVENTS.USER_REGISTERED, {
          name: `${createdUser.first_name} ${createdUser.last_name}`,
          email: createdUser.email,
          otp: verificationToken,
          role: createdUser.role,
        });
      }

      return [createdUser];
    });

    return {
      message: isTestMode
        ? "Registration successful."
        : "Registration successful. Please verify your email to continue.",
      data: { user: this.sanitize(user) },
    };
  }

  async login(dto: LoginDto) {
    const [user] = await this.db
      .select()
      .from(schema.users)
      .where(eq(sql`lower(${schema.users.email})`, dto.email.toLowerCase()))
      .limit(1);

    if (!user || !user.password) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const passwordHash = user.password;
    const valid = await bcrypt.compare(dto.password, passwordHash);
    if (!valid) throw new UnauthorizedException("Invalid credentials");

    // For agents: check approval status first (before email verification)
    if (user.role === "agent") {
      const [profile] = await this.db
        .select({ status: schema.agent_profiles.status })
        .from(schema.agent_profiles)
        .where(eq(schema.agent_profiles.user_id, user.id))
        .limit(1);

      if (!profile || profile.status === "pending") {
        throw new UnauthorizedException(
          "Your application is not yet approved. Please wait for admin review.",
        );
      }

      if (profile.status === "rejected" || profile.status === "suspended") {
        throw new UnauthorizedException(
          "Your application has been rejected or suspended. Please contact customer care.",
        );
      }
    }

    if (!user.is_email_verified) {
      throw new UnauthorizedException(
        "Please verify your email before logging in.",
      );
    }

    const tokens = await this.generateTokens(user);
    await this.saveRefreshToken(user.id, tokens.refreshToken);

    this.eventEmitter.emit(USER_EVENTS.USER_LOGGED_IN, {
      name: `${user.first_name} ${user.last_name}`,
      email: user.email,
      role: user.role,
    });

    return {
      message: "Login successful",
      data: { user: this.sanitize(user), ...tokens },
    };
  }

  async loginAdmin(dto: LoginDto) {
    const [user] = await this.db
      .select()
      .from(schema.users)
      .where(eq(sql`lower(${schema.users.email})`, dto.email.toLowerCase()))
      .limit(1);

    if (!user || !user.password) {
      throw new UnauthorizedException("Invalid admin credentials");
    }

    const passwordHash = user.password;
    const valid = await bcrypt.compare(dto.password, passwordHash);
    if (!valid) throw new UnauthorizedException("Invalid admin credentials");

    if (user.role !== "admin") {
      throw new UnauthorizedException("Admin access only");
    }

    const tokens = await this.generateTokens(user);
    await this.saveRefreshToken(user.id, tokens.refreshToken);

    return {
      message: "Admin login successful",
      data: { user: this.sanitize(user), ...tokens },
    };
  }

  async refreshTokens(userId: number, refreshToken: string) {
    const [user] = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, userId))
      .limit(1);

    if (!user || !user.refresh_token) {
      throw new UnauthorizedException("Access denied");
    }

    const tokenHash = user.refresh_token;
    const match = await bcrypt.compare(refreshToken, tokenHash);
    if (!match) throw new UnauthorizedException("Access denied");

    const tokens = await this.generateTokens(user);
    await this.saveRefreshToken(user.id, tokens.refreshToken);

    return { message: "Tokens refreshed", data: tokens };
  }

  async logout(userId: number) {
    await this.db
      .update(schema.users)
      .set({ refresh_token: null })
      .where(eq(schema.users.id, userId));
    return { message: "Logged out successfully", data: null };
  }

  async forgotPassword(email: string) {
    const [user] = await this.db
      .select()
      .from(schema.users)
      .where(eq(sql`lower(${schema.users.email})`, email.toLowerCase()))
      .limit(1);

    if (user) {
      const token = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 3600 * 1000);

      await this.db
        .delete(schema.password_resets)
        .where(eq(schema.password_resets.user_id, user.id));

      await this.db.insert(schema.password_resets).values({
        user_id: user.id,
        token,
        expires_at: expiresAt,
      });

      this.eventEmitter.emit(USER_EVENTS.PASSWORD_RESET_REQUESTED, {
        name: `${user.first_name} ${user.last_name}`,
        email: user.email,
        token,
      });
    }

    return { message: "Password reset email sent", data: null };
  }

  async verifyEmail(email: string, otp: string) {
    const [user] = await this.db
      .select()
      .from(schema.users)
      .where(eq(sql`lower(${schema.users.email})`, email.toLowerCase()))
      .limit(1);

    if (!user) {
      throw new NotFoundException("Account not found");
    }

    if (user.is_email_verified) {
      throw new BadRequestException("Email is already verified");
    }

    const [record] = await this.db
      .select()
      .from(schema.email_verification)
      .where(eq(schema.email_verification.user_id, user.id))
      .limit(1);

    if (!record) {
      throw new BadRequestException(
        "Verification OTP not found. Please resend the OTP.",
      );
    }

    if (record.expires_at < new Date()) {
      throw new BadRequestException(
        "Verification OTP has expired. Please resend the OTP.",
      );
    }

    if (record.token !== otp) {
      throw new BadRequestException("Invalid verification OTP");
    }

    await this.db
      .update(schema.users)
      .set({ is_email_verified: true })
      .where(eq(schema.users.id, record.user_id));

    await this.db
      .delete(schema.email_verification)
      .where(eq(schema.email_verification.user_id, record.user_id));

    const tokens = await this.generateTokens(user);
    await this.saveRefreshToken(user.id, tokens.refreshToken);

    return { message: "Email verified successfully", data: tokens };
  }

  async resendVerification(email: string) {
    const [user] = await this.db
      .select()
      .from(schema.users)
      .where(eq(sql`lower(${schema.users.email})`, email.toLowerCase()))
      .limit(1);

    if (user && !user.is_email_verified) {
      const verificationToken = this.generateVerificationOtp();
      const verificationExpiresAt = new Date(Date.now() + 24 * 3600 * 1000);

      await this.db
        .delete(schema.email_verification)
        .where(eq(schema.email_verification.user_id, user.id));

      await this.db.insert(schema.email_verification).values({
        user_id: user.id,
        token: verificationToken,
        expires_at: verificationExpiresAt,
      });

      this.eventEmitter.emit(USER_EVENTS.EMAIL_VERIFICATION_REQUESTED, {
        name: `${user.first_name} ${user.last_name}`,
        email: user.email,
        token: verificationToken,
        role: user.role,
      });
    }

    return {
      message: "Verification email sent if the account exists",
      data: null,
    };
  }

  async resetPassword(token: string, newPassword: string) {
    const [reset] = await this.db
      .select()
      .from(schema.password_resets)
      .where(eq(schema.password_resets.token, token))
      .limit(1);

    if (!reset || reset.expires_at < new Date()) {
      throw new BadRequestException("Invalid or expired reset token");
    }

    const [user] = await this.db
      .select({
        first_name: schema.users.first_name,
        last_name: schema.users.last_name,
        email: schema.users.email,
      })
      .from(schema.users)
      .where(eq(schema.users.id, reset.user_id))
      .limit(1);

    const hashed = await bcrypt.hash(newPassword, 12);
    await this.db
      .update(schema.users)
      .set({ password: hashed })
      .where(eq(schema.users.id, reset.user_id));

    await this.db
      .delete(schema.password_resets)
      .where(eq(schema.password_resets.id, reset.id));

    if (user) {
      this.eventEmitter.emit(USER_EVENTS.PASSWORD_RESET_COMPLETED, {
        name: `${user.first_name} ${user.last_name}`,
        email: user.email,
      });
    }

    return { message: "Password reset successful", data: null };
  }

  private async generateTokens(user: {
    id: number;
    email: string;
    role: string;
  }) {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role as JwtPayload["role"],
    };

    const accessSecret =
      this.config.get<string>("AccessJwt.secret") ?? "fallback_access";
    const accessExpiry =
      this.config.get<string>("AccessJwt.expiresIn") ?? "15m";
    const refreshSecret =
      this.config.get<string>("RefreshJwt.secret") ?? "fallback_refresh";
    const refreshExpiry =
      this.config.get<string>("RefreshJwt.expiresIn") ?? "7d";

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: accessSecret,
        expiresIn:
          accessExpiry as import("@nestjs/jwt").JwtSignOptions["expiresIn"],
      }),
      this.jwtService.signAsync(payload, {
        secret: refreshSecret,
        expiresIn:
          refreshExpiry as import("@nestjs/jwt").JwtSignOptions["expiresIn"],
      }),
    ]);

    return { accessToken, refreshToken };
  }

  private async resolveBuyerReferrerId(referralCode?: string) {
    if (referralCode) {
      const [recruiterProfile] = await this.db
        .select({ user_id: schema.agent_profiles.user_id })
        .from(schema.agent_profiles)
        .where(eq(schema.agent_profiles.referral_agent_code, referralCode))
        .limit(1);

      if (recruiterProfile) {
        return recruiterProfile.user_id;
      }
    }

    const adminEmail =
      this.config.get<string>("ADMIN_EMAIL") ?? "admin@debridgers.com";
    const [defaultReferrer] = await this.db
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(eq(sql`lower(${schema.users.email})`, adminEmail.toLowerCase()))
      .limit(1);

    return defaultReferrer?.id ?? null;
  }

  private generateVerificationOtp() {
    return crypto.randomInt(100000, 999999).toString();
  }

  private async saveRefreshToken(userId: number, token: string) {
    const hashed = await bcrypt.hash(token, 10);
    await this.db
      .update(schema.users)
      .set({ refresh_token: hashed })
      .where(eq(schema.users.id, userId));
  }

  private sanitize(user: typeof schema.users.$inferSelect) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, refresh_token, ...safe } = user;
    return safe;
  }
}
