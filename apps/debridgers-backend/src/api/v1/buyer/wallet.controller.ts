import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { IsNumber, IsPositive, IsString, MinLength } from "class-validator";
import { WalletService } from "./wallet.service";
import { BuyerRateLimitService } from "./buyer-rate-limit.service";
import { EmailService } from "../../../notification/features/email/email.service";
import { AuthGuard } from "../../shared/guards/auth.guard";
import { RolesGuard } from "../../shared/guards/roles.guard";
import { Roles } from "../../shared/decorators/roles.decorator";
import { CurrentUser } from "../../shared/decorators/current-user.decorator";
import { JwtPayload } from "../../../interfaces/users/jwt.type";

class DepositDto {
  @IsNumber()
  @IsPositive()
  amount_kobo!: number;
}

class ConfirmDepositDto {
  @IsString()
  @MinLength(1)
  reference!: string;
}

@ApiTags("Buyer - Wallet")
@Controller("buyer/wallet")
@UseGuards(AuthGuard, RolesGuard)
@Roles("buyer")
@ApiBearerAuth("access-token")
export class WalletController {
  private readonly baseUrl: string;
  private readonly secretKey: string;

  constructor(
    private readonly walletService: WalletService,
    private readonly rateLimitService: BuyerRateLimitService,
    private readonly config: ConfigService,
    private readonly emailService: EmailService,
  ) {
    this.baseUrl =
      this.config.get<string>("PAYSTACK_URL") ?? "https://api.paystack.co";
    this.secretKey = this.config.get<string>("PAYSTACK_SECRET_KEY") ?? "";
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Get wallet balance and transaction history" })
  async getWallet(
    @CurrentUser() user: JwtPayload,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? Math.min(parseInt(limit, 10), 50) : 10;

    const wallet = await this.walletService.getWalletWithTransactions(
      user.sub,
      pageNum,
      limitNum,
    );

    return {
      statusCode: 200,
      message: "Wallet retrieved",
      data: wallet,
    };
  }

  @Post("deposit")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Initiate Paystack deposit to wallet" })
  async initiateDeposit(
    @CurrentUser() user: JwtPayload,
    @Body() dto: DepositDto,
  ) {
    // Check deposit rate limit (10 per day)
    const depositRateLimit = await this.rateLimitService.checkDepositLimit(
      user.sub,
    );
    if (!depositRateLimit.allowed) {
      throw new HttpException(
        {
          statusCode: 429,
          message: `Too many deposits. Try again in ${depositRateLimit.resetIn} seconds`,
          data: { remaining: 0, resetIn: depositRateLimit.resetIn },
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Validate amount
    this.walletService.validateAmount(dto.amount_kobo);

    // Get buyer email from JWT
    if (!user.email) {
      throw new HttpException(
        { statusCode: 400, message: "User email not found in token" },
        HttpStatus.BAD_REQUEST,
      );
    }

    // Create pending transaction
    const transaction = await this.walletService.createPendingTransaction(
      user.sub,
      dto.amount_kobo,
      `deposit_${user.sub}_${Date.now()}`,
    );

    // Call Paystack API to generate checkout URL
    const paystackResponse = await fetch(
      `${this.baseUrl}/transaction/initialize`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.secretKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: user.email,
          amount: dto.amount_kobo,
          metadata: {
            type: "wallet_deposit",
            user_id: user.sub,
            transaction_id: transaction.id,
          },
        }),
      },
    );

    const paystackData = (await paystackResponse.json()) as {
      status: boolean;
      data?: { authorization_url: string; reference: string };
      message?: string;
    };

    if (!paystackData.status || !paystackData.data) {
      throw new HttpException(
        {
          statusCode: 400,
          message: `Paystack error: ${paystackData.message || "Failed to initialize payment"}`,
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    // Update transaction with Paystack reference
    await this.walletService.updateTransactionReference(
      transaction.id,
      paystackData.data.reference,
    );

    return {
      statusCode: 201,
      message: "Deposit initiated",
      data: {
        transaction_id: transaction.id,
        amount_kobo: dto.amount_kobo,
        authorization_url: paystackData.data.authorization_url,
        reference: paystackData.data.reference,
      },
      rateLimit: {
        remaining: depositRateLimit.remaining,
        limit: 10,
        window: "24 hours",
      },
    };
  }

  @Post("deposit/confirm")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Confirm Paystack deposit via webhook" })
  async confirmDeposit(@Body() dto: ConfirmDepositDto) {
    // TODO: Verify Paystack signature
    // For now, trust the webhook

    const transaction = await this.walletService.confirmTransaction(
      dto.reference,
    );

    // Get wallet by transaction's wallet_id
    const wallet = await this.walletService.getOrCreateWallet(1); // TODO: Get from transaction

    // Send deposit confirmation email (fire-and-forget)
    try {
      // In a real scenario, we'd get user info from the transaction metadata
      // For now, we'd need to query the database to get user name/email
      // This is a limitation that should be addressed in the full implementation
      this.emailService
        .sendDepositConfirmation(
          "buyer@example.com", // TODO: Get from transaction user
          "Buyer",
          `₦${Math.round(transaction.amount / 100)}`,
          dto.reference,
        )
        .catch((err) => {
          console.error("Failed to send deposit confirmation email:", err);
          // Don't fail the API if email fails
        });
    } catch (err) {
      console.error("Error sending deposit email:", err);
    }

    return {
      statusCode: 200,
      message: "Deposit confirmed",
      data: {
        wallet_id: wallet.id,
        available_balance: wallet.available_balance,
        amount_added: transaction.amount,
      },
    };
  }
}
