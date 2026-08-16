import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Delete,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from "@nestjs/swagger";
import { BuyerService } from "./buyer.service";
import { CloudinaryService } from "../../../infrastructure/cloudinary/cloudinary.service";
import { ZodValidationPipe } from "../../../infrastructure/pipeline/validation.pipeline";
import { FileValidationPipe } from "../../../infrastructure/file/file-validation.pipe";
import {
  updateProfileSchema,
  UpdateProfileDto,
} from "./dto/update-profile.dto";
import { createOrderSchema, CreateOrderDto } from "./dto/create-order.dto";
import { syncCartSchema, SyncCartDto } from "./dto/sync-cart.dto";
import {
  initializeOrderPaymentSchema,
  InitializeOrderPaymentDto,
} from "./dto/initialize-order-payment.dto";
import { quoteCartSchema, QuoteCartDto } from "./dto/quote-cart.dto";
import {
  changePasswordSchema,
  ChangePasswordDto,
} from "./dto/change-password.dto";
import { AuthGuard } from "../../shared/guards/auth.guard";
import { RolesGuard } from "../../shared/guards/roles.guard";
import { Roles } from "../../shared/decorators/roles.decorator";
import { CurrentUser } from "../../shared/decorators/current-user.decorator";
import { JwtPayload } from "../../../interfaces/users/jwt.type";

