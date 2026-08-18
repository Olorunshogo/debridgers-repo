import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Req,
  UseGuards,
  UsePipes,
} from "@nestjs/common";
import { Request } from "express";
import { Throttle } from "@nestjs/throttler";
import { authThrottle } from "../../shared/throttle.config";
import {
  ApiTags,
  ApiOperation,
  ApiBody,
  ApiBearerAuth,
  ApiResponse,
} from "@nestjs/swagger";
import { AuthService } from "./auth.service";
import { ZodValidationPipe } from "../../../infrastructure/pipeline/validation.pipeline";
import { registerSchema, RegisterDto } from "./dto/register.dto";
import { loginSchema, LoginDto } from "./dto/login.dto";
import {
  forgotPasswordSchema,
  ForgotPasswordDto,
} from "./dto/forgot-password.dto";
import {
  resetPasswordSchema,
  ResetPasswordDto,
} from "./dto/reset-password.dto";
import { verifyEmailSchema, VerifyEmailDto } from "./dto/verify-email.dto";
import {
  resendVerificationSchema,
  ResendVerificationDto,
} from "./dto/resend-verification.dto";
import { RefreshGuard } from "../../shared/guards/refresh.guard";
import { AuthGuard } from "../../shared/guards/auth.guard";
import { CurrentUser } from "../../shared/decorators/current-user.decorator";
import { JwtPayload } from "../../../interfaces/users/jwt.type";

