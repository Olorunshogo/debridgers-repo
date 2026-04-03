import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Query,
  UseGuards,
  UsePipes,
} from "@nestjs/common";
import { AdminService } from "./admin.service";
import { AuthGuard } from "../auth/guards/auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { ZodValidationPipe } from "../../infrastructure/pipeline/validation.pipeline";
import {
  updateAgentStatusSchema,
  UpdateAgentStatusDto,
} from "./dto/update-agent-status.dto";

@Controller("admin")
@UseGuards(AuthGuard, RolesGuard)
@Roles("admin")
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get("dashboard")
  getDashboardStats() {
    return this.adminService.getDashboardStats();
  }

  @Get("agents")
  getAgents(@Query("status") status?: "pending" | "approved" | "rejected") {
    return this.adminService.getAgents(status);
  }

  @Patch("agents/:id/status")
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(updateAgentStatusSchema))
  updateAgentStatus(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateAgentStatusDto,
  ) {
    return this.adminService.updateAgentStatus(id, dto);
  }

  @Patch("agents/:id/target")
  @HttpCode(HttpStatus.OK)
  setAgentTarget(
    @Param("id", ParseIntPipe) id: number,
    @Body("target", ParseIntPipe) target: number,
  ) {
    return this.adminService.setAgentTarget(id, target);
  }

  @Get("leads")
  getLeads() {
    return this.adminService.getLeads();
  }

  @Patch("commissions/:id/paid")
  @HttpCode(HttpStatus.OK)
  markCommissionPaid(@Param("id", ParseIntPipe) id: number) {
    return this.adminService.markCommissionPaid(id);
  }
}
