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
  UsePipes,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { WalletService } from "./wallet.service";
import { BuyerRateLimitService } from "./buyer-rate-limit.service";
import { AuthGuard } from "../../shared/guards/auth.guard";
import { RequestKeyGuard } from "../../shared/guards/keys.guard";
import { CurrentUser } from "../../shared/decorators/current-user.decorator";
import { JwtPayload } from "../../../interfaces/users/jwt.type";
import { ZodValidationPipe } from "../../../infrastructure/pipeline/validation.pipeline";
import { z } from "zod";

const depositSchema = z.object({
  amount_kobo: z.number().int().positive(),
});

type DepositDto = z.infer<typeof depositSchema>;

const confirmDepositSchema = z.object({
  reference: z.string().min(1),
});

type ConfirmDepositDto = z.infer<typeof confirmDepositSchema>;

@ApiTags("Buyer - Wallet")
@Controller("buyer/wallet")
@UseGuards(AuthGuard, RequestKeyGuard)
@ApiBearerAuth("access-token")
export class WalletController {
  constructor(
    private readonly walletService: WalletService,
    private readonly rateLimitService: BuyerRateLimitService,
  ) {}

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
  @UsePipes(new ZodValidationPipe(depositSchema))
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

    // Create pending transaction
    const transaction = await this.walletService.createPendingTransaction(
      user.sub,
      dto.amount_kobo,
      `deposit_${user.sub}_${Date.now()}`,
    );

    // TODO: Call Paystack API to generate checkout URL
    // For now, return mock response
    const payStackUrl = `https://checkout.paystack.com/...`;

    return {
      statusCode: 201,
      message: "Deposit initiated",
      data: {
        transaction_id: transaction.id,
        amount_kobo: dto.amount_kobo,
        authorization_url: payStackUrl,
        reference: transaction.reference,
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
  @UsePipes(new ZodValidationPipe(confirmDepositSchema))
  @ApiOperation({ summary: "Confirm Paystack deposit via webhook" })
  async confirmDeposit(@Body() dto: ConfirmDepositDto) {
    // TODO: Verify Paystack signature
    // For now, trust the webhook

    const transaction = await this.walletService.confirmTransaction(
      dto.reference,
    );

    const wallet = await this.walletService.getOrCreateWallet(1); // TODO: Get from transaction

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
