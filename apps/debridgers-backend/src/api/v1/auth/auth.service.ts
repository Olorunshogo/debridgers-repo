import {
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
  BadRequestException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { JwtService } from "@nestjs/jwt";
import { NodePgDatabase } from "drizzle-orm/node-postgres";
import { eq, sql } from "drizzle-orm";
import { Request } from "express";
import * as bcrypt from "bcryptjs";
import * as crypto from "crypto";
import * as schema from "../../../infrastructure/persistence/index";
import { DATABASE_CONNECTION } from "../../../infrastructure/database/database.provider";
import { JwtPayload } from "../../../interfaces/users/jwt.type";
import { USER_EVENTS } from "../../../events/event-types/user.event.types";
import { RegisterDto, type SelfRegisterableRole } from "./dto/register.dto";
import { USER_ROLES } from "../../../interfaces/users/roles.type";
import { LoginDto } from "./dto/login.dto";
import { AuthAttemptService } from "./auth-attempt.service";
import { hashRefreshToken, refreshTokenMatches } from "./token-hash";
import { PostHogService } from "../../../infrastructure/analytics/posthog.service";
import { PaystackDvaService } from "../payment/paystack-dva.service";

/* Wrong OTP guesses allowed before the code is burned and a resend is required. */
const MAX_OTP_ATTEMPTS = 5;

/*
 * How much of the issuing request a refresh token is pinned to.
 *
 *   off    - claims are informational only
 *   device - user agent must match (the default)
 *   strict - user agent and IP must both match
 *
 * IP is not part of the default deliberately. Mobile networks and CGNAT rotate
 * addresses mid-session, so pinning to it logs real users out routinely; that
 * belongs behind an explicit opt-in for high-assurance deployments.
 */
const SESSION_BINDING = process.env.SESSION_BINDING ?? "device";

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly eventEmitter: EventEmitter2,
    private readonly authAttempt: AuthAttemptService,
    private readonly posthog: PostHogService,
    private readonly paystackDvaService: PaystackDvaService,
  ) {}

  async register(dto: RegisterDto) {
    /* Debug, not warn, and no email: registration is not a warning, and these
       lines shipped a user's address to every log sink on the hot path. */
    this.logger.debug("Register: start");

    // Run email check, referrer lookup, and password hash concurrently
    const [existing, referredByAgentId, hashed] = await Promise.all([
      this.db
        .select()
        .from(schema.users)
        .where(eq(sql`lower(${schema.users.email})`, dto.email.toLowerCase()))
        .limit(1),
      this.resolveBuyerReferrerId(dto.referred_by_agent_code),
      bcrypt.hash(dto.password, 12),
    ]);
    this.logger.debug(
      `Register: precheck done (existing=${existing.length > 0}, referrer=${
        referredByAgentId ?? "none"
      })`,
    );

    if (existing.length > 0) {
      const user = existing[0];
      if (!user.is_email_verified) {
        // Silently refresh their OTP and tell the frontend to redirect
        await this.refreshVerificationOtp(
          user.id,
          user.first_name,
          user.last_name,
          user.email,
          user.role,
        );
        throw new ConflictException({
          message: "This email is registered but not yet verified.",
          code: "UNVERIFIED_EMAIL",
        });
      }
      throw new ConflictException("Email already registered");
    }

    const verificationToken = this.generateVerificationOtp();
    const verificationExpiresAt = new Date(Date.now() + 24 * 3600 * 1000);

    const isTestMode = process.env.NODE_ENV === "test";

    const role = dto.role as SelfRegisterableRole;

    this.logger.debug("Register: opening transaction");
    const [user] = await this.db.transaction(async (tx) => {
      const [createdUser] = await tx
        .insert(schema.users)
        .values({
          first_name: dto.first_name,
          last_name: dto.last_name,
          email: dto.email.toLowerCase(),
          phone: dto.phone,
          password: hashed,
          /*
           * Always explicit. The users.role column defaults to buyer, but relying
           * on a column default while the role is caller-supplied is how you
           * silently create the wrong kind of account.
           */
          role,
          /*
           * Only buyers carry a permanent referral link to a recruiting agent.
           * resolveBuyerReferrerId already returns null when no code was given.
           */
          referred_by_agent_id:
            role === USER_ROLES.BUYER ? referredByAgentId : null,
          // Auto-verify email in test mode so e2e tests can login immediately
          is_email_verified: isTestMode,
        })
        .returning();

      this.logger.debug(`Register: user inserted (id=${createdUser.id})`);

      /*
       * Per-role setup. Kept as an explicit switch on a narrow union rather than
       * scattered ifs so the compiler flags this spot when a role is added.
       */
      if (role === USER_ROLES.AGENT) {
        /*
         * address, state, and lga are intentionally left null: they are collected
         * later in agent settings, not at signup, so one register endpoint serves
         * every role. zone_id therefore stays null until the agent supplies an
         * LGA, at which point updateProfile resolves it. See
         * docs/frontend/AuthPLAN.md phases 3 and 6.
         */
        await tx.insert(schema.agent_profiles).values({
          user_id: createdUser.id,
          status: "pending",
          referred_by_agent_id: referredByAgentId,
        });
      }

      if (role === USER_ROLES.BUYER) {
        await tx.insert(schema.buyerWallets).values({
          user_id: createdUser.id,
        });
      }

      if (!isTestMode) {
        await tx.insert(schema.email_verification).values({
          user_id: createdUser.id,
          token: verificationToken,
          expires_at: verificationExpiresAt,
        });

        // Fire-and-forget — don't block registration on email delivery
        this.eventEmitter.emit(USER_EVENTS.USER_REGISTERED, {
          name: `${createdUser.first_name} ${createdUser.last_name}`,
          email: createdUser.email,
          otp: verificationToken,
          role: createdUser.role,
        });
      }

      this.logger.debug("Register: transaction complete");
      return [createdUser];
    });

    this.logger.debug("Register: finished");

    if (role === USER_ROLES.BUYER && !isTestMode) {
      try {
        await this.paystackDvaService.createDvaForUser(user.id, {
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          phone: user.phone || "",
        });
        this.logger.debug(`Register: DVA created (user=${user.id})`);
      } catch (error) {
        /*
         * Deliberately non-fatal: a Paystack outage must not block signup. The
         * buyer lands with no account number, which blocks withdrawals, so the
         * wallet page can repair it later via ensureDvaForUser.
         */
        /* Id only. The user is findable from it, and the address does not
           need to sit in the log to make this actionable. */
        this.logger.error(
          `Failed to create DVA for buyer ${user.id}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }

    return {
      message: isTestMode
        ? "Registration successful."
        : "Registration successful. Please verify your email to continue.",
      data: { user: this.sanitize(user) },
    };
  }

  async login(dto: LoginDto, req: Request) {
    const ip = this.extractIp(req);
    const email = dto.email.toLowerCase();

    // Check if login attempts are blocked
    const attempt = await this.authAttempt.checkAttemptAllowed(email, ip);
    if (!attempt.allowed) {
      throw new UnauthorizedException(
        `Too many failed attempts. Please try again in ${Math.ceil((attempt.remainingTime || 0) / 60)} minutes.`,
      );
    }

    const [user] = await this.db
      .select()
      .from(schema.users)
      .where(eq(sql`lower(${schema.users.email})`, email))
      .limit(1);

    if (!user || !user.password) {
      await this.authAttempt.recordFailedAttempt(email, ip);
      throw new UnauthorizedException("Invalid credentials");
    }

    const passwordHash = user.password;
    const valid = await bcrypt.compare(dto.password, passwordHash);
    if (!valid) {
      await this.authAttempt.recordFailedAttempt(email, ip);
      throw new UnauthorizedException("Invalid credentials");
    }

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

    const context = this.extractRequestContext(req);
    const tokens = await this.generateTokens(user, context);
    await this.saveRefreshToken(user.id, tokens.refreshToken);

    // Reset failed attempts on successful login
    await this.authAttempt.resetAttempts(email, ip);

    this.eventEmitter.emit(USER_EVENTS.USER_LOGGED_IN, {
      name: `${user.first_name} ${user.last_name}`,
      email: user.email,
      role: user.role,
    });

    // Track login in PostHog
    this.posthog.trackLogin(user.id, user.email, user.role, ip);

    return {
      message: "Login successful",
      data: { user: this.sanitize(user), ...tokens },
    };
  }

  async loginAdmin(dto: LoginDto, req: Request) {
    const ip = this.extractIp(req);
    const email = dto.email.toLowerCase();

    // Check if login attempts are blocked (stricter for admin)
    const attempt = await this.authAttempt.checkAttemptAllowed(email, ip);
    if (!attempt.allowed) {
      throw new UnauthorizedException(
        `Too many failed attempts. Please try again in ${Math.ceil((attempt.remainingTime || 0) / 60)} minutes.`,
      );
    }

    const [user] = await this.db
      .select()
      .from(schema.users)
      .where(eq(sql`lower(${schema.users.email})`, email))
      .limit(1);

    if (!user || !user.password) {
      await this.authAttempt.recordFailedAttempt(email, ip);
      throw new UnauthorizedException("Invalid admin credentials");
    }

    const passwordHash = user.password;
    const valid = await bcrypt.compare(dto.password, passwordHash);
    if (!valid) {
      await this.authAttempt.recordFailedAttempt(email, ip);
      throw new UnauthorizedException("Invalid admin credentials");
    }

    if (user.role !== "admin") {
      await this.authAttempt.recordFailedAttempt(email, ip);
      throw new UnauthorizedException("Admin access only");
    }

    const context = this.extractRequestContext(req);
    const tokens = await this.generateTokens(user, context);
    await this.saveRefreshToken(user.id, tokens.refreshToken);

    // Reset failed attempts on successful login
    await this.authAttempt.resetAttempts(email, ip);

    // Track admin login in PostHog
    this.posthog.trackLogin(user.id, user.email, user.role, ip);

    return {
      message: "Admin login successful",
      data: { user: this.sanitize(user), ...tokens },
    };
  }

  async refreshTokens(
    userId: number,
    refreshToken: string,
    claims: { device?: string; ip_address?: string },
    req?: Request,
  ) {
    const [user] = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, userId))
      .limit(1);

    if (!user || !user.refresh_token) {
      throw new UnauthorizedException("Access denied");
    }

    if (!refreshTokenMatches(user.refresh_token, refreshToken)) {
      throw new UnauthorizedException("Access denied");
    }

    /*
     * The token has always carried device and ip_address; nothing ever checked
     * them, which made the binding decorative. Enforced here rather than in
     * AuthGuard because the refresh token is the long-lived credential worth
     * pinning - re-validating on every access-token call would cost a check per
     * request for a credential that expires in 15 minutes anyway.
     */
    const context = req ? this.extractRequestContext(req) : undefined;

    if (context) {
      this.assertSessionBinding(claims, context);
    }

    /*
     * Rotation reissues with the current request context. Previously it called
     * generateTokens with no context at all, so every refresh downgraded device
     * and ip_address to "unknown" and silently discarded the binding.
     */
    const tokens = await this.generateTokens(user, context);
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

    /*
     * A 6-digit OTP is 900k possibilities and lives for 24 hours, so without a
     * ceiling on wrong guesses the throttler is the only thing between an
     * attacker and a verified account - and that is per-IP, which a distributed
     * attempt sidesteps. Burning the OTP after MAX_OTP_ATTEMPTS forces a resend,
     * which issues a fresh code and resets the counter.
     */
    if (record.token !== otp) {
      const attempts = record.attempts + 1;

      if (attempts >= MAX_OTP_ATTEMPTS) {
        await this.db
          .delete(schema.email_verification)
          .where(eq(schema.email_verification.id, record.id));

        throw new BadRequestException(
          "Too many incorrect attempts. Please request a new OTP.",
        );
      }

      await this.db
        .update(schema.email_verification)
        .set({ attempts })
        .where(eq(schema.email_verification.id, record.id));

      throw new BadRequestException(
        `Invalid verification OTP. ${MAX_OTP_ATTEMPTS - attempts} attempt(s) remaining.`,
      );
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
    /*
     * refresh_token is cleared in the same update. A reset is what someone does
     * after losing control of their account, so leaving existing sessions alive
     * would keep the attacker signed in through the exact recovery step meant to
     * lock them out.
     */
    await this.db
      .update(schema.users)
      .set({ password: hashed, refresh_token: null })
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

  private async generateTokens(
    user: {
      id: number;
      email: string;
      first_name: string;
      last_name: string;
      role: string;
    },
    context?: {
      api_version: string;
      device: string;
      ip_address: string;
    },
  ) {
    const payload: JwtPayload = {
      sub: user.id,
      id: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      role: user.role as JwtPayload["role"],
      api_version: context?.api_version || "v1",
      device: context?.device || "unknown",
      ip_address: context?.ip_address || "unknown",
    };

    const accessSecret = this.config.get<string>("AccessJwt.secret");
    const refreshSecret = this.config.get<string>("RefreshJwt.secret");
    if (!accessSecret || !refreshSecret) {
      throw new Error(
        "JWT secrets not configured — set ACCESS_TOKEN_SECRET and REFRESH_TOKEN_SECRET",
      );
    }
    const accessExpiry =
      this.config.get<string>("AccessJwt.expiresIn") ?? "15m";
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

  /*
   * Resolve the agent who referred a buyer, from the code the buyer typed.
   *
   * Two things were wrong here and both silently mis-attributed real signups.
   *
   * It matched `referral_agent_code`, which is the code an agent gives to
   * someone joining as an AGENT. The buyer-facing code is
   * `referral_buyer_code`. The two were effectively swapped in the one place
   * buyers use them, so a buyer pasting the correct code got no attribution and
   * one pasting the recruitment code got attributed.
   *
   * And an unrecognised code fell back to the admin account rather than
   * failing. A typo permanently assigned that buyer to admin, the real referrer
   * lost the link, and nobody was told. A bad code is now a validation error the
   * user can see and fix while still on the form.
   */
  private async resolveBuyerReferrerId(
    referralCode?: string,
  ): Promise<number | null> {
    const code = referralCode?.trim();

    // No code is not an error. It means an organic signup with no referrer.
    if (!code) return null;

    const [referrer] = await this.db
      .select({
        user_id: schema.agent_profiles.user_id,
        status: schema.agent_profiles.status,
      })
      .from(schema.agent_profiles)
      .where(eq(schema.agent_profiles.referral_buyer_code, code))
      .limit(1);

    if (!referrer) {
      throw new BadRequestException({
        message:
          "That referral code is not recognised. Check it and try again.",
        code: "INVALID_REFERRAL_CODE",
        field: "referred_by_agent_code",
      });
    }

    /*
     * An unapproved agent's code must not attribute. Codes are only issued on
     * approval, so this catches an agent suspended or reverted after issue.
     */
    if (referrer.status !== "approved") {
      throw new BadRequestException({
        message: "That referral code is not active.",
        code: "INACTIVE_REFERRAL_CODE",
        field: "referred_by_agent_code",
      });
    }

    return referrer.user_id;
  }

  /*
   * Public code check, so the signup form can validate as the user types
   * instead of failing them on submit. Returns whether the code is usable and
   * who it belongs to, never anything else about that agent.
   */
  async validateReferralCode(
    code: string,
  ): Promise<{ valid: boolean; referrer_name?: string }> {
    const trimmed = code?.trim();
    if (!trimmed) return { valid: false };

    const [row] = await this.db
      .select({
        first_name: schema.users.first_name,
        last_name: schema.users.last_name,
        status: schema.agent_profiles.status,
      })
      .from(schema.agent_profiles)
      .innerJoin(
        schema.users,
        eq(schema.users.id, schema.agent_profiles.user_id),
      )
      .where(eq(schema.agent_profiles.referral_buyer_code, trimmed))
      .limit(1);

    if (!row || row.status !== "approved") return { valid: false };

    return {
      valid: true,
      referrer_name: `${row.first_name} ${row.last_name}`.trim(),
    };
  }

  private async refreshVerificationOtp(
    userId: number,
    firstName: string,
    lastName: string,
    email: string,
    role: string,
  ) {
    const token = this.generateVerificationOtp();
    const expiresAt = new Date(Date.now() + 24 * 3600 * 1000);

    await this.db
      .delete(schema.email_verification)
      .where(eq(schema.email_verification.user_id, userId));

    await this.db.insert(schema.email_verification).values({
      user_id: userId,
      token,
      expires_at: expiresAt,
    });

    this.eventEmitter.emit(USER_EVENTS.EMAIL_VERIFICATION_REQUESTED, {
      name: `${firstName} ${lastName}`,
      email,
      token,
      role,
    });
  }

  private generateVerificationOtp() {
    return crypto.randomInt(100000, 999999).toString();
  }

  private async saveRefreshToken(userId: number, token: string) {
    await this.db
      .update(schema.users)
      .set({ refresh_token: hashRefreshToken(token) })
      .where(eq(schema.users.id, userId));
  }

  private sanitize(user: typeof schema.users.$inferSelect) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, refresh_token, ...safe } = user;
    return safe;
  }

  private extractIp(req: Request): string {
    return (
      (req.headers["x-forwarded-for"] as string)?.split(",")[0].trim() ||
      req.socket.remoteAddress ||
      "unknown"
    );
  }

  /*
   * Rejects a refresh token presented from a different device than the one it
   * was issued to. Tokens minted before this shipped carry "unknown" for both
   * claims; those are let through rather than forcing a mass logout, and they
   * age out on their own within the 7 day refresh window.
   */
  private assertSessionBinding(
    claims: { device?: string; ip_address?: string },
    context: { device: string; ip_address: string },
  ): void {
    if (SESSION_BINDING === "off") return;

    const bound = (claim?: string): boolean =>
      claim !== undefined && claim !== "unknown";

    if (bound(claims.device) && claims.device !== context.device) {
      throw new UnauthorizedException(
        "Refresh token was issued to a different device. Please log in again.",
      );
    }

    if (
      SESSION_BINDING === "strict" &&
      bound(claims.ip_address) &&
      claims.ip_address !== context.ip_address
    ) {
      throw new UnauthorizedException(
        "Refresh token was issued from a different network. Please log in again.",
      );
    }
  }

  private extractRequestContext(req: Request) {
    const userAgent = req.headers["user-agent"] || "unknown";
    const ip = this.extractIp(req);
    const path = req.path || "";
    const apiVersion = path.startsWith("/api/v2") ? "v2" : "v1";

    return {
      api_version: apiVersion,
      device: userAgent,
      ip_address: ip,
    };
  }
}
