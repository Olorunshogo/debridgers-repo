import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { CloudinaryService } from "../../../infrastructure/cloudinary/cloudinary.service";
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
import { BankDetailsService } from "../agent/bank-details.service";
import { TaxonomyService } from "../catalog/taxonomy.service";
import { AuthGuard } from "../../shared/guards/auth.guard";
import { RolesGuard } from "../../shared/guards/roles.guard";
import { AdminId } from "../../shared/decorators/admin-id.decorator";
import { CurrentUser } from "../../shared/decorators/current-user.decorator";
import { Roles } from "../../shared/decorators/roles.decorator";
import { AdminApiKeysService } from "./admin-api-keys.service";
import { ZodValidationPipe } from "../../../infrastructure/pipeline/validation.pipeline";
import { JwtPayload } from "../../../interfaces/users/jwt.type";
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
import {
  createProductSchema,
  CreateProductDto,
} from "./dto/create-product.dto";
import {
  updateProductSchema,
  UpdateProductDto,
} from "./dto/update-product.dto";
import { createCategorySchema, updateCategorySchema } from "./dto/category.dto";
import { z } from "zod";
import {
  parseOptionalBoolean,
  parseOptionalEnum,
  parsePagination,
} from "../../../infrastructure/helper/query.helper";
import { ORDER_STATUSES } from "../../shared/order-status";

const updateOrderStatusSchema = z.object({
  status: z.enum(ORDER_STATUSES),
});
const PAYMENT_STATUSES = ["unpaid", "awaiting", "paid", "failed"] as const;
const AGENT_STATUSES = [
  "pending",
  "approved",
  "rejected",
  "suspended",
] as const;
const KYC_STATUSES = [
  "not_submitted",
  "submitted",
  "approved",
  "rejected",
] as const;
const COMMISSION_STATUSES = ["pending", "confirmed", "paid"] as const;
const COMMISSION_TYPES = [
  "direct",
  "buyer_referral",
  "agent_override",
  "state_manager_override",
] as const;

const createOutreachSchema = z.object({
  full_name: z.string().min(2),
  phone: z.string().min(6),
  shop_name: z.string().optional(),
  lga: z.string().optional(),
  area: z.string().optional(),
  product_interest: z.string().optional(),
  estimated_quantity: z.number().optional(),
  how_heard: z.string().optional(),
  notes: z.string().optional(),
  visit_date: z.string().optional(),
});
type CreateOutreachDto = z.infer<typeof createOutreachSchema>;

/*
 * Admin routes authenticate with the admin's own JWT, not a shared secret.
 *
 * These previously sat behind AdminKeysGuard, which checks two static headers
 * and no identity at all - so every admin action was unattributable, and the
 * keys had to reach whoever called them, including the browser. The @Roles
 * comment on the outreach handler below still refers to a class-level
 * @Roles("admin") that had been dropped, which is the shape restored here.
 */
