import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
  UsePipes,
} from "@nestjs/common";
import { SkipThrottle } from "@nestjs/throttler";
import { PaymentService } from "./payment.service";
import { PayoutService } from "./payout.service";
import { ZodValidationPipe } from "../../../infrastructure/pipeline/validation.pipeline";
import {
  initializePaymentSchema,
  InitializePaymentDto,
} from "./dto/initialize-payment.dto";
import { AuthGuard } from "../../shared/guards/auth.guard";
import { RolesGuard } from "../../shared/guards/roles.guard";
import { Roles } from "../../shared/decorators/roles.decorator";
import { CurrentUser } from "../../shared/decorators/current-user.decorator";
import { JwtPayload } from "../../../interfaces/users/jwt.type";

@Controller("payment")
export class PaymentController {
  constructor(
    private readonly paymentService: PaymentService,
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
