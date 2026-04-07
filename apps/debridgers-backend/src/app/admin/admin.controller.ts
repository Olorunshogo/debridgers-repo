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
import {
  ApiTags,
  ApiOperation,
  ApiBody,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
  ApiResponse,
} from "@nestjs/swagger";
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

@ApiTags("Admin")
@ApiBearerAuth("access-token")
@Controller("admin")
@UseGuards(AuthGuard, RolesGuard)
@Roles("admin")
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ─── Dashboard ──────────────────────────────────────────────────────────────

  @Get("dashboard")
  @ApiOperation({ summary: "Platform-wide dashboard stats" })
  @ApiResponse({
    status: 200,
    description: "Stats retrieved",
    schema: {
      example: {
        statusCode: 200,
        message: "Dashboard stats retrieved",
        data: {
          total_agents: 12,
          pending_agents: 3,
          total_buyers: 87,
          total_orders: 204,
          total_revenue: "15600000.00",
          pending_commissions: "87500.00",
          total_leads: 45,
        },
      },
    },
  })
  getDashboardStats() {
    return this.adminService.getDashboardStats();
  }

  // ─── Agents ─────────────────────────────────────────────────────────────────

  @Get("agents")
  @ApiOperation({ summary: "List all agents — filter by status" })
  @ApiQuery({
    name: "status",
    required: false,
    enum: ["pending", "approved", "rejected", "suspended"],
  })
  @ApiResponse({
    status: 200,
    description: "Agents retrieved",
    schema: {
      example: {
        statusCode: 200,
        message: "Agents retrieved",
        data: [
          {
            id: 5,
            first_name: "Amina",
            last_name: "Yusuf",
            email: "amina@example.com",
            phone: "08012345678",
            status: "pending",
            state: "Kaduna",
            lga: "Kaduna North",
            is_state_manager: false,
            referral_buyer_code: null,
            referral_agent_code: null,
            applied_at: "2026-04-07T08:30:00.000Z",
          },
        ],
      },
    },
  })
  getAgents(
    @Query("status")
    status?: "pending" | "approved" | "rejected" | "suspended",
  ) {
    return this.adminService.getAgents(status);
  }

  @Get("agents/:id")
  @ApiOperation({ summary: "Get a single agent's full profile with wallet" })
  @ApiParam({ name: "id", type: "integer", example: 5 })
  @ApiResponse({
    status: 200,
    description: "Agent retrieved",
    schema: {
      example: {
        statusCode: 200,
        message: "Agent retrieved",
        data: {
          id: 5,
          first_name: "Amina",
          last_name: "Yusuf",
          email: "amina@example.com",
          status: "approved",
          kyc_status: "approved",
          id_type: "NIN",
          bank_name: "GTBank",
          bank_account_number: "0123456789",
          bank_account_name: "Amina Yusuf",
          referral_buyer_code: "BUYER-A3F2B1C9",
          referral_agent_code: "AGENT-A3F2B1C9",
          is_state_manager: false,
          wallet: { available_balance: 250000, pending_balance: 50000 },
          total_confirmed_commissions: "150000.00",
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: "Agent not found" })
  getAgentById(@Param("id", ParseIntPipe) id: number) {
    return this.adminService.getAgentById(id);
  }

  @Patch("agents/:id/status")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Approve or reject an agent application" })
  @ApiParam({ name: "id", type: "integer", example: 5 })
  @ApiBody({
    schema: {
      type: "object",
      required: ["status"],
      properties: {
        status: {
          type: "string",
          enum: ["approved", "rejected"],
          example: "approved",
        },
        admin_notes: {
          type: "string",
          example: "Great profile, approved for Kaduna North",
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description:
      "Status updated — referral codes and wallet created on approval",
    schema: {
      example: {
        statusCode: 200,
        message: "Agent approved successfully",
        data: null,
      },
    },
  })
  @ApiResponse({ status: 404, description: "Agent not found" })
  updateAgentStatus(
    @Param("id", ParseIntPipe) id: number,
    @Body(new ZodValidationPipe(updateAgentStatusSchema))
    dto: UpdateAgentStatusDto,
  ) {
    return this.adminService.updateAgentStatus(id, dto);
  }

  @Patch("agents/:id/suspend")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Suspend an approved agent" })
  @ApiParam({ name: "id", type: "integer", example: 5 })
  @ApiResponse({
    status: 200,
    schema: {
      example: { statusCode: 200, message: "Agent suspended", data: null },
    },
  })
  suspendAgent(@Param("id", ParseIntPipe) id: number) {
    return this.adminService.suspendAgent(id);
  }

  @Patch("agents/:id/unsuspend")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Unsuspend a suspended agent" })
  @ApiParam({ name: "id", type: "integer", example: 5 })
  @ApiResponse({
    status: 200,
    schema: {
      example: { statusCode: 200, message: "Agent unsuspended", data: null },
    },
  })
  unsuspendAgent(@Param("id", ParseIntPipe) id: number) {
    return this.adminService.unsuspendAgent(id);
  }

  @Patch("agents/:id/promote-manager")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Promote an agent to State Manager" })
  @ApiParam({ name: "id", type: "integer", example: 5 })
  @ApiBody({
    schema: {
      type: "object",
      required: ["managed_state"],
      properties: {
        managed_state: { type: "string", example: "Kaduna" },
      },
    },
  })
  @ApiResponse({
    status: 200,
    schema: {
      example: {
        statusCode: 200,
        message: "Agent promoted to State Manager",
        data: null,
      },
    },
  })
  promoteToStateManager(
    @Param("id", ParseIntPipe) id: number,
    @Body(new ZodValidationPipe(promoteManagerSchema)) dto: PromoteManagerDto,
  ) {
    return this.adminService.promoteToStateManager(id, dto);
  }

  @Patch("agents/:id/target")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Set agent monthly sales target" })
  @ApiParam({ name: "id", type: "integer", example: 5 })
  @ApiBody({
    schema: {
      type: "object",
      required: ["target"],
      properties: {
        target: { type: "integer", example: 50 },
      },
    },
  })
  @ApiResponse({
    status: 200,
    schema: {
      example: {
        statusCode: 200,
        message: "Target updated",
        data: { agentId: 5, target: 50 },
      },
    },
  })
  setAgentTarget(
    @Param("id", ParseIntPipe) id: number,
    @Body("target", ParseIntPipe) target: number,
  ) {
    return this.adminService.setAgentTarget(id, target);
  }

  // ─── Buyers ─────────────────────────────────────────────────────────────────

  @Get("buyers")
  @ApiOperation({ summary: "List all registered buyers" })
  @ApiResponse({
    status: 200,
    description: "Buyers retrieved",
    schema: {
      example: {
        statusCode: 200,
        message: "Buyers retrieved",
        data: [
          {
            id: 12,
            first_name: "Ngozi",
            last_name: "Eze",
            email: "ngozi@example.com",
            phone: "08055556666",
            is_email_verified: true,
            is_blocked: false,
            referred_by_agent_id: 5,
            joined_at: "2026-04-01T08:00:00.000Z",
          },
        ],
      },
    },
  })
  getBuyers() {
    return this.adminService.getBuyers();
  }

  @Get("buyers/:id")
  @ApiOperation({ summary: "Get a single buyer with their order history" })
  @ApiParam({ name: "id", type: "integer", example: 12 })
  @ApiResponse({
    status: 200,
    description: "Buyer retrieved",
    schema: {
      example: {
        statusCode: 200,
        message: "Buyer retrieved",
        data: {
          id: 12,
          first_name: "Ngozi",
          email: "ngozi@example.com",
          is_blocked: false,
          orders: [],
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: "Buyer not found" })
  getBuyerById(@Param("id", ParseIntPipe) id: number) {
    return this.adminService.getBuyerById(id);
  }

  @Patch("buyers/:id/block")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Block a buyer from placing orders" })
  @ApiParam({ name: "id", type: "integer", example: 12 })
  @ApiResponse({
    status: 200,
    schema: {
      example: { statusCode: 200, message: "Buyer blocked", data: null },
    },
  })
  blockBuyer(@Param("id", ParseIntPipe) id: number) {
    return this.adminService.toggleBlockBuyer(id, true);
  }

  @Patch("buyers/:id/unblock")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Unblock a buyer" })
  @ApiParam({ name: "id", type: "integer", example: 12 })
  @ApiResponse({
    status: 200,
    schema: {
      example: { statusCode: 200, message: "Buyer unblocked", data: null },
    },
  })
  unblockBuyer(@Param("id", ParseIntPipe) id: number) {
    return this.adminService.toggleBlockBuyer(id, false);
  }

  // ─── Stock & Inventory ───────────────────────────────────────────────────────

  @Get("stock/requests")
  @ApiOperation({ summary: "List all agent stock requests" })
  @ApiQuery({
    name: "status",
    required: false,
    enum: ["pending", "fulfilled", "cancelled"],
  })
  @ApiResponse({
    status: 200,
    description: "Stock requests retrieved",
    schema: {
      example: {
        statusCode: 200,
        message: "Stock requests retrieved",
        data: [
          {
            id: 3,
            agent_id: 5,
            agent_name: "Amina",
            agent_last_name: "Yusuf",
            quantity: 10,
            status: "pending",
            amount_to_remit: 1300000,
            amount_remitted: 0,
            fulfilled_at: null,
            created_at: "2026-04-07T09:00:00.000Z",
          },
        ],
      },
    },
  })
  getStockRequests(
    @Query("status") status?: "pending" | "fulfilled" | "cancelled",
  ) {
    return this.adminService.getStockRequests(status);
  }

  @Patch("stock/requests/:id/fulfil")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Mark a stock request as fulfilled (stock dispatched)",
  })
  @ApiParam({ name: "id", type: "integer", example: 3 })
  @ApiResponse({
    status: 200,
    schema: {
      example: {
        statusCode: 200,
        message: "Stock request fulfilled",
        data: null,
      },
    },
  })
  @ApiResponse({ status: 400, description: "Not a pending request" })
  @ApiResponse({ status: 404, description: "Request not found" })
  fulfilStockRequest(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.adminService.fulfilStockRequest(id, user.sub);
  }

  @Get("stock/inventory")
  @ApiOperation({
    summary: "Warehouse inventory: total received / dispatched / current stock",
  })
  @ApiResponse({
    status: 200,
    description: "Inventory stats retrieved",
    schema: {
      example: {
        statusCode: 200,
        message: "Inventory stats retrieved",
        data: {
          total_received: 500,
          total_dispatched: 120,
          current_stock: 380,
        },
      },
    },
  })
  getInventoryStats() {
    return this.adminService.getInventoryStats();
  }

  @Post("stock/inventory")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Record stock received from supplier" })
  @ApiBody({
    schema: {
      type: "object",
      required: ["quantity", "source"],
      properties: {
        quantity: { type: "integer", example: 200 },
        source: { type: "string", example: "Farm Direct Ltd" },
        notes: { type: "string", example: "April batch delivery" },
      },
    },
  })
  @ApiResponse({
    status: 201,
    schema: {
      example: { statusCode: 201, message: "Inventory recorded", data: null },
    },
  })
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
  @ApiOperation({
    summary: "List all contact form leads from the landing page",
  })
  @ApiResponse({
    status: 200,
    description: "Leads retrieved",
    schema: {
      example: {
        statusCode: 200,
        message: "Leads retrieved",
        data: [
          {
            id: 1,
            full_name: "Chukwudi Obi",
            email: "chukwudi@example.com",
            message: "I'd like to order weekly.",
            created_at: "2026-04-01T15:00:00.000Z",
          },
        ],
      },
    },
  })
  getLeads() {
    return this.adminService.getLeads();
  }

  // ─── KYC ────────────────────────────────────────────────────────────────────

  @Get("kyc")
  @ApiOperation({ summary: "List all agents with pending KYC submissions" })
  @ApiResponse({
    status: 200,
    description: "Pending KYC list",
    schema: {
      example: {
        statusCode: 200,
        message: "Pending KYC list retrieved",
        data: [
          {
            id: 5,
            first_name: "Amina",
            last_name: "Yusuf",
            email: "amina@example.com",
            kyc_status: "submitted",
            id_type: "NIN",
            id_front_url: "/tmp/uploads/id_front.jpg",
            id_selfie_url: "/tmp/uploads/id_selfie.jpg",
            bank_name: "GTBank",
            bank_account_number: "0123456789",
            bank_account_name: "Amina Yusuf",
          },
        ],
      },
    },
  })
  getPendingKyc() {
    return this.adminService.getPendingKyc();
  }

  @Patch("agents/:id/kyc")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Approve or reject an agent's KYC submission" })
  @ApiParam({ name: "id", type: "integer", example: 5 })
  @ApiBody({
    schema: {
      type: "object",
      required: ["action"],
      properties: {
        action: {
          type: "string",
          enum: ["approved", "rejected"],
          example: "approved",
        },
        reason: {
          type: "string",
          example: "Selfie photo is unclear, please resubmit",
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    schema: {
      example: {
        statusCode: 200,
        message: "KYC approved successfully",
        data: null,
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: "No submitted KYC found for this agent",
  })
  reviewKyc(
    @Param("id", ParseIntPipe) id: number,
    @Body(new ZodValidationPipe(reviewKycSchema)) dto: ReviewKycDto,
  ) {
    return this.adminService.reviewKyc(id, dto);
  }

  // ─── Commissions ────────────────────────────────────────────────────────────

  @Patch("commissions/:id/paid")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Mark a commission as paid after manual bank transfer",
  })
  @ApiParam({ name: "id", type: "integer", example: 8 })
  @ApiResponse({
    status: 200,
    schema: {
      example: {
        statusCode: 200,
        message: "Commission marked as paid",
        data: null,
      },
    },
  })
  markCommissionPaid(@Param("id", ParseIntPipe) id: number) {
    return this.adminService.markCommissionPaid(id);
  }
}
