import { Controller, Post, Get, Body, UseGuards, Req } from "@nestjs/common";
import { AuthGuard } from "../../../shared/guards/auth.guard";
import { RolesGuard } from "../../../shared/guards/roles.guard";
import { AdminKeyGuard } from "../../../shared/guards/admin-key.guard";
import { Roles } from "../../../shared/decorators/roles.decorator";
import { AdminInviteService } from "./admin-invite.service";

interface CreateInviteDto {
  email: string;
}

@Controller("admin/invites")
@UseGuards(AuthGuard, AdminKeyGuard, RolesGuard)
@Roles("admin")
export class AdminInviteController {
  constructor(private adminInviteService: AdminInviteService) {}

  @Get()
  async listInvites() {
    const invites = await this.adminInviteService.listInvites();
    return invites;
  }

  @Post()
  async createInvite(
    @Body() dto: CreateInviteDto,
    @Req() req: { user: { id: number } },
  ) {
    const result = await this.adminInviteService.createInvite(
      dto.email,
      req.user.id,
    );

    /* Envelope kept as-is: the admin dashboard reads this shape directly. Only
       the copy reflects whether the email actually went out. */
    const message: string = result.email_sent
      ? `Invite sent to ${dto.email}. Share the temporary password and invite code with them.`
      : `Invite created for ${dto.email} but the email could not be sent. Share the invite code and temporary password below manually.`;

    return {
      success: true,
      data: result,
      message,
    };
  }

  @Post("verify")
  @UseGuards(AuthGuard, AdminKeyGuard, RolesGuard)
  @Roles("admin")
  async verifyInviteCode(
    @Body() dto: { invite_code: string },
    @Req() req: { user: { id: number; email: string } },
  ) {
    await this.adminInviteService.verifyInviteCode(
      req.user.email,
      dto.invite_code,
      req.user.id,
    );

    return {
      success: true,
      message: "Invite verified successfully.",
    };
  }

  @Post("verify-unauthenticated")
  async verifyInviteCodeUnauthenticated(
    @Body() dto: { email: string; invite_code: string },
  ) {
    const adminId =
      await this.adminInviteService.verifyInviteCodeUnauthenticated(
        dto.email,
        dto.invite_code,
      );

    return {
      success: true,
      message: "Invite verified successfully. You can now log in.",
      data: { admin_id: adminId },
    };
  }
}
