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
  Query,
  UseGuards,
} from "@nestjs/common";
import { AdminService } from "./admin.service";
import { AuthGuard } from "../auth/guards/auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { JwtPayload } from "../../interfaces/users/jwt.type";
import { ZodValidationPipe } from "../../infrastructure/pipeline/validation.pipeline";
import {
  updateAgentStatusSchema,
  UpdateAgentStatusDto,
} from "./dto/update-agent-status.dto";
import {
  promoteManagerSchema,
  PromoteManagerDto,
} from "./dto/promote-manager.dto";
import {
  recordInventorySchema,
  RecordInventoryDto,
} from "./dto/record-inventory.dto";
import { reviewKycSchema, ReviewKycDto } from "./dto/review-kyc.dto";

@Controller("admin")
@UseGuards(AuthGuard, RolesGuard)
@Roles("admin")
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ─── Dashboard ──────────────────────────────────────────────────────────────

  @Get("dashboard")
  getDashboardStats() {
    return this.adminService.getDashboardStats();
  }

  // ─── Agents ─────────────────────────────────────────────────────────────────

  @Get("agents")
  getAgents(
    @Query("status")
    status?: "pending" | "approved" | "rejected" | "suspended",
  ) {
    return this.adminService.getAgents(status);
  }

  @Get("agents/:id")
  getAgentById(@Param("id", ParseIntPipe) id: number) {
    return this.adminService.getAgentById(id);
  }

  @Patch("agents/:id/status")
  @HttpCode(HttpStatus.OK)
  updateAgentStatus(
    @Param("id", ParseIntPipe) id: number,
    @Body(new ZodValidationPipe(updateAgentStatusSchema))
    dto: UpdateAgentStatusDto,
  ) {
    return this.adminService.updateAgentStatus(id, dto);
  }

  @Patch("agents/:id/suspend")
  @HttpCode(HttpStatus.OK)
  suspendAgent(@Param("id", ParseIntPipe) id: number) {
    return this.adminService.suspendAgent(id);
  }

  @Patch("agents/:id/unsuspend")
  @HttpCode(HttpStatus.OK)
  unsuspendAgent(@Param("id", ParseIntPipe) id: number) {
    return this.adminService.unsuspendAgent(id);
  }

  @Patch("agents/:id/promote-manager")
  @HttpCode(HttpStatus.OK)
  promoteToStateManager(
    @Param("id", ParseIntPipe) id: number,
    @Body(new ZodValidationPipe(promoteManagerSchema)) dto: PromoteManagerDto,
  ) {
    return this.adminService.promoteToStateManager(id, dto);
  }

  @Patch("agents/:id/target")
  @HttpCode(HttpStatus.OK)
  setAgentTarget(
    @Param("id", ParseIntPipe) id: number,
    @Body("target", ParseIntPipe) target: number,
  ) {
    return this.adminService.setAgentTarget(id, target);
  }

  // ─── Buyers ─────────────────────────────────────────────────────────────────

  @Get("buyers")
  getBuyers() {
    return this.adminService.getBuyers();
  }

  @Get("buyers/:id")
  getBuyerById(@Param("id", ParseIntPipe) id: number) {
    return this.adminService.getBuyerById(id);
  }

  @Patch("buyers/:id/block")
  @HttpCode(HttpStatus.OK)
  blockBuyer(@Param("id", ParseIntPipe) id: number) {
    return this.adminService.toggleBlockBuyer(id, true);
  }

  @Patch("buyers/:id/unblock")
  @HttpCode(HttpStatus.OK)
  unblockBuyer(@Param("id", ParseIntPipe) id: number) {
    return this.adminService.toggleBlockBuyer(id, false);
  }

  // ─── Stock & Inventory ───────────────────────────────────────────────────────

  @Get("stock/requests")
  getStockRequests(
    @Query("status") status?: "pending" | "fulfilled" | "cancelled",
  ) {
    return this.adminService.getStockRequests(status);
  }

  @Patch("stock/requests/:id/fulfil")
  @HttpCode(HttpStatus.OK)
  fulfilStockRequest(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.adminService.fulfilStockRequest(id, user.sub);
  }

  @Get("stock/inventory")
  getInventoryStats() {
    return this.adminService.getInventoryStats();
  }

  @Post("stock/inventory")
  @HttpCode(HttpStatus.CREATED)
  recordInventory(
    @Body(new ZodValidationPipe(recordInventorySchema)) dto: RecordInventoryDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.adminService.recordInventoryReceived(
      dto.quantity,
      dto.source,
      dto.notes,
      user.sub,
    );
  }

  // ─── Leads ──────────────────────────────────────────────────────────────────

  @Get("leads")
  getLeads() {
    return this.adminService.getLeads();
  }

  // ─── KYC ────────────────────────────────────────────────────────────────────

  @Get("kyc")
  getPendingKyc() {
    return this.adminService.getPendingKyc();
  }

  @Patch("agents/:id/kyc")
  @HttpCode(HttpStatus.OK)
  reviewKyc(
    @Param("id", ParseIntPipe) id: number,
    @Body(new ZodValidationPipe(reviewKycSchema)) dto: ReviewKycDto,
  ) {
    return this.adminService.reviewKyc(id, dto);
  }

  // ─── Commissions ────────────────────────────────────────────────────────────

  @Patch("commissions/:id/paid")
  @HttpCode(HttpStatus.OK)
  markCommissionPaid(@Param("id", ParseIntPipe) id: number) {
    return this.adminService.markCommissionPaid(id);
  }
}