@ApiTags("Auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /*
   * Lets the signup form check a referral code before submit. Registration now
   * rejects an unknown code instead of silently attributing the buyer to admin,
   * so without this the user only finds out about a typo when signup fails.
   *
   * Throttled because a referral code is eight hex characters, well within
   * reach of a script enumerating valid codes to farm attributions.
   */
  @Get("referral/validate")
  @HttpCode(HttpStatus.OK)
  @Throttle(authThrottle(20))
  @ApiOperation({ summary: "Check whether an agent referral code is usable" })
  @ApiResponse({
    status: 200,
    description: "Validation result",
    schema: {
      example: {
        statusCode: 200,
        message: "Referral code checked",
        data: { valid: true, referrer_name: "Amina Yusuf" },
      },
    },
  })
  async validateReferralCode(@Query("code") code: string) {
    const data = await this.authService.validateReferralCode(code ?? "");
    return { message: "Referral code checked", data };
  }

  @Post("register")
  @ApiOperation({ summary: "Register a new buyer account" })
  @ApiBody({
    schema: {
      type: "object",
      required: ["first_name", "last_name", "email", "password"],
      properties: {
        first_name: { type: "string", example: "Fatima" },
        last_name: { type: "string", example: "Bello" },
        email: { type: "string", example: "fatima@example.com" },
        phone: { type: "string", example: "08098765432" },
        password: { type: "string", example: "SecurePass@123" },
        role: { type: "string", enum: ["buyer"], example: "buyer" },
        referred_by_agent_code: {
          type: "string",
          example: "DEBRIDGERS-DEFAULT",
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: "Registration successful",
    schema: {
      example: {
        statusCode: 201,
        message: "Registration successful",
        data: {
          user: {
            id: 7,
            first_name: "Fatima",
            last_name: "Bello",
            email: "fatima@example.com",
            phone: "08098765432",
            role: "buyer",
            is_email_verified: false,
            created_at: "2026-04-07T10:00:00.000Z",
          },
        },
        timestamp: "2026-04-07T10:00:00.000Z",
        version: "v1",
        path: "/api/v1/auth/register",
      },
    },
  })
  @ApiResponse({ status: 400, description: "Validation failed" })
  @ApiResponse({ status: 409, description: "Email already registered" })
  @UsePipes(new ZodValidationPipe(registerSchema))
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post("login")
  @HttpCode(HttpStatus.OK)
  @Throttle(authThrottle(5))
  @ApiOperation({ summary: "Login with email and password" })
  @ApiBody({
    schema: {
      type: "object",
      required: ["email", "password"],
      properties: {
        email: { type: "string", example: "admin@debridgers.com" },
        password: { type: "string", example: "Admin@2026!" },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: "Login successful",
    schema: {
      example: {
        statusCode: 200,
        message: "Login successful",
        data: {
          user: {
            id: 1,
            first_name: "Admin",
            last_name: "User",
            email: "admin@debridgers.com",
            role: "admin",
            is_email_verified: true,
          },
          accessToken: "eyJhbGciOiJIUzI1NiIs...",
          refreshToken: "eyJhbGciOiJIUzI1NiIs...",
        },
        timestamp: "2026-04-07T10:00:00.000Z",
        version: "v1",
        path: "/api/v1/auth/login",
      },
    },
  })
  @ApiResponse({
    status: 401,
    description:
      "Invalid credentials, email not verified, or agent not yet approved",
    schema: {
      example: {
        statusCode: 401,
        message: "Invalid credentials",
      },
    },
  })
  @UsePipes(new ZodValidationPipe(loginSchema))
  login(@Body() dto: LoginDto, @Req() req: Request) {
    return this.authService.login(dto, req);
  }

  @Post("admin/login")
  @HttpCode(HttpStatus.OK)
  @Throttle(authThrottle(3))
  @ApiOperation({ summary: "Admin login with email and password" })
  @ApiBody({
    schema: {
      type: "object",
      required: ["email", "password"],
      properties: {
        email: { type: "string", example: "admin@debridgers.com" },
        password: { type: "string", example: "Admin@2026!" },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: "Admin login successful",
    schema: {
      example: {
        statusCode: 200,
        message: "Admin login successful",
        data: {
          user: {
            id: 1,
            first_name: "Debridgers",
            last_name: "Admin",
            email: "admin@debridgers.com",
            role: "admin",
          },
          accessToken: "eyJhbGciOiJIUzI1NiIs...",
          refreshToken: "eyJhbGciOiJIUzI1NiIs...",
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: "Invalid admin credentials" })
  @UsePipes(new ZodValidationPipe(loginSchema))
  adminLogin(@Body() dto: LoginDto, @Req() req: Request) {
    return this.authService.loginAdmin(dto, req);
  }

  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth("refresh-token")
  @ApiOperation({
    summary: "Rotate tokens",
    description:
      "Send the refresh token in `Authorization: Refresh <refreshToken>` header (not Bearer).",
  })
  @ApiResponse({
    status: 200,
    description: "New token pair issued",
    schema: {
      example: {
        statusCode: 200,
        message: "Tokens refreshed",
        data: {
          accessToken: "eyJhbGciOiJIUzI1NiIs...",
          refreshToken: "eyJhbGciOiJIUzI1NiIs...",
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: "Invalid or expired refresh token" })
  @UseGuards(RefreshGuard)
  refresh(
    @CurrentUser() user: JwtPayload & { refreshToken: string },
    @Req() req: Request,
  ) {
    return this.authService.refreshTokens(
      user.sub,
      user.refreshToken,
      { device: user.device, ip_address: user.ip_address },
      req,
    );
  }

  @Post("logout")
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth("access-token")
  @ApiOperation({ summary: "Invalidate refresh token and log out" })
  @ApiResponse({
    status: 200,
    description: "Logged out",
    schema: {
      example: {
        statusCode: 200,
        message: "Logged out successfully",
        data: null,
      },
    },
  })
  @UseGuards(AuthGuard)
  logout(@CurrentUser() user: JwtPayload) {
    return this.authService.logout(user.sub);
  }

  @Post("forgot-password")
  @HttpCode(HttpStatus.OK)
  @Throttle(authThrottle(5))
  @ApiOperation({
    summary: "Request a password reset email",
    description: "Always returns 200 - prevents email enumeration.",
  })
  @ApiBody({
    schema: {
      type: "object",
      required: ["email"],
      properties: {
        email: { type: "string", example: "fatima@example.com" },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description:
      "Reset email sent (always 200 regardless of whether email exists)",
    schema: {
      example: {
        statusCode: 200,
        message: "Password reset email sent",
        data: null,
      },
    },
  })
  @UsePipes(new ZodValidationPipe(forgotPasswordSchema))
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  @Post("reset-password")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Reset password using the token from the email link",
  })
  @ApiBody({
    schema: {
      type: "object",
      required: ["token", "password"],
      properties: {
        token: { type: "string", example: "a3f8c2d1e9b74f2a..." },
        password: { type: "string", example: "NewSecurePass@456" },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: "Password updated",
    schema: {
      example: {
        statusCode: 200,
        message: "Password reset successful",
        data: null,
      },
    },
  })
  @ApiResponse({ status: 401, description: "Invalid or expired reset token" })
  @UsePipes(new ZodValidationPipe(resetPasswordSchema))
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.password);
  }

  @Post("verify-email")
  @HttpCode(HttpStatus.OK)
  @Throttle(authThrottle(5))
  @ApiOperation({ summary: "Verify account email address using OTP" })
  @ApiBody({
    schema: {
      type: "object",
      required: ["email", "otp"],
      properties: {
        email: { type: "string", example: "fatima@example.com" },
        otp: { type: "string", example: "a3f8c2d1e9b74f2a..." },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: "Email verified",
    schema: {
      example: {
        statusCode: 200,
        message: "Email verified successfully",
        data: null,
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: "Invalid, expired, or already verified OTP",
  })
  @ApiResponse({ status: 404, description: "Account not found" })
  @UsePipes(new ZodValidationPipe(verifyEmailSchema))
  verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.authService.verifyEmail(dto.email, dto.otp);
  }

  @Post("resend-otp")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Resend verification OTP" })
  @ApiBody({
    schema: {
      type: "object",
      required: ["email"],
      properties: {
        email: { type: "string", example: "fatima@example.com" },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: "Resent OTP response",
    schema: {
      example: {
        statusCode: 200,
        message: "Verification email sent if the account exists",
        data: null,
      },
    },
  })
  @UsePipes(new ZodValidationPipe(resendVerificationSchema))
  resendOtp(@Body() dto: ResendVerificationDto) {
    return this.authService.resendVerification(dto.email);
  }

  @Post("resend-verification")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Resend verification email (legacy route)" })
  @ApiBody({
    schema: {
      type: "object",
      required: ["email"],
      properties: {
        email: { type: "string", example: "fatima@example.com" },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: "Verification mail response",
    schema: {
      example: {
        statusCode: 200,
        message: "Verification email sent if the account exists",
        data: null,
      },
    },
  })
  @UsePipes(new ZodValidationPipe(resendVerificationSchema))
  resendVerification(@Body() dto: ResendVerificationDto) {
    return this.authService.resendVerification(dto.email);
  }
}
