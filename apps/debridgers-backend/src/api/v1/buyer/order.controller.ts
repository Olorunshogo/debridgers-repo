import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { OrderService } from "./order.service";
import { PaymentService } from "./payment.service";
import { BuyerRateLimitService } from "./buyer-rate-limit.service";
import { EmailService } from "../../../notification/features/email/email.service";
import { AuthGuard } from "../../shared/guards/auth.guard";
import { RolesGuard } from "../../shared/guards/roles.guard";
import { Roles } from "../../shared/decorators/roles.decorator";
import { CurrentUser } from "../../shared/decorators/current-user.decorator";
import { JwtPayload } from "../../../interfaces/users/jwt.type";
import { ZodValidationPipe } from "../../../infrastructure/pipeline/validation.pipeline";
import { z } from "zod";

const payOrderSchema = z.object({
  payment_method: z.enum(["wallet", "paystack"]),
  amount_kobo: z.number().int().positive(),
});

const confirmPaymentSchema = z.object({
  reference: z.string().min(1).max(100),
});

const cancelOrderSchema = z.object({
  reason: z.string().min(5),
});

const refundRequestSchema = z.object({
  reason: z.string().min(10),
});

const mobileMoneyPaymentSchema = z.object({
  orderId: z.number().int().positive(),
  phoneNumber: z.string().regex(/^\+?[0-9]{7,15}$/),
  provider: z.enum(["MTN", "VODAFONE", "AIRTELTIGO", "TELECEL"]),
});

@ApiTags("Buyer - Orders")
@Controller("buyer/orders")
@UseGuards(AuthGuard, RolesGuard)
@Roles("buyer")
@ApiBearerAuth("access-token")
export class OrderController {
  constructor(
    private readonly orderService: OrderService,
    private readonly paymentService: PaymentService,
    private readonly rateLimitService: BuyerRateLimitService,
    private readonly emailService: EmailService,
  ) {}

  /*
   * POST / and GET / used to live here, duplicating BuyerController's
   * "buyer/orders" routes. That controller registers first and always won the
   * match, so these were unreachable. Removed rather than left as dead code;
   * BuyerController owns order creation and listing.
   */

  @Get(":id")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Get order details" })
  async getOrder(
    @CurrentUser() user: JwtPayload,
    @Param("id", ParseIntPipe) orderId: number,
  ) {
    const order = await this.orderService.getOrderById(user.sub, orderId);

    return {
      statusCode: 200,
      message: "Order retrieved",
      data: order,
    };
  }

  @Post(":id/pay")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Pay order with wallet or Paystack" })
  async payOrder(
    @CurrentUser() user: JwtPayload,
    @Param("id", ParseIntPipe) orderId: number,
    @Body(new ZodValidationPipe(payOrderSchema))
    dto: z.infer<typeof payOrderSchema>,
  ) {
    // Check payment rate limit (prevent duplicate payments)
    const paymentRateLimit = await this.rateLimitService.checkPaymentAttempt(
      user.sub,
      orderId,
    );
    if (!paymentRateLimit.allowed) {
      throw new HttpException(
        {
          statusCode: 429,
          message: `Too many payment attempts. Try again in ${paymentRateLimit.resetIn} seconds`,
          data: { remaining: 0, resetIn: paymentRateLimit.resetIn },
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    if (dto.payment_method === "wallet") {
      const result = await this.paymentService.payWithWallet(
        user.sub,
        orderId,
        dto.amount_kobo,
      );

      return {
        statusCode: 200,
        message: "Payment successful",
        data: result,
      };
    } else if (dto.payment_method === "paystack") {
      const result = await this.paymentService.initiatePaystackPayment(
        user.sub,
        orderId,
        dto.amount_kobo,
      );

      return {
        statusCode: 201,
        message: "Payment initiated",
        data: result,
      };
    }

    throw new Error("Invalid payment method");
  }

  /*
   * Called when Paystack redirects the buyer back. The webhook is the primary
   * settlement path; this exists so the buyer is not shown an unconfirmed
   * order when that webhook is slow or cannot reach us at all.
   */
  @Post("confirm-payment")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Confirm a card payment from the Paystack return" })
  async confirmPayment(
    @CurrentUser() user: JwtPayload,
    @Body(new ZodValidationPipe(confirmPaymentSchema))
    dto: z.infer<typeof confirmPaymentSchema>,
  ) {
    const result = await this.paymentService.confirmOrderPayment(
      user.sub,
      dto.reference,
    );

    return {
      statusCode: 200,
      message: result.already
        ? "Payment already confirmed"
        : "Payment confirmed",
      data: result,
    };
  }

  @Post(":id/cancel")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Cancel unpaid or pending order" })
  async cancelOrder(
    @CurrentUser() user: JwtPayload,
    @Param("id", ParseIntPipe) orderId: number,
    @Body(new ZodValidationPipe(cancelOrderSchema))
    dto: z.infer<typeof cancelOrderSchema>,
  ) {
    const order = await this.orderService.cancelOrder(
      user.sub,
      orderId,
      dto.reason,
    );

    return {
      statusCode: 200,
      message: "Order cancelled",
      data: { order_id: order.id, status: "cancelled" },
    };
  }

  @Post(":id/refund")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Request refund for paid order" })
  async requestRefund(
    @CurrentUser() user: JwtPayload,
    @Param("id", ParseIntPipe) orderId: number,
    @Body(new ZodValidationPipe(refundRequestSchema))
    dto: z.infer<typeof refundRequestSchema>,
  ) {
    const result = await this.orderService.requestRefund(
      user.sub,
      orderId,
      dto.reason,
    );

    return {
      statusCode: 200,
      message: "Refund request submitted",
      data: result,
    };
  }

  @Post(":id/pay/mobile-money")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Pay order with mobile money/USSD" })
  async payWithMobileMoney(
    @CurrentUser() user: JwtPayload,
    @Body(new ZodValidationPipe(mobileMoneyPaymentSchema))
    dto: z.infer<typeof mobileMoneyPaymentSchema>,
  ) {
    const result = await this.paymentService.initiateMobileMoneyPayment({
      email: user.email,
      orderId: dto.orderId,
      buyerId: user.sub,
      amountKobo: 50000, // TODO: Get actual amount from order
      phoneNumber: dto.phoneNumber,
      provider: dto.provider,
    });

    return {
      statusCode: 201,
      message: "Mobile money payment initiated",
      data: result,
    };
  }

  /*
   * "initialize-payment" also lived here and was shadowed by
   * BuyerController's "orders/initialize-payment" for the same
   * registration-order reason. Its order-cancelling failure path has been
   * moved onto the live handler in BuyerService.
   */
}
