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
import { PaystackDvaService } from "../payment/paystack-dva.service";
import { WithdrawalService } from "../payment/withdrawal.service";

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

class WithdrawalDto {
  @IsNumber()
  @IsPositive()
  amount_kobo!: number;

  reason?: string;
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
    private readonly paystackDvaService: PaystackDvaService,
    private readonly withdrawalService: WithdrawalService,
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

  @Get("dva")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Get buyer's Dedicated Virtual Account (DVA) details",
  })
  async getDva(@CurrentUser() user: JwtPayload) {
    const dva = await this.paystackDvaService.getDvaForUser(user.sub);

    if (!dva) {
      return {
        statusCode: 200,
        message: "DVA not yet created",
        data: null,
      };
    }

    return {
      statusCode: 200,
      message: "DVA details retrieved",
      data: {
        account_number: dva.account_number,
        bank_name: dva.bank_name,
        account_name: dva.account_name,
      },
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
  async confirmDeposit(
    @Body() dto: ConfirmDepositDto,
    @CurrentUser() user: JwtPayload,
  ) {
    /*
     * Ask Paystack whether this reference was actually paid. Previously the
     * handler credited the wallet on the strength of the reference alone, so a
     * buyer could initialise a deposit, never pay, post the reference back and
     * mint the balance.
     */
    const verifyResponse = await fetch(
      `${this.baseUrl}/transaction/verify/${encodeURIComponent(dto.reference)}`,
      { headers: { Authorization: `Bearer ${this.secretKey}` } },
    );

    const verified = (await verifyResponse.json()) as {
      status: boolean;
      data?: { status: string; amount: number; reference: string };
      message?: string;
    };

    if (!verified.status || !verified.data) {
      throw new HttpException(
        {
          statusCode: 400,
          message: `Paystack error: ${verified.message || "Could not verify transaction"}`,
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    if (verified.data.status !== "success") {
      throw new HttpException(
        {
          statusCode: 400,
          message: `Deposit not paid (Paystack status: ${verified.data.status})`,
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const pending = await this.walletService.getTransactionByReference(
      dto.reference,
    );

    /*
     * Credit what Paystack says was received, not what the client asked for at
     * initialise time, and refuse if the two disagree.
     */
    if (verified.data.amount !== pending.amount) {
      throw new HttpException(
        {
          statusCode: 400,
          message: "Paid amount does not match the initiated deposit",
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    // Checked before crediting: a stranger's reference must not move money.
    const { owner } = await this.walletService.getWalletWithOwner(
      pending.wallet_id,
    );

    if (owner?.id !== user.sub) {
      throw new HttpException(
        { statusCode: 403, message: "This deposit belongs to another account" },
        HttpStatus.FORBIDDEN,
      );
    }

    const transaction = await this.walletService.confirmTransaction(
      dto.reference,
    );

    const { wallet } = await this.walletService.getWalletWithOwner(
      transaction.wallet_id,
    );

    if (owner?.email) {
      this.emailService
        .sendDepositConfirmation(
          owner.email,
          owner.first_name || "Buyer",
          `₦${Math.round(transaction.amount / 100)}`,
          dto.reference,
        )
        .catch((err) => {
          console.error("Failed to send deposit confirmation email:", err);
        });
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

  @Post("withdraw")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Withdraw from wallet to bank account" })
  async withdraw(@CurrentUser() user: JwtPayload, @Body() dto: WithdrawalDto) {
    const result = await this.withdrawalService.initiateWithdrawal(user.sub, {
      amount_kobo: dto.amount_kobo,
      reason: dto.reason,
    });

    return {
      statusCode: 201,
      message: "Withdrawal initiated",
      data: result,
    };
  }
}
