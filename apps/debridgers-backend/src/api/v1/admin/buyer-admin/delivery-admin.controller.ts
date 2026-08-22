import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  Request,
  ParseIntPipe,
} from "@nestjs/common";
import { AuthGuard } from "../../../shared/guards/auth.guard";
import { RolesGuard } from "../../../shared/guards/roles.guard";
import { AdminKeyGuard } from "../../../shared/guards/admin-key.guard";
import { Roles } from "../../../shared/decorators/roles.decorator";
import { DeliveryAdminService } from "./delivery-admin.service";

@Controller("admin/deliveries")
@UseGuards(AuthGuard, AdminKeyGuard, RolesGuard)
@Roles("admin")
export class DeliveryAdminController {
  constructor(private readonly deliveryAdminService: DeliveryAdminService) {}

  @Get("pending")
  async listPendingDeliveries() {
    return this.deliveryAdminService.listPendingDeliveries();
  }

  @Get(":orderId")
  async getOrderDetails(@Param("orderId", ParseIntPipe) orderId: number) {
    return this.deliveryAdminService.getOrderDetails(orderId);
  }

  @Post(":orderId/verify")
  async verifyDelivery(
    @Param("orderId", ParseIntPipe) orderId: number,
    @Body()
    data: {
      photos: string[];
      notes?: string;
      recipient_name?: string;
    },
    @Request() req: { user: { id: number } },
  ) {
    return this.deliveryAdminService.verifyDelivery(orderId, data, req.user.id);
  }
}
