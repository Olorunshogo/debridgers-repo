import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
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

    const hashed = await bcrypt.hash(dto.password, 12);

    const [user] = await this.db
      .insert(schema.users)
      .values({
        first_name: dto.first_name,
        last_name: dto.last_name,
        email: dto.email.toLowerCase(),
        phone: dto.phone,
        password: hashed,
        role: dto.role,
      })
      .returning();

    this.eventEmitter.emit(USER_EVENTS.CONTACT_SUBMITTED, {
      name: `${user.first_name} ${user.last_name}`,
      email: user.email,
    });

    const tokens = await this.generateTokens(user);
    await this.saveRefreshToken(user.id, tokens.refreshToken);

    return {
      message: "Registration successful",
      data: { user: this.sanitize(user), ...tokens },
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

    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) throw new UnauthorizedException("Invalid credentials");

    // Block unapproved agents from logging in
    if (user.role === "agent") {
      const [profile] = await this.db
        .select({ status: schema.agent_profiles.status })
        .from(schema.agent_profiles)
        .where(eq(schema.agent_profiles.user_id, user.id))
        .limit(1);

      if (profile && profile.status !== "approved") {
        throw new UnauthorizedException(
          "Your account is not yet approved. Please contact customer care.",
        );
      }
    }

    const tokens = await this.generateTokens(user);
    await this.saveRefreshToken(user.id, tokens.refreshToken);

    return {
      message: "Login successful",
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

    const match = await bcrypt.compare(refreshToken, user.refresh_token);
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

    if (!user) throw new NotFoundException("No account with that email");

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

    return { message: "Password reset email sent", data: null };
  }

  async resetPassword(token: string, newPassword: string) {
    const [reset] = await this.db
      .select()
      .from(schema.password_resets)
      .where(eq(schema.password_resets.token, token))
      .limit(1);

    if (!reset || reset.expires_at < new Date()) {
      throw new UnauthorizedException("Invalid or expired token");
    }

    const hashed = await bcrypt.hash(newPassword, 12);
    await this.db
      .update(schema.users)
      .set({ password: hashed })
      .where(eq(schema.users.id, reset.user_id));

    await this.db
      .delete(schema.password_resets)
      .where(eq(schema.password_resets.id, reset.id));

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
