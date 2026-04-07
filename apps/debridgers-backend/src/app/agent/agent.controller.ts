import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiBody,
  ApiBearerAuth,
  ApiConsumes,
  ApiResponse,
} from "@nestjs/swagger";
import {
  FileInterceptor,
  FileFieldsInterceptor,
} from "@nestjs/platform-express";
import { AgentService } from "./agent.service";
import { WalletService } from "./wallet.service";
import { StockService } from "./stock.service";
import { KycService } from "./kyc.service";
import { ZodValidationPipe } from "../../infrastructure/pipeline/validation.pipeline";
import { applyAgentSchema, ApplyAgentDto } from "./dto/apply-agent.dto";
import { submitReportSchema, SubmitReportDto } from "./dto/submit-report.dto";
import { stockRequestSchema, StockRequestDto } from "./dto/stock-request.dto";
import { remitStockSchema, RemitStockDto } from "./dto/remit-stock.dto";
import { submitKycSchema, SubmitKycDto } from "./dto/submit-kyc.dto";
import { AuthGuard } from "../auth/guards/auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { JwtPayload } from "../../interfaces/users/jwt.type";

@ApiTags("Agent")
@Controller("agent")
export class AgentController {
  constructor(
    private readonly agentService: AgentService,
    private readonly walletService: WalletService,
    private readonly stockService: StockService,
    private readonly kycService: KycService,
  ) {}

  // ─── Public ─────────────────────────────────────────────────────────────────

