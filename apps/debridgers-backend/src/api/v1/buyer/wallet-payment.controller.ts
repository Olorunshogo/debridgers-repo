import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
  UsePipes,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { PaymentService } from "./payment.service";
import { BuyerRateLimitService } from "./buyer-rate-limit.service";
import { AuthGuard } from "../../shared/guards/auth.guard";
import { RolesGuard } from "../../shared/guards/roles.guard";
import { Roles } from "../../shared/decorators/roles.decorator";
import { CurrentUser } from "../../shared/decorators/current-user.decorator";
import { JwtPayload } from "../../../interfaces/users/jwt.type";
import { ZodValidationPipe } from "../../../infrastructure/pipeline/validation.pipeline";
import { z } from "zod";

const walletPaymentSchema = z.object({
  order_id: z.number().int().positive(),
  amount_kobo: z.number().int().positive(),
});

@ApiTags("Buyer - Wallet Payment")
@Controller("buyer/wallet")
@UseGuards(AuthGuard, RolesGuard)
@Roles("buyer")
@ApiBearerAuth("access-token")
export class WalletPaymentController {
  constructor(
    private readonly paymentService: PaymentService,
    private readonly rateLimitService: BuyerRateLimitService,
  ) {}

  @Post("pay-order")
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(walletPaymentSchema))
  @ApiOperation({ summary: "Pay order with wallet balance" })
  async payOrder(
    @CurrentUser() user: JwtPayload,
    @Body() dto: z.infer<typeof walletPaymentSchema>,
  ) {
    const paymentRateLimit = await this.rateLimitService.checkPaymentAttempt(
      user.sub,
      dto.order_id,
    );

    if (!paymentRateLimit.allowed) {
      return {
        statusCode: 429,
        message: `Too many payment attempts. Try again in ${paymentRateLimit.resetIn} seconds`,
      };
    }

    const result = await this.paymentService.payWithWallet(
      user.sub,
      dto.order_id,
      dto.amount_kobo,
    );

    return {
      statusCode: 200,
      message: "Wallet payment successful",
      data: result,
    };
  }
}
