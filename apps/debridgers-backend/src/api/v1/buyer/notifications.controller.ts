import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from "@nestjs/swagger";
import { NotificationsService } from "./notifications.service";
import { AuthGuard } from "../../shared/guards/auth.guard";
import { RolesGuard } from "../../shared/guards/roles.guard";
import { Roles } from "../../shared/decorators/roles.decorator";
import { CurrentUser } from "../../shared/decorators/current-user.decorator";
import { JwtPayload } from "../../../interfaces/users/jwt.type";

@ApiTags("Buyer - Notifications")
@Controller("buyer/notifications")
@UseGuards(AuthGuard, RolesGuard)
@Roles("buyer")
@ApiBearerAuth("access-token")
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Get buyer notifications" })
  @ApiQuery({ name: "page", required: false, example: 1 })
  @ApiQuery({ name: "limit", required: false, example: 10 })
  async getNotifications(
    @CurrentUser() user: JwtPayload,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? Math.min(parseInt(limit, 10), 50) : 10;

    const notifications = await this.notificationsService.getNotifications(
      user.sub,
      pageNum,
      limitNum,
    );

    return {
      statusCode: 200,
      message: "Notifications retrieved",
      data: notifications,
    };
  }

  /*
   * Must stay above @Patch(":id/read"). Nest matches in declaration order, so
   * the parameterised route would otherwise swallow "mark-all" as an id and
   * ParseIntPipe would reject it, leaving this route unreachable.
   */
  @Patch("mark-all/read")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Mark all notifications as read" })
  async markAllAsRead(@CurrentUser() user: JwtPayload) {
    await this.notificationsService.markAllAsRead(user.sub);

    return {
      statusCode: 200,
      message: "All notifications marked as read",
      data: null,
    };
  }

  @Patch(":id/read")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Mark notification as read" })
  async markAsRead(
    @CurrentUser() user: JwtPayload,
    @Param("id", ParseIntPipe) notificationId: number,
  ) {
    await this.notificationsService.markAsRead(user.sub, notificationId);

    return {
      statusCode: 200,
      message: "Notification marked as read",
      data: null,
    };
  }
}