  @Post("apply")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: "Submit an agent application (public)",
    description:
      "Creates an agent account with status `pending`. Admin must approve before the agent can log in.",
  })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      required: [
        "first_name",
        "email",
        "phone",
        "lga",
        "address",
        "password",
        "confirm_password",
      ],
      properties: {
        first_name: { type: "string", example: "Amina" },
        last_name: { type: "string", example: "Yusuf" },
        email: { type: "string", example: "amina@example.com" },
        phone: { type: "string", example: "08012345678" },
        lga: { type: "string", example: "Kaduna North" },
        address: { type: "string", example: "12 Barnawa Market Road, Kaduna" },
        password: { type: "string", example: "Password@123" },
        confirm_password: { type: "string", example: "Password@123" },
        referred_by_agent_code: { type: "string", example: "AGENT-A3F2B1C9" },
        cv: { type: "string", format: "binary" },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: "Application submitted successfully",
    schema: {
      example: {
        statusCode: 201,
        message:
          "Application submitted. We'll review and get back to you within 48 hours.",
        data: { id: 5 },
        timestamp: "2026-04-07T10:00:00.000Z",
        version: "v1",
        path: "/api/v1/agent/apply",
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: "Validation failed / passwords don't match",
  })
  @ApiResponse({ status: 409, description: "Email already registered" })
  @UseInterceptors(FileInterceptor("cv"))
  async apply(@Body() body: unknown, @UploadedFile() cv?: Express.Multer.File) {
    const dto = new ZodValidationPipe(applyAgentSchema).transform(body);
    const cvUrl = (cv as (Express.Multer.File & { path?: string }) | undefined)
      ?.path;
    return this.agentService.apply(dto as ApplyAgentDto, cvUrl);
  }

  // ─── Profile ─────────────────────────────────────────────────────────────────

  @Get("me")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("agent")
  @ApiBearerAuth("access-token")
  @ApiOperation({ summary: "Get agent profile and dashboard" })
  @ApiResponse({
    status: 200,
    description: "Profile retrieved",
    schema: {
      example: {
        statusCode: 200,
        message: "Profile retrieved",
        data: {
          id: 5,
          first_name: "Amina",
          last_name: "Yusuf",
          email: "amina@example.com",
          phone: "08012345678",
          role: "agent",
          status: "approved",
          kyc_status: "approved",
          lga: "Kaduna North",
          address: "12 Barnawa Market Road, Kaduna",
          target: 50,
          referral_buyer_code: "BUYER-A3F2B1C9",
          referral_agent_code: "AGENT-A3F2B1C9",
          is_state_manager: false,
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  getProfile(@CurrentUser() user: JwtPayload) {
    return this.agentService.getProfile(user);
  }

  // ─── Reports & Commissions ───────────────────────────────────────────────────

  @Post("report")
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("agent")
  @ApiBearerAuth("access-token")
  @ApiOperation({ summary: "Submit a sales report" })
  @ApiBody({
    schema: {
      type: "object",
      required: ["pages_sold", "amount"],
      properties: {
        pages_sold: { type: "integer", example: 5 },
        amount: { type: "number", example: 75000 },
        notes: {
          type: "string",
          example: "Sold 5 packs to caterers at Barnawa Market",
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: "Report submitted and commission recorded",
    schema: {
      example: {
        statusCode: 201,
        message: "Report submitted successfully",
        data: { report_id: 12, commission_earned: 22500 },
      },
    },
  })
  submitReport(
    @Body(new ZodValidationPipe(submitReportSchema)) dto: SubmitReportDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.agentService.submitReport(dto, user);
  }

  @Get("reports")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("agent")
  @ApiBearerAuth("access-token")
  @ApiOperation({ summary: "Get all my submitted sales reports" })
  @ApiResponse({
    status: 200,
    description: "Reports retrieved",
    schema: {
      example: {
        statusCode: 200,
        message: "Reports retrieved",
        data: [
          {
            id: 12,
            agent_id: 5,
            pages_sold: 5,
            amount: "75000.00",
            notes: "Sold 5 packs to caterers at Barnawa Market",
            created_at: "2026-04-07T09:00:00.000Z",
          },
        ],
      },
    },
  })
  getReports(@CurrentUser() user: JwtPayload) {
    return this.agentService.getReports(user);
  }

  @Get("commissions")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("agent")
  @ApiBearerAuth("access-token")
  @ApiOperation({ summary: "Get all my commission records" })
  @ApiResponse({
    status: 200,
    description: "Commissions retrieved",
    schema: {
      example: {
        statusCode: 200,
        message: "Commissions retrieved",
        data: [
          {
            id: 8,
            agent_id: 5,
            order_id: 22,
            type: "buyer_referral",
            amount: "2000",
            status: "pending",
            paid_at: null,
            created_at: "2026-04-07T10:00:00.000Z",
          },
        ],
      },
    },
  })
  getCommissions(@CurrentUser() user: JwtPayload) {
    return this.agentService.getCommissions(user);
  }

  // ─── Wallet ──────────────────────────────────────────────────────────────────

  @Get("wallet")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("agent")
  @ApiBearerAuth("access-token")
  @ApiOperation({
    summary: "Get my wallet balance",
    description: "Amounts in kobo. ₦1 = 100 kobo. e.g. 250000 = ₦2,500.",
  })
  @ApiResponse({
    status: 200,
    description: "Wallet retrieved",
    schema: {
      example: {
        statusCode: 200,
        message: "Wallet retrieved",
        data: {
          id: 1,
          agent_id: 5,
          available_balance: 250000,
          pending_balance: 50000,
          updated_at: "2026-04-07T10:00:00.000Z",
        },
      },
    },
  })
  getWallet(@CurrentUser() user: JwtPayload) {
    return this.walletService.getWallet(user);
  }

  // ─── Stock ───────────────────────────────────────────────────────────────────

  @Post("stock/request")
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("agent")
  @ApiBearerAuth("access-token")
  @ApiOperation({
    summary: "Request stock packs from the warehouse",
    description: "Requires KYC approved. Cost per pack: ₦1,300 (130,000 kobo).",
  })
  @ApiBody({
    schema: {
      type: "object",
      required: ["quantity"],
      properties: {
        quantity: { type: "integer", minimum: 1, example: 10 },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: "Stock request created",
    schema: {
      example: {
        statusCode: 201,
        message: "Stock request submitted",
        data: {
          id: 3,
          quantity: 10,
          amount_to_remit: 1300000,
          status: "pending",
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: "KYC not approved or agent not approved",
    schema: {
      example: {
        statusCode: 400,
        message: "KYC verification required before requesting stock",
      },
    },
  })
  requestStock(
    @Body(new ZodValidationPipe(stockRequestSchema)) dto: StockRequestDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.stockService.requestStock(dto, user);
  }

  @Post("stock/remit")
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("agent")
  @ApiBearerAuth("access-token")
  @ApiOperation({
    summary: "Remit payment against a fulfilled stock request",
    description: "Partial remittances allowed. Multiple calls accumulate.",
  })
  @ApiBody({
    schema: {
      type: "object",
      required: ["stock_request_id", "amount_remitted"],
      properties: {
        stock_request_id: { type: "integer", example: 3 },
        amount_remitted: {
          type: "integer",
          example: 650000,
          description: "Amount in kobo (e.g. 650000 = ₦6,500)",
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: "Remittance recorded",
    schema: {
      example: {
        statusCode: 200,
        message: "Remittance recorded",
        data: {
          stock_request_id: 3,
          amount_remitted: 650000,
          amount_to_remit: 1300000,
          outstanding: 650000,
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: "Not fulfilled yet or overpayment" })
  @ApiResponse({ status: 404, description: "Stock request not found" })
  remitStock(
    @Body(new ZodValidationPipe(remitStockSchema)) dto: RemitStockDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.stockService.remitStock(dto, user);
  }

  @Get("stock")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("agent")
  @ApiBearerAuth("access-token")
  @ApiOperation({
    summary: "Get all my stock requests with remittance progress",
  })
  @ApiResponse({
    status: 200,
    description: "Stock requests retrieved",
    schema: {
      example: {
        statusCode: 200,
        message: "Stock requests retrieved",
        data: [
          {
            id: 3,
            quantity: 10,
            status: "fulfilled",
            amount_to_remit: 1300000,
            amount_remitted: 650000,
            fulfilled_at: "2026-04-07T12:00:00.000Z",
            created_at: "2026-04-07T09:00:00.000Z",
          },
        ],
      },
    },
  })
  getStockRequests(@CurrentUser() user: JwtPayload) {
    return this.stockService.getMyStockRequests(user);
  }

  // ─── KYC ─────────────────────────────────────────────────────────────────────

  @Post("kyc")
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("agent")
  @ApiBearerAuth("access-token")
  @ApiOperation({
    summary: "Submit KYC documents",
    description:
      "Multipart upload. Agent must be approved first. Required before requesting stock.",
  })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      required: [
        "id_type",
        "bank_name",
        "bank_account_number",
        "bank_account_name",
        "id_front",
        "id_selfie",
      ],
      properties: {
        id_type: {
          type: "string",
          enum: ["NIN", "Passport", "Drivers License"],
          example: "NIN",
        },
        bank_name: { type: "string", example: "GTBank" },
        bank_account_number: { type: "string", example: "0123456789" },
        bank_account_name: { type: "string", example: "Amina Yusuf" },
        id_front: { type: "string", format: "binary" },
        id_selfie: { type: "string", format: "binary" },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: "KYC submitted successfully",
    schema: {
      example: {
        statusCode: 200,
        message:
          "KYC submitted successfully. We will review and get back to you.",
        data: null,
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: "Application not approved / already submitted / missing files",
  })
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: "id_front", maxCount: 1 },
      { name: "id_selfie", maxCount: 1 },
    ]),
  )
  async submitKyc(
    @Body() body: unknown,
    @UploadedFiles()
    files: {
      id_front?: Express.Multer.File[];
      id_selfie?: Express.Multer.File[];
    },
    @CurrentUser() user: JwtPayload,
  ) {
    const dto = new ZodValidationPipe(submitKycSchema).transform(
      body,
    ) as SubmitKycDto;
    return this.kycService.submitKyc(dto, user, {
      id_front: (
        files.id_front?.[0] as
          | (Express.Multer.File & { path?: string })
          | undefined
      )?.path,
      id_selfie: (
        files.id_selfie?.[0] as
          | (Express.Multer.File & { path?: string })
          | undefined
      )?.path,
    });
  }

  @Get("kyc")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("agent")
  @ApiBearerAuth("access-token")
  @ApiOperation({ summary: "Get my KYC status and rejection reason (if any)" })
  @ApiResponse({
    status: 200,
    description: "KYC status retrieved",
    schema: {
      example: {
        statusCode: 200,
        message: "KYC status retrieved",
        data: {
          kyc_status: "submitted",
          kyc_rejection_reason: null,
          id_type: "NIN",
          bank_name: "GTBank",
          bank_account_name: "Amina Yusuf",
        },
      },
    },
  })
  getKycStatus(@CurrentUser() user: JwtPayload) {
    return this.kycService.getKycStatus(user);
  }
}
