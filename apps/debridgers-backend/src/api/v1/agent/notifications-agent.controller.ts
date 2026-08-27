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
import { Roles } from "../../shared/decorators/roles.decorator";
import { CurrentUser } from "../../shared/decorators/current-user.decorator";
import { JwtPayload } from "../../../interfaces/users/jwt.type";

/*
 * The agent half of the notifications API.
 *
 * This route did not exist. The agent dashboard has been calling
 * GET /agent/notifications since it was written; the request 404'd, the page's
 * .catch() swallowed it and set an empty array, so the notification page has
 * always rendered "no notifications" no matter what was in the table - and
 * agent.service has been writing rows to that table the whole time.
 *
 * Same service and same shape as the buyer and admin controllers; only the
 * guard differs.
 */
@ApiTags("Agent - Notifications")
@Controller("agent/notifications")
@UseGuards(AuthGuard, RolesGuard)
@Roles("agent")
@ApiBearerAuth("access-token")
export class NotificationsAgentController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Get agent notifications" })
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
  @ApiOperation({ summary: "Count unread agent notifications" })
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
