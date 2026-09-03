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
import {
  DELIVERY_CAP_OVER_BASE_KOBO,
  MINIMUM_ORDER_KOBO,
  MINIMUM_ORDER_PACKAGES,
  PACKAGES_INCLUDED_IN_BASE,
  SERVICE_FEE_MAX_KOBO,
  SERVICE_FEE_MIN_KOBO,
  SERVICE_FEE_RATE,
  TIER_ONE_PACKAGE_COUNT,
  TIER_ONE_PER_PACKAGE_KOBO,
  TIER_TWO_PER_PACKAGE_KOBO,
} from "@debridgers/pricing";
import { DeliveryPromotionService } from "../admin/pricing/delivery-promotion.service";

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
    private readonly promotions: DeliveryPromotionService,
  ) {}

  @Get("products")
  @ApiOperation({ summary: "Browse all active products — no auth required" })
  @ApiResponse({ status: 200, description: "Products retrieved" })
  async getProducts() {
    const rows = await this.db
      .select({
        id: schema.productsTable.id,
        name: schema.productsTable.name,
        unit: schema.productsTable.unit,
        price_kobo: schema.productsTable.price_kobo,
        description: schema.productsTable.description,
        image_url: schema.productsTable.image_url,
        category: schema.productsTable.category,
        category_id: schema.productsTable.category_id,
      })
      .from(schema.productsTable)
      .where(eq(schema.productsTable.is_active, true))
      .orderBy(schema.productsTable.sort_order);

    /*
     * Labels come from the taxonomy, not from the stored text column.
     *
     * That column used to hold whatever the seeder wrote, which was the leaf
     * name - so a bag of honey beans announced itself as "Wake Gida" where a
     * category belonged. Deriving both levels here means the card and the
     * filter chips read the same tree and cannot disagree with it.
     *
     * The stored value is still the fallback for a product with no leaf yet.
     */
    const labels = await this.taxonomy.categoryLabels();

    const data = rows.map(({ category_id, category, ...product }) => {
      const derived = category_id ? labels.get(category_id) : undefined;

      return {
        ...product,
        /* Root ancestor - drives the shop's filter chips. */
        category: derived?.category ?? category,
        /* Immediate parent - labels the product card. */
        subcategory: derived?.subcategory ?? category,
      };
    });

    return { message: "Products retrieved", data };
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
        /*
         * The taper and the ceiling belong to the zone, not to the defaults in
         * /config/public. A client that quoted from those defaults was pricing
         * a far zone at the near zone's rates, which is how the buying desk
         * came to compute walk-away prices against a schedule checkout does not
         * charge.
         */
        tier_one_per_package_kobo: schema.zones.tier_one_per_package_kobo,
        tier_two_per_package_kobo: schema.zones.tier_two_per_package_kobo,
        delivery_cap_kobo: schema.zones.delivery_cap_kobo,
      })
      .from(schema.zones)
      .where(eq(schema.zones.is_active, true))
      .orderBy(schema.zones.name);

    return { message: "Zones retrieved", data: rows };
  }

  @Get("categories")
  @SkipThrottle({ short: true })
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
  @SkipThrottle({ short: true })
  @ApiOperation({
    summary: "Public platform config: commission rate and the pricing rules",
    description:
      "The pricing block is read from the same constants the checkout charge uses, so a client that quotes from this endpoint cannot drift from what the buyer is actually billed.",
  })
  async getPublicConfig() {
    const commissionRate = await this.settings.getAgentCommissionPercent();
    const discountKobo = await this.settings.getInt(
      "buyer_referral_discount_kobo",
      50000,
    );

    /*
     * The running free-delivery campaign, or null. Served publicly because the
     * shop and the zone picker announce it before anyone signs in, and because
     * a campaign nobody can see is a discount given away for nothing.
     */
    const promotion = await this.promotions.running();

    return {
      message: "Config retrieved",
      data: {
        agent_commission_rate: commissionRate,
        buyer_referral_discount_kobo: discountKobo,
        buyer_referral_discount_type: "flat",
        currency: "NGN",
        delivery_promotion: promotion,
        /*
         * Imported from @debridgers/pricing rather than restated here. Anything
         * that re-types these numbers is a place they can drift from the
         * charge, which is exactly how a ₦1,400 unit price outlived the
         * product it described.
         */
        pricing: {
          service_fee_rate: SERVICE_FEE_RATE,
          service_fee_min_kobo: SERVICE_FEE_MIN_KOBO,
          service_fee_max_kobo: SERVICE_FEE_MAX_KOBO,
          packages_included_in_base: PACKAGES_INCLUDED_IN_BASE,
          tier_one_package_count: TIER_ONE_PACKAGE_COUNT,
          /*
           * Defaults only. The taper and the ceiling are per zone, so a client
           * quoting a specific delivery must read them off that zone rather
           * than from here, or it will under-quote the far ones.
           */
          default_tier_one_per_package_kobo: TIER_ONE_PER_PACKAGE_KOBO,
          default_tier_two_per_package_kobo: TIER_TWO_PER_PACKAGE_KOBO,
          default_delivery_cap_over_base_kobo: DELIVERY_CAP_OVER_BASE_KOBO,
          minimum_order_kobo: MINIMUM_ORDER_KOBO,
          minimum_order_packages: MINIMUM_ORDER_PACKAGES,
        },
      },
    };
  }

  @Post("outreach/submit")
  @HttpCode(200)
  @SkipThrottle({ short: true })
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
