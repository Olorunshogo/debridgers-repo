import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  UseGuards,
  Request,
  ParseIntPipe,
} from "@nestjs/common";
import { AuthGuard } from "../../../shared/guards/auth.guard";
import { RolesGuard } from "../../../shared/guards/roles.guard";
import { AdminKeyGuard } from "../../../shared/guards/admin-key.guard";
import { Roles } from "../../../shared/decorators/roles.decorator";
import { BuyerAdminService } from "./buyer-admin.service";

@Controller("admin/buyers")
@UseGuards(AuthGuard, AdminKeyGuard, RolesGuard)
@Roles("admin")
export class BuyerAdminController {
  constructor(private readonly buyerAdminService: BuyerAdminService) {}

  @Get()
  async listBuyers(
    @Query("search") search?: string,
    @Query("status") status?: "active" | "suspended",
    @Query("sort") sort?: "recent" | "high_deposit" | "most_orders",
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    return this.buyerAdminService.listBuyers({
      search,
      status,
      sort,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
    });
  }

  @Get(":buyerId")
  async getBuyerProfile(@Param("buyerId", ParseIntPipe) buyerId: number) {
    return this.buyerAdminService.getBuyerProfile(buyerId);
  }

  @Post(":buyerId/suspend")
  async suspendBuyer(
    @Param("buyerId", ParseIntPipe) buyerId: number,
    @Body() { reason }: { reason: string },
    @Request() req: { user: { id: number } },
  ) {
    return this.buyerAdminService.suspendBuyer(buyerId, reason, req.user.id);
  }

  @Post(":buyerId/unsuspend")
  async unsuspendBuyer(
    @Param("buyerId", ParseIntPipe) buyerId: number,
    @Request() req: { user: { id: number } },
  ) {
    return this.buyerAdminService.unsuspendBuyer(buyerId, req.user.id);
  }
}
