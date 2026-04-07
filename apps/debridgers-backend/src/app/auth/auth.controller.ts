import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
  UsePipes,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiBody,
  ApiBearerAuth,
  ApiResponse,
} from "@nestjs/swagger";
import { AuthService } from "./auth.service";
import { ZodValidationPipe } from "../../infrastructure/pipeline/validation.pipeline";
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
import { RefreshGuard } from "./guards/refresh.guard";
import { AuthGuard } from "./guards/auth.guard";
import { CurrentUser } from "./decorators/current-user.decorator";
import { JwtPayload } from "../../interfaces/users/jwt.type";

@ApiTags("Auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("register")
  @ApiOperation({ summary: "Register a new user account" })
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
        role: {
          type: "string",
          enum: ["admin", "agent", "buyer", "company"],
          example: "buyer",
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
          accessToken: "eyJhbGciOiJIUzI1NiIs...",
          refreshToken: "eyJhbGciOiJIUzI1NiIs...",
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
    description: "Invalid credentials or agent not yet approved",
    schema: {
      example: {
        statusCode: 401,
        message: "Invalid credentials",
      },
    },
  })
  @UsePipes(new ZodValidationPipe(loginSchema))
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth("access-token")
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
  refresh(@CurrentUser() user: JwtPayload & { refreshToken: string }) {
    return this.authService.refreshTokens(user.sub, user.refreshToken);
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
  @ApiOperation({
    summary: "Request a password reset email",
    description: "Always returns 200 — prevents email enumeration.",
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
}