@ApiTags("Buyer")
@Controller("buyer")
@UseGuards(AuthGuard, RolesGuard)
@Roles("buyer")
@ApiBearerAuth("access-token")
export class BuyerController {
  constructor(
    private readonly buyerService: BuyerService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  @Get("me")
  @ApiOperation({ summary: "Get buyer profile" })
  @ApiResponse({ status: 200, description: "Profile retrieved" })
  getProfile(@CurrentUser() user: JwtPayload) {
    return this.buyerService.getProfile(user);
  }

  @Patch("profile")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Update buyer profile (name, phone, address)" })
  @ApiResponse({ status: 200, description: "Profile updated" })
  updateProfile(
    @Body(new ZodValidationPipe(updateProfileSchema)) dto: UpdateProfileDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.buyerService.updateProfile(dto, user);
  }

  @Post("avatar")
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileInterceptor("file", {
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
      },
    }),
  )
  @ApiOperation({ summary: "Upload buyer profile photo" })
  @ApiResponse({ status: 200, description: "Avatar uploaded" })
  async uploadAvatar(
    @UploadedFile(new FileValidationPipe()) file: Express.Multer.File,
    @CurrentUser() user: JwtPayload,
  ) {
    const url = await this.cloudinaryService.uploadBuffer(
      file.buffer,
      "debridgers/avatars",
    );
    await this.buyerService.updateAvatar(url, user);
    return { message: "Avatar updated", data: { url } };
  }

  @Post("orders")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Place a new order" })
  @ApiResponse({ status: 201, description: "Order placed" })
  createOrder(
    @Body(new ZodValidationPipe(createOrderSchema)) dto: CreateOrderDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.buyerService.createOrder(dto, user);
  }

  @Get("orders")
  @ApiOperation({ summary: "Get all my orders" })
  @ApiResponse({ status: 200, description: "Orders retrieved" })
  getOrders(@CurrentUser() user: JwtPayload) {
    return this.buyerService.getOrders(user);
  }

  @Get("dashboard")
  @ApiOperation({ summary: "Get buyer dashboard stats and recent orders" })
  @ApiResponse({ status: 200, description: "Dashboard retrieved" })
  getDashboard(@CurrentUser() user: JwtPayload) {
    return this.buyerService.getDashboard(user);
  }

  @Get("spending")
  @ApiOperation({ summary: "Get weekly spending chart data (last 6 weeks)" })
  @ApiResponse({ status: 200, description: "Weekly spending retrieved" })
  getWeeklySpending(@CurrentUser() user: JwtPayload) {
    return this.buyerService.getWeeklySpending(user);
  }

  @Get("products")
  @ApiOperation({ summary: "List active products available to order" })
  @ApiResponse({ status: 200, description: "Products retrieved" })
  getProducts() {
    return this.buyerService.getProducts();
  }

  /*
   * Notifications live entirely on NotificationsController. They were declared
   * here too, and because this controller registers first its
   * "notifications/:id/read" matched /buyer/notifications/mark-all/read,
   * feeding "mark-all" to ParseIntPipe and making mark-all-read unreachable.
   */

  @Patch("password")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Change buyer password (requires current password)",
  })
  @ApiResponse({ status: 200, description: "Password updated" })
  @ApiResponse({ status: 401, description: "Current password incorrect" })
  changePassword(
    @Body(new ZodValidationPipe(changePasswordSchema)) dto: ChangePasswordDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.buyerService.changePassword(dto, user);
  }

  // === Cart

  @Get("cart")
  @ApiOperation({ summary: "Get the buyer's saved cart" })
  @ApiResponse({ status: 200, description: "Cart retrieved" })
  getCart(@CurrentUser() user: JwtPayload) {
    return this.buyerService.getCart(user);
  }

  @Put("cart")
  @ApiOperation({
    summary: "Replace the saved cart",
    description:
      "Full replace, not a delta. The client holds the authoritative cart in localStorage and syncs the whole thing on a debounce, so this is idempotent and safe to retry.",
  })
  @ApiResponse({ status: 200, description: "Cart synced" })
  syncCart(
    @Body(new ZodValidationPipe(syncCartSchema)) dto: SyncCartDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.buyerService.replaceCart(dto, user);
  }

  @Post("cart/merge")
  @ApiOperation({
    summary: "Merge a local cart into the saved one",
    description:
      "Called once on login. Takes the higher quantity per product rather than summing, so adding the same item on two devices does not double the order.",
  })
  @ApiResponse({ status: 200, description: "Cart merged" })
  mergeCart(
    @Body(new ZodValidationPipe(syncCartSchema)) dto: SyncCartDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.buyerService.mergeCart(dto, user);
  }

  @Delete("cart")
  @ApiOperation({ summary: "Clear the saved cart" })
  @ApiResponse({ status: 200, description: "Cart cleared" })
  clearCart(@CurrentUser() user: JwtPayload) {
    return this.buyerService.clearCart(user);
  }

  // === Favorites

  @Get("favorites")
  @ApiOperation({ summary: "List favourited products" })
  @ApiResponse({ status: 200, description: "Favorites retrieved" })
  getFavorites(@CurrentUser() user: JwtPayload) {
    return this.buyerService.getFavorites(user);
  }

  @Post("favorites/:productId")
  @ApiOperation({ summary: "Favourite a product (idempotent)" })
  @ApiResponse({ status: 201, description: "Added to favorites" })
  addFavorite(
    @Param("productId", ParseIntPipe) productId: number,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.buyerService.addFavorite(productId, user);
  }

  @Delete("favorites/:productId")
  @ApiOperation({ summary: "Remove a product from favourites" })
  @ApiResponse({ status: 200, description: "Removed from favorites" })
  removeFavorite(
    @Param("productId", ParseIntPipe) productId: number,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.buyerService.removeFavorite(productId, user);
  }

  // === Buy again

  @Get("buy-again")
  @ApiOperation({
    summary: "Products this buyer orders most",
    description:
      "Derived from order history, ranked by frequency then recency. Distinct from favourites, which are explicit bookmarks.",
  })
  @ApiResponse({ status: 200, description: "Buy again retrieved" })
  getBuyAgain(@CurrentUser() user: JwtPayload) {
    return this.buyerService.getBuyAgain(user);
  }

  // === Checkout

  @Post("orders/initialize-payment")
  @ApiOperation({
    summary: "Create a pending order and start Paystack checkout",
    description:
      "Re-prices every cart line from the products table before charging - client-supplied prices are ignored.",
  })
  @ApiResponse({ status: 201, description: "Payment initialized" })
  initializeOrderPayment(
    @Body(new ZodValidationPipe(initializeOrderPaymentSchema))
    dto: InitializeOrderPaymentDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.buyerService.initializeOrderPayment(dto, user);
  }

  @Post("cart/quote")
  @ApiOperation({
    summary: "Price a basket without creating an order",
    description:
      "Returns items total, delivery fee (zone base + weight surcharge), handling fee and grand total, so checkout can show fees before payment.",
  })
  @ApiResponse({ status: 200, description: "Quote generated" })
  quoteCart(
    @Body(new ZodValidationPipe(quoteCartSchema)) dto: QuoteCartDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.buyerService.quoteCart(dto, user);
  }
}
