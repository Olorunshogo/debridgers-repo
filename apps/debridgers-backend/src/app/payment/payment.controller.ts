import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  RawBodyRequest,
  Req,
  UseGuards,
  UsePipes,
} from "@nestjs/common";
import { Request } from "express";
import { SkipThrottle, Throttle } from "@nestjs/throttler";
import { PaymentService } from "./payment.service";
import { SafeHavenService } from "./safehaven.service";
import { PayoutService } from "./payout.service";
import { ZodValidationPipe } from "../../infrastructure/pipeline/validation.pipeline";
import {
  initializePaymentSchema,
  InitializePaymentDto,
} from "./dto/initialize-payment.dto";
import { nameEnquirySchema, NameEnquiryDto } from "./dto/name-enquiry.dto";
import {
  createVirtualAccountSchema,
  CreateVirtualAccountDto,
} from "./dto/create-virtual-account.dto";
import { AuthGuard } from "../auth/guards/auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { JwtPayload } from "../../interfaces/users/jwt.type";

@Controller("payment")
export class PaymentController {
  constructor(
    private readonly paymentService: PaymentService,
    private readonly safehavenService: SafeHavenService,
    private readonly payoutService: PayoutService,
  ) {}

  @Post("initialize")
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(initializePaymentSchema))
  initialize(@Body() dto: InitializePaymentDto) {
    return this.paymentService.initialize(dto);
  }

  @Post("webhook")
  @HttpCode(HttpStatus.OK)
  @SkipThrottle()
  webhook(
    @Body() payload: Record<string, unknown>,
    @Headers("x-paystack-signature") signature: string,
  ) {
    return this.paymentService.handleWebhook(payload, signature);
  }

  @Post("subaccount/:agentId")
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("admin")
  createSubaccount(@Param("agentId", ParseIntPipe) agentId: number) {
    return this.paymentService.createSubaccount(agentId);
  }

  // ─── SafeHaven endpoints ────────────────────────────────────────────────────

  @Get("banks")
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard)
  getBanks() {
    return this.safehavenService
      .getBanks()
      .then((banks) => ({ message: "Banks retrieved", data: banks }));
  }

  @Post("name-enquiry")
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard)
  @Throttle({ short: { ttl: 60000, limit: 10 } })
  @UsePipes(new ZodValidationPipe(nameEnquirySchema))
  nameEnquiry(@Body() dto: NameEnquiryDto) {
    return this.safehavenService
      .nameEnquiry(dto.bankCode, dto.accountNumber)
      .then((result) => ({ message: "Account verified", data: result }));
  }

  @Post("virtual-account")
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("buyer")
  @UsePipes(new ZodValidationPipe(createVirtualAccountSchema))
  createVirtualAccount(
    @Body() dto: CreateVirtualAccountDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.paymentService.createVirtualAccountForOrder(dto, user.sub);
  }

  @Post("safehaven/webhook")
  @HttpCode(HttpStatus.OK)
  @SkipThrottle()
  safehavenWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Body() payload: Record<string, unknown>,
    @Headers("x-safehaven-signature") signature: string,
  ) {
    const rawBody = req.rawBody?.toString() ?? JSON.stringify(payload);
    return this.paymentService.handleSafehavenWebhook(
      payload,
      rawBody,
      signature,
    );
  }

  /*
   * Manual trigger for the weekly sweep. Exists so a missed Friday can be
   * caught up without waiting a week, and so the job is testable against a real
   * environment rather than only ever firing on a schedule.
   *
   * Must stay declared above `payout/:withdrawalId`: Nest matches in declaration
   * order, and the parameterised route would otherwise swallow this path and
   * fail in ParseIntPipe on "run-weekly".
   */
  @Post("payout/run-weekly")
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("admin")
  runWeeklyPayouts() {
    return this.payoutService.runWeeklyPayouts();
  }

  @Post("payout/:withdrawalId")
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("admin")
  processWithdrawal(
    @Param("withdrawalId", ParseIntPipe) withdrawalId: number,
    @CurrentUser() admin: JwtPayload,
  ) {
    return this.paymentService.processWithdrawal(withdrawalId, admin.sub);
  }
}
