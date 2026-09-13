import {
  Controller,
  Post,
  Get,
  Patch,
  Param,
  ParseIntPipe,
  Body,
  UseGuards,
  Req,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";
import { AuthGuard } from "../../../shared/guards/auth.guard";
import { RolesGuard } from "../../../shared/guards/roles.guard";
import { AdminKeyGuard } from "../../../shared/guards/admin-key.guard";
import { Roles } from "../../../shared/decorators/roles.decorator";
import { AdminInviteService } from "./admin-invite.service";

interface CreateInviteDto {
  email: string;
  desk: "buyer" | "agent" | "hr";
}

@Controller("admin/invites")
export class AdminInviteController {
  constructor(private adminInviteService: AdminInviteService) {}

  @Get()
  @UseGuards(AuthGuard, AdminKeyGuard, RolesGuard)
  @Roles("admin")
  async listInvites() {
    const invites = await this.adminInviteService.listInvites();
    return invites;
  }

  @Post()
  @UseGuards(AuthGuard, AdminKeyGuard, RolesGuard)
  @Roles("admin")
  async createInvite(
    @Body() dto: CreateInviteDto,
    @Req() req: { user: { id: number; admin_tier?: string } },
  ) {
    if (req.user.admin_tier !== "super") {
      throw new ForbiddenException(
        "Only a super admin can invite other admins.",
      );
    }

    if (dto.desk !== "buyer" && dto.desk !== "agent" && dto.desk !== "hr") {
      throw new BadRequestException('desk must be "buyer", "agent", or "hr"');
    }

    const result = await this.adminInviteService.createInvite(
      dto.email,
      req.user.id,
      dto.desk,
    );

    /* Envelope kept as-is: the admin dashboard reads this shape directly. Only
       the copy reflects whether the email actually went out. */
    const message: string = result.email_sent
      ? `Invite sent to ${dto.email} (${dto.desk} desk). Share the temporary password and invite code with them.`
      : `Invite created for ${dto.email} (${dto.desk} desk) but the email could not be sent. Share the invite code and temporary password below manually.`;

    return {
      success: true,
      data: result,
      message,
    };
  }

  @Patch(":id/revoke")
  @UseGuards(AuthGuard, AdminKeyGuard, RolesGuard)
  @Roles("admin")
  async revokeInvite(
    @Param("id", ParseIntPipe) id: number,
    @Req() req: { user: { id: number; admin_tier?: string } },
  ) {
    if (req.user.admin_tier !== "super") {
      throw new ForbiddenException("Only a super admin can revoke an invite.");
    }

    await this.adminInviteService.revokeInvite(id, req.user.id);

    return {
      success: true,
      message: "Invite revoked.",
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
