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
import { PaymentService } from "./payment.service";
import { ZodValidationPipe } from "../../infrastructure/pipeline/validation.pipeline";
import {
  initializePaymentSchema,
  InitializePaymentDto,
} from "./dto/initialize-payment.dto";
import { AuthGuard } from "../auth/guards/auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";

@Controller("payment")
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post("initialize")
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(initializePaymentSchema))
  initialize(@Body() dto: InitializePaymentDto) {
    return this.paymentService.initialize(dto);
  }

  @Post("webhook")
  @HttpCode(HttpStatus.OK)
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
}
