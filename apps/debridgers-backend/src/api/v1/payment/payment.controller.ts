import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Ip,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
  UsePipes,
} from "@nestjs/common";
import { SkipThrottle } from "@nestjs/throttler";
import { PaymentService } from "./payment.service";
import { PayoutService } from "./payout.service";
import { RefundService } from "./refund.service";
import { ZodValidationPipe } from "../../../infrastructure/pipeline/validation.pipeline";
import {
  initializePaymentSchema,
  InitializePaymentDto,
} from "./dto/initialize-payment.dto";
import { initiateRefundSchema, InitiateRefundDto } from "./dto/refund.dto";
import { PaymentKeysGuard } from "../../shared/guards/keys.guard";
import { CurrentUser } from "../../shared/decorators/current-user.decorator";
import { JwtPayload } from "../../../interfaces/users/jwt.type";

@Controller("payment")
export class PaymentController {
  constructor(
    private readonly paymentService: PaymentService,
    private readonly payoutService: PayoutService,
    private readonly refundService: RefundService,
  ) {}

  @Post("initialize")
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(initializePaymentSchema))
  initialize(@Body() dto: InitializePaymentDto) {
    return this.paymentService.initialize(dto);
  }

  @Post("webhook")
  @HttpCode(HttpStatus.OK)
  @SkipThrottle({ short: true })
  webhook(
    @Body() payload: Record<string, unknown>,
    @Headers("x-paystack-signature") signature: string,
    @Ip() ipAddress: string,
  ) {
    // Verify IP is from Paystack whitelist
    const PAYSTACK_IPS = ["52.31.139.75", "52.49.173.169", "52.214.14.220"];
    if (!PAYSTACK_IPS.includes(ipAddress)) {
      throw new BadRequestException("Invalid IP address");
    }

    // Verify signature
    if (!this.paymentService.verifyWebhookSignature(payload, signature)) {
      throw new BadRequestException("Invalid signature");
    }

    return this.paymentService.handleWebhook(payload, signature);
  }

  @Post("subaccount/:agentId")
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(PaymentKeysGuard)
  createSubaccount(@Param("agentId", ParseIntPipe) agentId: number) {
    return this.paymentService.createSubaccount(agentId);
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
  @UseGuards(PaymentKeysGuard)
  runWeeklyPayouts() {
    return this.payoutService.runWeeklyPayouts();
  }

  @Post("payout/:withdrawalId")
  @HttpCode(HttpStatus.OK)
  @UseGuards(PaymentKeysGuard)
  processWithdrawal(
    @Param("withdrawalId", ParseIntPipe) withdrawalId: number,
    @CurrentUser() admin: JwtPayload,
  ) {
    return this.paymentService.processWithdrawal(withdrawalId, admin.sub);
  }

  @Post("refund")
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(PaymentKeysGuard)
  @UsePipes(new ZodValidationPipe(initiateRefundSchema))
  initiateRefund(
    @Body() dto: InitiateRefundDto,
    @CurrentUser() admin: JwtPayload,
  ) {
    return this.refundService.initiateRefund(dto, admin.sub);
  }
}
