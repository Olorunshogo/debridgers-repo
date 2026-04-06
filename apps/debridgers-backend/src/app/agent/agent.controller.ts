import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  UsePipes,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { AgentService } from "./agent.service";
import { WalletService } from "./wallet.service";
import { StockService } from "./stock.service";
import { ZodValidationPipe } from "../../infrastructure/pipeline/validation.pipeline";
import { applyAgentSchema, ApplyAgentDto } from "./dto/apply-agent.dto";
import { submitReportSchema, SubmitReportDto } from "./dto/submit-report.dto";
import { stockRequestSchema, StockRequestDto } from "./dto/stock-request.dto";
import { remitStockSchema, RemitStockDto } from "./dto/remit-stock.dto";
import { AuthGuard } from "../auth/guards/auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { JwtPayload } from "../../interfaces/users/jwt.type";

@Controller("agent")
export class AgentController {
  constructor(
    private readonly agentService: AgentService,
    private readonly walletService: WalletService,
    private readonly stockService: StockService,
  ) {}

  // ─── Public ─────────────────────────────────────────────────────────────────

  @Post("apply")
  @HttpCode(HttpStatus.CREATED)
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
  getProfile(@CurrentUser() user: JwtPayload) {
    return this.agentService.getProfile(user);
  }

  // ─── Reports & Commissions ───────────────────────────────────────────────────

  @Post("report")
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("agent")
  @UsePipes(new ZodValidationPipe(submitReportSchema))
  submitReport(@Body() dto: SubmitReportDto, @CurrentUser() user: JwtPayload) {
    return this.agentService.submitReport(dto, user);
  }

  @Get("reports")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("agent")
  getReports(@CurrentUser() user: JwtPayload) {
    return this.agentService.getReports(user);
  }

  @Get("commissions")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("agent")
  getCommissions(@CurrentUser() user: JwtPayload) {
    return this.agentService.getCommissions(user);
  }

  // ─── Wallet ──────────────────────────────────────────────────────────────────

  @Get("wallet")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("agent")
  getWallet(@CurrentUser() user: JwtPayload) {
    return this.walletService.getWallet(user);
  }

  // ─── Stock (Mode 2) ──────────────────────────────────────────────────────────

  @Post("stock/request")
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("agent")
  @UsePipes(new ZodValidationPipe(stockRequestSchema))
  requestStock(@Body() dto: StockRequestDto, @CurrentUser() user: JwtPayload) {
    return this.stockService.requestStock(dto, user);
  }

  @Post("stock/remit")
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("agent")
  @UsePipes(new ZodValidationPipe(remitStockSchema))
  remitStock(@Body() dto: RemitStockDto, @CurrentUser() user: JwtPayload) {
    return this.stockService.remitStock(dto, user);
  }

  @Get("stock")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("agent")
  getStockRequests(@CurrentUser() user: JwtPayload) {
    return this.stockService.getMyStockRequests(user);
  }
}
