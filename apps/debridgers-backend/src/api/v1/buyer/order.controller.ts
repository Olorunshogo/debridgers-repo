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
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { OrderService, CreateOrderDto } from "./order.service";
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

/*
 * name, price_kobo and unit are optional and ignored by the service, which
 * re-reads all three from the product table. They stay in the schema only so
 * existing clients that send a full cart are not rejected. Do not start
 * trusting them again.
 */
const createOrderSchema = z.object({
  delivery_address: z.string().min(10),
  zone_id: z.number().int().positive().optional(),
  delivery_time: z.string(),
  notes: z.string().optional(),
  cart: z
    .array(
      z.object({
        product_id: z.number().int().positive(),
        name: z.string().optional(),
        price_kobo: z.number().int().positive().optional(),
        unit: z.string().optional(),
        qty: z.number().int().positive(),
      }),
    )
    .min(1),
});

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

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Create order from cart" })
  async createOrder(
    @CurrentUser() user: JwtPayload,
    @Body(new ZodValidationPipe(createOrderSchema)) dto: CreateOrderDto,
  ) {
    // Check rate limit
    const rateLimitCheck = await this.rateLimitService.checkOrderLimit(
      user.sub,
    );
    if (!rateLimitCheck.allowed) {
      throw new HttpException(
        {
          statusCode: 429,
          message: `Too many orders. Try again in ${rateLimitCheck.resetIn} seconds`,
          data: { remaining: 0, resetIn: rateLimitCheck.resetIn },
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const order = await this.orderService.createOrder(user.sub, dto);

    // Send order confirmation email (fire-and-forget)
    try {
      // TODO: Get user name and email from JWT or database
      const amount = `₦${Math.round(order.order.total_kobo / 100)}`;
      this.emailService
        .sendOrderConfirmation(
          user.email || "buyer@example.com",
          user.first_name || "Buyer",
          `#DBR-${String(order.order.id).padStart(4, "0")}`,
          amount,
          order.order.items.length,
        )
        .catch((err) => {
          console.error("Failed to send order confirmation email:", err);
          // Don't fail the API if email fails
        });
    } catch (err) {
      console.error("Error sending order email:", err);
    }

    return {
      statusCode: 201,
      message: "Order created",
      data: order,
      rateLimit: {
        remaining: rateLimitCheck.remaining,
        limit: 5,
        window: "1 hour",
      },
    };
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "List buyer's orders" })
  async getOrders(
    @CurrentUser() user: JwtPayload,
    @Query("status") status?: string,
    @Query("payment_status") paymentStatus?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? Math.min(parseInt(limit, 10), 50) : 10;

    const orders = await this.orderService.getOrders(
      user.sub,
      status,
      paymentStatus,
      pageNum,
      limitNum,
    );

    return {
      statusCode: 200,
      message: "Orders retrieved",
      data: orders,
    };
  }

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

  @Post("initialize-payment")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Create order and initialize Paystack payment" })
  async initializePayment(
    @CurrentUser() user: JwtPayload,
    @Body(new ZodValidationPipe(createOrderSchema)) dto: CreateOrderDto,
  ) {
    // Check rate limit
    const rateLimitCheck = await this.rateLimitService.checkOrderLimit(
      user.sub,
    );
    if (!rateLimitCheck.allowed) {
      throw new HttpException(
        {
          statusCode: 429,
          message: `Too many orders. Try again in ${rateLimitCheck.resetIn} seconds`,
          data: { remaining: 0, resetIn: rateLimitCheck.resetIn },
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Create order
    const order = await this.orderService.createOrder(user.sub, dto);

    /*
     * The order exists before Paystack is called, so a failure here would
     * otherwise strand it as pending/unpaid forever with no way for the buyer
     * to pay or clear it. Cancelled rather than deleted to keep the audit
     * trail, and the original error still reaches the client.
     */
    let payment: Awaited<
      ReturnType<typeof this.paymentService.initiatePaystackPayment>
    >;

    try {
      payment = await this.paymentService.initiatePaystackPayment(
        user.sub,
        order.order.id,
        order.order.total_kobo,
      );
    } catch (err) {
      await this.orderService.cancelOrderForFailedPayment(order.order.id);
      throw err;
    }

    // Send order confirmation email
    try {
      const amount = `₦${Math.round(order.order.total_kobo / 100)}`;
      this.emailService
        .sendOrderConfirmation(
          user.email || "buyer@example.com",
          user.first_name || "Buyer",
          `#DBR-${String(order.order.id).padStart(4, "0")}`,
          amount,
          order.order.items.length,
        )
        .catch((err) => {
          console.error("Failed to send order confirmation email:", err);
        });
    } catch (err) {
      console.error("Error sending order email:", err);
    }

    return {
      statusCode: 201,
      message: "Order created and payment initialized",
      data: {
        order_id: order.order.id,
        authorization_url: payment.authorization_url,
        reference: payment.reference,
        amount_kobo: order.order.total_kobo,
      },
    };
  }
}
