import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
} from "@nestjs/swagger";
import { AuthGuard } from "../../../shared/guards/auth.guard";
import { RolesGuard } from "../../../shared/guards/roles.guard";
import { AdminKeyGuard } from "../../../shared/guards/admin-key.guard";
import { Roles } from "../../../shared/decorators/roles.decorator";
import { CurrentUser } from "../../../shared/decorators/current-user.decorator";
import { ZodValidationPipe } from "../../../../infrastructure/pipeline/validation.pipeline";
import { JwtPayload } from "../../../../interfaces/users/jwt.type";
import { ZoneAdminService } from "./zone-admin.service";
import { DeliveryPromotionService } from "./delivery-promotion.service";
import {
  createZoneSchema,
  updateZoneSchema,
  CreateZoneDto,
  UpdateZoneDto,
} from "./dto/zone.dto";
import { createPromotionSchema, CreatePromotionDto } from "./dto/promotion.dto";
import {
  DELIVERY_CAP_OVER_BASE_KOBO,
  INDIVIDUAL_QUOTE_PACKAGE_THRESHOLD,
  INDIVIDUAL_QUOTE_SUBTOTAL_KOBO,
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

/*
 * Delivery rates and campaigns, for an operator.
 *
 * Guards match every other admin write: the admin's own JWT identifies them,
 * AdminKeyGuard confirms they hold admin access, RolesGuard confirms the role.
 * Writes here move money for every future order, so they are additionally
 * limited to the super tier.
 */
@ApiTags("Admin")
@ApiBearerAuth("access-token")
@Controller("admin/pricing")
@UseGuards(AuthGuard, AdminKeyGuard, RolesGuard)
@Roles("admin")
export class PricingAdminController {
  constructor(
    private readonly zones: ZoneAdminService,
    private readonly promotions: DeliveryPromotionService,
  ) {}

  private assertSuper(user: JwtPayload): void {
    if (user.admin_tier !== "super") {
      throw new ForbiddenException(
        "Only a super admin can change delivery rates or run campaigns.",
      );
    }
  }

  // === Fee rules

  @Get("fee-rules")
  @ApiOperation({
    summary: "The code-owned fee rules, read only",
    description:
      "Imported from @debridgers/pricing. These are not editable: a second copy of a rate is how a placeholder price outlived the product it described. Changing them is a deploy.",
  })
  getFeeRules() {
    return {
      message: "Fee rules retrieved",
      data: {
        service_fee_rate: SERVICE_FEE_RATE,
        service_fee_min_kobo: SERVICE_FEE_MIN_KOBO,
        service_fee_max_kobo: SERVICE_FEE_MAX_KOBO,
        packages_included_in_base: PACKAGES_INCLUDED_IN_BASE,
        tier_one_package_count: TIER_ONE_PACKAGE_COUNT,
        default_tier_one_per_package_kobo: TIER_ONE_PER_PACKAGE_KOBO,
        default_tier_two_per_package_kobo: TIER_TWO_PER_PACKAGE_KOBO,
        default_delivery_cap_over_base_kobo: DELIVERY_CAP_OVER_BASE_KOBO,
        minimum_order_kobo: MINIMUM_ORDER_KOBO,
        minimum_order_packages: MINIMUM_ORDER_PACKAGES,
        individual_quote_package_threshold: INDIVIDUAL_QUOTE_PACKAGE_THRESHOLD,
        individual_quote_subtotal_kobo: INDIVIDUAL_QUOTE_SUBTOTAL_KOBO,
      },
    };
  }

  // === Zones

  @Get("zones")
  @ApiOperation({
    summary: "Every zone with its full rate card, including inactive ones",
  })
  listZones() {
    return this.zones.list();
  }

  @Post("zones")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Create a delivery zone" })
  createZone(
    @CurrentUser() user: JwtPayload,
    @Body(new ZodValidationPipe(createZoneSchema)) dto: CreateZoneDto,
  ) {
    this.assertSuper(user);
    return this.zones.create(dto, user.sub);
  }

  @Patch("zones/:id")
  @ApiOperation({
    summary: "Correct a zone's rates",
    description:
      "Refuses a taper whose tier two is not strictly below tier one, checked against the stored row so a partial patch cannot invert it.",
  })
  @ApiParam({ name: "id", example: 1 })
  updateZone(
    @CurrentUser() user: JwtPayload,
    @Param("id", ParseIntPipe) id: number,
    @Body(new ZodValidationPipe(updateZoneSchema)) dto: UpdateZoneDto,
  ) {
    this.assertSuper(user);
    return this.zones.update(id, dto, user.sub);
  }

  @Delete("zones/:id")
  @ApiOperation({
    summary: "Deactivate a zone",
    description:
      "Soft. Orders reference zones with ON DELETE RESTRICT, so a hard delete would either fail or take history with it.",
  })
  @ApiParam({ name: "id", example: 1 })
  deactivateZone(
    @CurrentUser() user: JwtPayload,
    @Param("id", ParseIntPipe) id: number,
  ) {
    this.assertSuper(user);
    return this.zones.deactivate(id, user.sub);
  }

  // === Promotions

  @Get("promotions")
  @ApiOperation({ summary: "Every free-delivery campaign, running or not" })
  listPromotions() {
    return this.promotions.list();
  }

  @Get("promotions/cost")
  @ApiOperation({
    summary: "What each campaign gave away, in kobo",
    description:
      "Summed from the pre-promotion fee recorded on each order, so the figure survives a later rate change.",
  })
  promotionCost() {
    return this.promotions.cost();
  }

  @Post("promotions")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Start a free-delivery campaign with a window" })
  createPromotion(
    @CurrentUser() user: JwtPayload,
    @Body(new ZodValidationPipe(createPromotionSchema)) dto: CreatePromotionDto,
  ) {
    this.assertSuper(user);
    return this.promotions.create(dto, user.sub);
  }

  @Patch("promotions/:id/end")
  @ApiOperation({ summary: "End a campaign now rather than at its end date" })
  @ApiParam({ name: "id", example: 1 })
  endPromotion(
    @CurrentUser() user: JwtPayload,
    @Param("id", ParseIntPipe) id: number,
  ) {
    this.assertSuper(user);
    return this.promotions.endNow(id);
  }
}
