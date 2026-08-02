import {
  Controller,
  Get,
  Inject,
  Post,
  Body,
  HttpCode,
  UsePipes,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { SkipThrottle } from "@nestjs/throttler";
import { NodePgDatabase } from "drizzle-orm/node-postgres";
import { eq } from "drizzle-orm";
import * as schema from "../../../infrastructure/persistence/index";
import { DATABASE_CONNECTION } from "../../../infrastructure/database/database.provider";
import { z } from "zod";
import { ZodValidationPipe } from "../../../infrastructure/pipeline/validation.pipeline";
import { SystemSettingsService } from "../settings/system-settings.service";
import { TaxonomyService } from "../catalog/taxonomy.service";

const webLeadSchema = z.object({
  owner_name: z.string().min(2, "Name required"),
  phone: z.string().min(7, "Phone required"),
  shop_name: z.string().optional(),
  lga: z.string().optional(),
  area: z.string().optional(),
  product_interest: z.string().optional(),
  quantity: z.number().optional(),
  how_heard: z.string().optional(),
  notes: z.string().optional(),
});

type WebLeadDto = z.infer<typeof webLeadSchema>;

@ApiTags("Public")
@Controller()
export class PublicController {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
    private readonly settings: SystemSettingsService,
    private readonly taxonomy: TaxonomyService,
  ) {}

  @Get("products")
  @ApiOperation({ summary: "Browse all active products — no auth required" })
  @ApiResponse({ status: 200, description: "Products retrieved" })
  async getProducts() {
    const rows = await this.db
      .select({
        id: schema.products.id,
        name: schema.products.name,
        unit: schema.products.unit,
        price_kobo: schema.products.price_kobo,
        description: schema.products.description,
        image_url: schema.products.image_url,
        category: schema.products.category,
        measure_value: schema.products.measure_value,
        measure_unit: schema.products.measure_unit,
        /* Lets the shop and the agent stock flow group by the real taxonomy
           instead of the flat text label. */
        category_id: schema.products.category_id,
        category_name: schema.product_categories.name,
      })
      .from(schema.products)
      .leftJoin(
        schema.product_categories,
        eq(schema.product_categories.id, schema.products.category_id),
      )
      .where(eq(schema.products.is_active, true))
      .orderBy(schema.products.sort_order);

    return { message: "Products retrieved", data: rows };
  }

  @Get("zones")
  @ApiOperation({
    summary: "Active delivery zones - no auth required",
    description:
      "Checkout needs these before a buyer signs in, and the fee shown must match what the quote endpoint charges.",
  })
  @ApiResponse({ status: 200, description: "Zones retrieved" })
  async getZones() {
    const rows = await this.db
      .select({
        id: schema.zones.id,
        name: schema.zones.name,
        delivery_fee: schema.zones.delivery_fee,
        free_delivery: schema.zones.free_delivery,
        areas: schema.zones.areas,
      })
      .from(schema.zones)
      .where(eq(schema.zones.is_active, true))
      .orderBy(schema.zones.name);

    return { message: "Zones retrieved", data: rows };
  }

  @Get("categories")
  @SkipThrottle()
  @ApiOperation({
    summary: "Product taxonomy tree — no auth required",
    description:
      "Category > Type > Variety, nested. Branches are as deep as they need to be: Grains reaches three levels, Oil only two.",
  })
  @ApiResponse({ status: 200, description: "Categories retrieved" })
  async getCategories() {
    return this.taxonomy.getTreeResponse(true);
  }

  @Get("config/public")
  @SkipThrottle()
  @ApiOperation({ summary: "Public platform config (commission rate etc.)" })
  async getPublicConfig() {
    const commissionRate = await this.settings.getAgentCommissionPercent();
    const discountKobo = await this.settings.getInt(
      "buyer_referral_discount_kobo",
      50000,
    );

    return {
      message: "Config retrieved",
      data: {
        agent_commission_rate: commissionRate,
        buyer_referral_discount_kobo: discountKobo,
        buyer_referral_discount_type: "flat",
        currency: "NGN",
      },
    };
  }

  @Post("outreach/submit")
  @HttpCode(200)
  @SkipThrottle()
  @UsePipes(new ZodValidationPipe(webLeadSchema))
  @ApiOperation({ summary: "Public web lead / interest form submission" })
  async submitWebLead(@Body() dto: WebLeadDto) {
    await this.db.insert(schema.outreach_records).values({
      owner_name: dto.owner_name,
      phone: dto.phone,
      shop_name: dto.shop_name ?? "", // NOT NULL column, default empty string for web leads
      lga: dto.lga ?? null,
      area: dto.area ?? null,
      product_interest: dto.product_interest ?? null,
      quantity: dto.quantity ?? null,
      notes: dto.notes
        ? `${dto.how_heard ? `Source: ${dto.how_heard}. ` : ""}${dto.notes}`
        : dto.how_heard
          ? `Source: ${dto.how_heard}`
          : null,
      collected_by: "web-form",
      // toISOString always yields YYYY-MM-DDTHH:mm:ss.sssZ, so slice is exact
      visit_date: new Date().toISOString().slice(0, 10),
    });

    return {
      message:
        "We've received your information. An agent will reach out within 24 hours.",
      data: { success: true },
    };
  }
}
