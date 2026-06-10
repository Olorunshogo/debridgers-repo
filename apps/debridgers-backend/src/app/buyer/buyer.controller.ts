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
import { CloudinaryService } from "../../infrastructure/cloudinary/cloudinary.service";
import { ZodValidationPipe } from "../../infrastructure/pipeline/validation.pipeline";
import {
  updateProfileSchema,
  UpdateProfileDto,
} from "./dto/update-profile.dto";
import { createOrderSchema, CreateOrderDto } from "./dto/create-order.dto";
import { AuthGuard } from "../auth/guards/auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { JwtPayload } from "../../interfaces/users/jwt.type";

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
  @UseInterceptors(FileInterceptor("file"))
  @ApiOperation({ summary: "Upload buyer profile photo" })
  @ApiResponse({ status: 200, description: "Avatar uploaded" })
  async uploadAvatar(
    @UploadedFile() file: Express.Multer.File,
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

  @Get("notifications")
  @ApiOperation({ summary: "Get notifications for this buyer" })
  getNotifications(@CurrentUser() user: JwtPayload) {
    return this.buyerService.getNotifications(user);
  }

  @Patch("notifications/:id/read")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Mark a notification as read" })
  markNotificationRead(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.buyerService.markNotificationRead(id, user);
  }

  @Patch("password")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Change buyer password (requires current password)",
  })
  @ApiResponse({ status: 200, description: "Password updated" })
  @ApiResponse({ status: 401, description: "Current password incorrect" })
  changePassword(
    @Body() body: { old_password: string; new_password: string },
    @CurrentUser() user: JwtPayload,
  ) {
    return this.buyerService.changePassword(body, user);
  }
}
