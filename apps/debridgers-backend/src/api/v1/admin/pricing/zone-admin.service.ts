import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { NodePgDatabase } from "drizzle-orm/node-postgres";
import { eq } from "drizzle-orm";
import * as schema from "../../../../infrastructure/persistence/index";
import { DATABASE_CONNECTION } from "../../../../infrastructure/database/database.provider";
import { AuditLogService } from "../../../../infrastructure/audit/audit-log.service";
import {
  CreateZoneDto,
  UpdateZoneDto,
  TAPER_MESSAGE,
} from "./dto/zone.dto";

/**
 * Zone delivery rates as data rather than as migrations.
 *
 * Base fee, both taper rates, the ceiling and the standing free-delivery flag
 * are per zone and change with a measurement, so an operator owns them. The fee
 * rules themselves - the 3%, its floor and cap, the minimum order - stay in
 * `@debridgers/pricing` and change by deploy. Putting those behind a toggle
 * would give a money figure a second home, which is the failure CLAUDE.md
 * exists to prevent.
 */
@Injectable()
export class ZoneAdminService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
    private readonly audit: AuditLogService,
  ) {}

  async list() {
    const rows = await this.db
      .select()
      .from(schema.zones)
      .orderBy(schema.zones.name);

    return { message: "Zones retrieved", data: rows };
  }

  async create(dto: CreateZoneDto, adminId: number) {
    const [created] = await this.db
      .insert(schema.zones)
      .values({
        name: dto.name,
        description: dto.description ?? null,
        delivery_fee: dto.delivery_fee,
        areas: dto.areas,
        tier_one_per_package_kobo: dto.tier_one_per_package_kobo,
        tier_two_per_package_kobo: dto.tier_two_per_package_kobo,
        delivery_cap_kobo: dto.delivery_cap_kobo,
        free_delivery: dto.free_delivery,
        is_active: dto.is_active,
      })
      .returning();

    await this.audit.record({
      admin_id: adminId,
      action: "zone.create",
      resource_type: "zone",
      resource_id: created.id,
      details: { name: created.name },
    });

    return { message: "Zone created", data: created };
  }

  async update(id: number, dto: UpdateZoneDto, adminId: number) {
    const [existing] = await this.db
      .select()
      .from(schema.zones)
      .where(eq(schema.zones.id, id))
      .limit(1);

    if (!existing) throw new NotFoundException("Zone not found");

    /*
     * Re-checked against the stored row, not only against the payload. A patch
     * that lowers tier one alone can invert a taper that was valid before it,
     * and the schema cannot see the other half of the pair.
     */
    const tierOne =
      dto.tier_one_per_package_kobo ?? existing.tier_one_per_package_kobo;
    const tierTwo =
      dto.tier_two_per_package_kobo ?? existing.tier_two_per_package_kobo;

    if (tierTwo >= tierOne) {
      throw new BadRequestException(TAPER_MESSAGE);
    }

    const [updated] = await this.db
      .update(schema.zones)
      .set({
        ...dto,
        description: dto.description ?? undefined,
        updated_at: new Date(),
      })
      .where(eq(schema.zones.id, id))
      .returning();

    await this.audit.record({
      admin_id: adminId,
      action: "zone.update",
      resource_type: "zone",
      resource_id: id,
      details: { ...dto },
    });

    return { message: "Zone updated", data: updated };
  }

  /*
   * Deactivated, never deleted. Orders reference the zone with ON DELETE
   * RESTRICT, so a hard delete would either fail or take history with it.
   */
  async deactivate(id: number, adminId: number) {
    const [updated] = await this.db
      .update(schema.zones)
      .set({ is_active: false, updated_at: new Date() })
      .where(eq(schema.zones.id, id))
      .returning();

    if (!updated) throw new NotFoundException("Zone not found");

    await this.audit.record({
      admin_id: adminId,
      action: "zone.deactivate",
      resource_type: "zone",
      resource_id: id,
      details: null,
    });

    return { message: "Zone deactivated", data: updated };
  }
}