@ApiTags("Admin")
@ApiBearerAuth("access-token")
@Controller("admin")
@UseGuards(AuthGuard, RolesGuard)
@Roles("admin")
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly bankDetailsService: BankDetailsService,
    private readonly taxonomy: TaxonomyService,
    private readonly cloudinaryService: CloudinaryService,
    private readonly adminApiKeysService: AdminApiKeysService,
  ) {}

  @Get("me")
  @ApiOperation({ summary: "Get the current admin's profile" })
  getMe(@CurrentUser() user: JwtPayload) {
    return this.adminService.getAdminMe(user.sub);
  }

  @Post("upload")
  @UseInterceptors(FileInterceptor("file"))
  @ApiOperation({ summary: "Upload a product image to Cloudinary" })
  async uploadImage(@UploadedFile() file?: Express.Multer.File) {
    if (!file?.buffer) {
      throw new BadRequestException("No file uploaded under the 'file' field.");
    }

    const url = await this.cloudinaryService.uploadBuffer(
      file.buffer,
      "debridgers/products",
    );
    return { message: "Image uploaded", data: { url } };
  }

  // === Dashboard

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

  // === Agents

  @Get("agents")
  @ApiOperation({ summary: "List all agents - filter by status" })
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
  getAgents(@Query("status") status?: string) {
    return this.adminService.getAgents(
      parseOptionalEnum(status, AGENT_STATUSES, "status"),
    );
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
      "Status updated: referral codes and wallet created on approval",
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
  suspendAgent(
    @Param("id", ParseIntPipe) id: number,
    @AdminId() adminId: number,
  ) {
    return this.adminService.suspendAgent(id, adminId);
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

  // === Orders

  @Get("orders")
  @ApiOperation({
    summary: "List all orders — with buyer name, amount, payment status",
    description:
      "Supports ?status=pending|confirmed|delivered|cancelled, ?payment_status=unpaid|paid, ?search=name/email, ?page=1&limit=50",
  })
  getAllOrders(
    @Query("status") status?: string,
    @Query("payment_status") payment_status?: string,
    @Query("search") search?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    const paging = parsePagination(page, limit);
    return this.adminService.getAllOrders({
      status: parseOptionalEnum(status, ORDER_STATUSES, "status"),
      payment_status: parseOptionalEnum(
        payment_status,
        PAYMENT_STATUSES,
        "payment_status",
      ),
      search,
      page: paging.page,
      limit: paging.limit,
    });
  }

  @Get("orders/:id")
  @ApiOperation({
    summary: "Get a single order with full buyer and payment detail",
  })
  getOrderById(@Param("id", ParseIntPipe) id: number) {
    return this.adminService.getOrderById(id);
  }

  @Patch("orders/:id/status")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Advance an order through its lifecycle",
    description:
      "Legal moves: pending → confirmed → out_for_delivery → delivered, and cancelled from any open state. Notifies the buyer on every change and stamps delivered_at.",
  })
  updateOrderStatus(
    @Param("id", ParseIntPipe) id: number,
    @Body(new ZodValidationPipe(updateOrderStatusSchema))
    dto: z.infer<typeof updateOrderStatusSchema>,
    @AdminId() adminId: number,
  ) {
    return this.adminService.updateOrderStatus(id, dto.status, adminId);
  }

  // === Buyers

  @Get("buyers")
  @ApiOperation({
    summary:
      "List all registered buyers - optionally filter by zone or suspended status",
  })
  @ApiQuery({ name: "zone_id", required: false, type: "integer", example: 1 })
  @ApiQuery({ name: "is_suspended", required: false, enum: ["true", "false"] })
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
            is_suspended: false,
            zone_id: 1,
            zone_name: "Ikoyi",
            referred_by_agent_id: 5,
            joined_at: "2026-04-01T08:00:00.000Z",
          },
        ],
      },
    },
  })
  getBuyers(
    @Query("zone_id") zoneId?: string,
    @Query("is_suspended") isSuspended?: string,
    @Query("is_blocked") isBlocked?: string,
  ) {
    return this.adminService.getBuyers(
      zoneId ? parseInt(zoneId, 10) : undefined,
      /* Tri-state: absent must stay undefined, or the list silently filters. */
      parseOptionalBoolean(isSuspended, "is_suspended"),
      parseOptionalBoolean(isBlocked, "is_blocked"),
    );
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
  blockBuyer(
    @Param("id", ParseIntPipe) id: number,
    @AdminId() adminId: number,
  ) {
    return this.adminService.toggleBlockBuyer(id, true, adminId);
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
  unblockBuyer(
    @Param("id", ParseIntPipe) id: number,
    @AdminId() adminId: number,
  ) {
    return this.adminService.toggleBlockBuyer(id, false, adminId);
  }

  @Patch("buyers/:id/suspend")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Suspend a buyer from placing orders" })
  @ApiParam({ name: "id", type: "integer", example: 12 })
  @ApiResponse({
    status: 200,
    schema: {
      example: { statusCode: 200, message: "Buyer suspended", data: null },
    },
  })
  suspendBuyer(@Param("id", ParseIntPipe) id: number) {
    return this.adminService.suspendBuyer(id);
  }

  @Patch("buyers/:id/unsuspend")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Unsuspend a buyer" })
  @ApiParam({ name: "id", type: "integer", example: 12 })
  @ApiResponse({
    status: 200,
    schema: {
      example: { statusCode: 200, message: "Buyer unsuspended", data: null },
    },
  })
  unsuspendBuyer(@Param("id", ParseIntPipe) id: number) {
    return this.adminService.unsuspendBuyer(id);
  }

  @Get("buyers/:id/wallet/transactions")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "View any buyer's wallet transaction history" })
  @ApiParam({ name: "id", type: "integer", example: 12 })
  @ApiQuery({ name: "page", required: false, example: 1 })
  @ApiQuery({ name: "limit", required: false, example: 10 })
  @ApiResponse({
    status: 200,
    description: "Wallet transactions retrieved",
    schema: {
      example: {
        statusCode: 200,
        message: "Wallet transactions retrieved",
        data: {
          wallet: {
            id: 5,
            available_balance: 500000,
            pending_balance: 50000,
            total_deposited: 1000000,
          },
          transactions: [
            {
              id: 1,
              wallet_id: 5,
              type: "deposit",
              amount: 100000,
              status: "completed",
              reference: "paystack_order_123_1691234567",
              description: "Deposit via Paystack",
              created_at: "2026-08-07T10:30:00.000Z",
            },
          ],
          pagination: { page: 1, limit: 10, total: 5 },
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: "Buyer not found" })
  getBuyerWalletTransactions(
    @Param("id", ParseIntPipe) userId: number,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    const paging = parsePagination(page, limit, 10);
    return this.adminService.getBuyerWalletTransactions(
      userId,
      paging.page,
      paging.limit,
    );
  }

  // === Stock & Inventory

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

  // === Leads

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

  // === Outreach

  @Post("outreach")
  @HttpCode(HttpStatus.CREATED)
  @Roles("admin", "agent") // agents do field outreach; overrides class-level @Roles("admin")
  @ApiOperation({
    summary: "Record a new outreach / offline customer visit (admin + agent)",
  })
  @ApiBody({
    schema: {
      type: "object",
      required: ["full_name", "phone", "visit_date"],
      properties: {
        full_name: { type: "string", example: "Musa Ibrahim" },
        phone: { type: "string", example: "08012345678" },
        shop_name: { type: "string", example: "Ibrahim Grains" },
        lga: { type: "string", example: "Chikun" },
        area: { type: "string", example: "Barnawa" },
        product_interest: { type: "string", example: "Maize" },
        estimated_quantity: { type: "number", example: 5 },
        how_heard: { type: "string", example: "Word of mouth" },
        notes: { type: "string" },
        visit_date: { type: "string", example: "2026-06-10" },
      },
    },
  })
  /* Bound to @Body, not the handler: as @UsePipes it also validated
     @CurrentUser against this schema and rejected every request. */
  createOutreachRecord(
    @Body(new ZodValidationPipe(createOutreachSchema)) dto: CreateOutreachDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.adminService.createOutreachRecord({
      shop_name: dto.shop_name ?? dto.full_name,
      owner_name: dto.full_name,
      phone: dto.phone,
      lga: dto.lga,
      product_interest: dto.product_interest,
      quantity: dto.estimated_quantity,
      notes:
        [dto.how_heard ? `How heard: ${dto.how_heard}` : "", dto.notes ?? ""]
          .filter(Boolean)
          .join(" | ") || undefined,
      collected_by: `${user.role}:${user.sub}`,
      visit_date: dto.visit_date ?? new Date().toISOString().split("T")[0],
    });
  }

  @Get("outreach")
  @ApiOperation({ summary: "List all outreach records" })
  listOutreachRecords() {
    return this.adminService.listOutreachRecords();
  }

  @Delete("outreach/:id")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Delete an outreach record" })
  deleteOutreachRecord(@Param("id", ParseIntPipe) id: number) {
    return this.adminService.deleteOutreachRecord(id);
  }

  // === KYC

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
            id_front_url:
              "https://res.cloudinary.com/debridgers/image/upload/v1/debridgers/kyc/id_front.jpg",
            id_selfie_url:
              "https://res.cloudinary.com/debridgers/image/upload/v1/debridgers/kyc/id_selfie.jpg",
            bank_name: "GTBank",
            bank_account_number: "0123456789",
            bank_account_name: "Amina Yusuf",
          },
        ],
      },
    },
  })
  getPendingKyc(@Query("kyc_status") kycStatus?: string) {
    return this.adminService.getPendingKyc(
      parseOptionalEnum(kycStatus, KYC_STATUSES, "kyc_status") ?? "submitted",
    );
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

  // === Commissions

  /*
   * Commissions could be marked paid but never listed, so the 15 seeded rows
   * were unreachable through the API and a payout decision had nothing to read.
   */
  @Get("commissions")
  @ApiOperation({ summary: "List commissions with filters and pagination" })
  @ApiQuery({ name: "status", required: false, enum: COMMISSION_STATUSES })
  @ApiQuery({ name: "type", required: false, enum: COMMISSION_TYPES })
  @ApiQuery({ name: "agent_id", required: false, type: "integer" })
  @ApiQuery({ name: "page", required: false, type: "integer" })
  @ApiQuery({ name: "limit", required: false, type: "integer" })
  @ApiResponse({ status: 200, description: "Commissions retrieved" })
  getCommissions(
    @Query("status") status?: string,
    @Query("type") type?: string,
    @Query("agent_id") agentId?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    const paging = parsePagination(page, limit);
    return this.adminService.getCommissions({
      status: parseOptionalEnum(status, COMMISSION_STATUSES, "status"),
      type: parseOptionalEnum(type, COMMISSION_TYPES, "type"),
      agentId: agentId ? parseInt(agentId, 10) : undefined,
      page: paging.page,
      limit: paging.limit,
    });
  }

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
  markCommissionPaid(
    @Param("id", ParseIntPipe) id: number,
    @AdminId() adminId: number,
  ) {
    return this.adminService.markCommissionPaid(id, adminId);
  }

  // === Products

  @Post("products")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Add a product to the catalog" })
  createProduct(
    @Body(new ZodValidationPipe(createProductSchema)) dto: CreateProductDto,
  ) {
    return this.adminService.createProduct(dto);
  }

  @Get("products")
  @ApiOperation({ summary: "List all products (including inactive)" })
  async listProducts() {
    try {
      return await this.adminService.listProducts();
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error("❌ ADMIN PRODUCTS ERROR:", msg);
      throw error;
    }
  }

  @Patch("products/:id")
  @ApiOperation({ summary: "Update a product (price, name, active status)" })
  updateProduct(
    @Param("id", ParseIntPipe) id: number,
    @Body(new ZodValidationPipe(updateProductSchema)) dto: UpdateProductDto,
  ) {
    return this.adminService.updateProduct(id, dto);
  }

  @Delete("products/:id")
  @ApiOperation({ summary: "Delete a product" })
  deleteProduct(@Param("id", ParseIntPipe) id: number) {
    return this.adminService.deleteProduct(id);
  }

  // === Platform Settings

  @Get("settings")
  @ApiOperation({
    summary: "Get current platform settings (commission rate etc.)",
  })
  getSettings() {
    return this.adminService.getSettings();
  }

  @Patch("settings")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Update a platform setting (key + value)" })
  @ApiBody({
    schema: {
      type: "object",
      required: ["key", "value"],
      properties: {
        key: { type: "string", example: "agent_commission_rate" },
        value: { type: "string", example: "25" },
      },
    },
  })
  updateSetting(
    @Body("key") key: string,
    @Body("value") value: string,
    @AdminId() adminId: number,
  ) {
    return this.adminService.updateSetting(key, value, adminId);
  }

  // === Product taxonomy

  @Get("categories")
  @ApiOperation({
    summary: "Full taxonomy tree, including deactivated nodes",
  })
  getCategoryTree() {
    return this.taxonomy.getTreeResponse(false);
  }

  @Get("categories/leaves")
  @ApiOperation({
    summary: "Selectable leaf categories with their full path",
    description:
      "What the product form binds to. Only leaves are offered, because attaching a product to 'Grains' rather than 'Grains > Rice > Ofada' is what the old flat category column already did badly.",
  })
  getCategoryLeaves() {
    return this.taxonomy.getLeaves();
  }

  @Post("categories")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Create a category, type or variety" })
  @ApiBody({
    schema: {
      type: "object",
      required: ["name"],
      properties: {
        name: { type: "string", example: "Ofada" },
        parent_id: {
          type: "number",
          nullable: true,
          example: 4,
          description: "Omit or null for a top-level category.",
        },
        description: { type: "string", nullable: true },
        image_url: { type: "string", nullable: true },
        sort_order: { type: "number", example: 2 },
      },
    },
  })
  createCategory(
    @Body(new ZodValidationPipe(createCategorySchema))
    dto: z.infer<typeof createCategorySchema>,
  ) {
    return this.taxonomy.createCategory(dto);
  }

  @Patch("categories/:id")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Rename or restyle a taxonomy node" })
  @ApiParam({ name: "id", example: 12 })
  updateCategory(
    @Param("id", ParseIntPipe) id: number,
    @Body(new ZodValidationPipe(updateCategorySchema))
    dto: z.infer<typeof updateCategorySchema>,
  ) {
    return this.taxonomy.updateCategory(id, dto);
  }

  @Delete("categories/:id")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Deactivate a taxonomy node",
    description:
      "Soft delete. A hard delete would cascade to every descendant and null the taxonomy on all products beneath it.",
  })
  @ApiParam({ name: "id", example: 12 })
  deactivateCategory(@Param("id", ParseIntPipe) id: number) {
    return this.taxonomy.deactivateCategory(id);
  }

  // === Withdrawals

  @Get("withdrawals")
  @ApiOperation({
    summary: "List agent payout requests",
    description:
      "Optionally filter by status: pending, approved, rejected, paid.",
  })
  @ApiQuery({ name: "status", required: false, example: "pending" })
  getWithdrawals(@Query("status") status?: string) {
    return this.adminService.getWithdrawals(status);
  }

  @Patch("withdrawals/:id/approve")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Approve a payout request",
    description:
      "Marks a pending payout as payable. Does not transfer: the Friday sweep or an explicit payout call does that, so approving cannot move money by misclick.",
  })
  @ApiParam({ name: "id", example: 7 })
  @ApiResponse({ status: 200, description: "Payout approved" })
  @ApiResponse({ status: 400, description: "Payout is not pending" })
  approveWithdrawal(
    @Param("id", ParseIntPipe) id: number,
    @AdminId() adminId: number,
  ) {
    return this.adminService.approveWithdrawal(id, adminId);
  }

  @Patch("withdrawals/:id/reject")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Reject a payout request",
    description:
      "Rejects the payout and returns the amount to the agent's available balance, which the request had debited up front.",
  })
  @ApiParam({ name: "id", example: 7 })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        reason: { type: "string", example: "Bank details do not match KYC" },
      },
    },
  })
  @ApiResponse({ status: 200, description: "Payout rejected" })
  rejectWithdrawal(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() admin: JwtPayload,
    @Body("reason") reason?: string,
  ) {
    return this.adminService.rejectWithdrawal(id, admin.sub, reason);
  }

  // === Maintenance

  @Post("agents/backfill-bank-codes")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Fill in missing agent bank codes",
    description:
      "One-off repair for agents who submitted KYC before bank codes were captured. Matches each stored bank name against the live bank list and fills the code only where the match is unambiguous; anything else is returned for manual review rather than guessed.",
  })
  @ApiResponse({
    status: 200,
    description: "Backfill complete",
    schema: {
      example: {
        statusCode: 200,
        message: "Backfill complete",
        data: {
          updated: 12,
          unmatched: [{ user_id: 41, bank_name: "First bank" }],
        },
      },
    },
  })
  backfillBankCodes() {
    return this.bankDetailsService.backfillBankCodes();
  }

  // === API Key Management

  @Post("api-keys")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Create a new API key for this admin" })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          example: "Production",
          description: "Friendly name for this key",
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: "API key created (shown only once)",
  })
  createApiKey(@Body("name") name: string, @AdminId() adminId: number) {
    return this.adminApiKeysService.createApiKey(adminId, name);
  }

  @Get("api-keys")
  @ApiOperation({
    summary: "List API keys for this admin, active only unless asked otherwise",
  })
  @ApiQuery({ name: "is_active", required: false, enum: ["true", "false"] })
  @ApiResponse({ status: 200, description: "API keys listed" })
  listApiKeys(
    @AdminId() adminId: number,
    @Query("is_active") isActive?: string,
  ) {
    return this.adminApiKeysService.listApiKeys(
      adminId,
      parseOptionalBoolean(isActive, "is_active"),
    );
  }

  @Delete("api-keys/:keyId")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Deactivate an API key" })
  @ApiParam({ name: "keyId", example: 1 })
  @ApiResponse({ status: 200, description: "API key deactivated" })
  deactivateApiKey(
    @Param("keyId", ParseIntPipe) keyId: number,
    @AdminId() adminId: number,
  ) {
    return this.adminApiKeysService.deactivateApiKey(keyId, adminId);
  }
}
