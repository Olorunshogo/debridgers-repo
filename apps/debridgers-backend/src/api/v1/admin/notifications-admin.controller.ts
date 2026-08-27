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
import { NotificationsService } from "../buyer/notifications.service";
import { AuthGuard } from "../../shared/guards/auth.guard";
import { RolesGuard } from "../../shared/guards/roles.guard";
import { AdminKeyGuard } from "../../shared/guards/admin-key.guard";
import { Roles } from "../../shared/decorators/roles.decorator";
import { CurrentUser } from "../../shared/decorators/current-user.decorator";
import { JwtPayload } from "../../../interfaces/users/jwt.type";

/*
 * The admin half of the notifications API.
 *
 * NotificationsService is shared with the buyer controller and scopes every
 * query by user id, so the only thing that differs here is the guard stack.
 * Admins are rows in `users` like anyone else; a notification addressed to one
 * is a notification row with that admin's user id.
 */
@ApiTags("Admin - Notifications")
@Controller("admin/notifications")
@UseGuards(AuthGuard, AdminKeyGuard, RolesGuard)
@Roles("admin")
@ApiBearerAuth("access-token")
export class NotificationsAdminController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Get admin notifications" })
  @ApiQuery({ name: "page", required: false, example: 1 })
  @ApiQuery({ name: "limit", required: false, example: 20 })
  async getNotifications(
    @CurrentUser() user: JwtPayload,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? Math.min(parseInt(limit, 10), 50) : 20;

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

  @Get("unread-count")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Count unread admin notifications" })
  async getUnreadCount(@CurrentUser() user: JwtPayload) {
    const total = await this.notificationsService.getUnreadCount(user.sub);

    return {
      statusCode: 200,
      message: "Unread count retrieved",
      data: { total },
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

  @Patch(":id/done")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Mark notification as done" })
  async markAsDone(
    @CurrentUser() user: JwtPayload,
    @Param("id", ParseIntPipe) notificationId: number,
  ) {
    await this.notificationsService.markAsDone(user.sub, notificationId);

    return {
      statusCode: 200,
      message: "Notification marked as done",
      data: null,
    };
  }
}
