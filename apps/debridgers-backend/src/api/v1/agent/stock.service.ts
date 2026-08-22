import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { NodePgDatabase } from "drizzle-orm/node-postgres";
import { eq, and, desc, sql } from "drizzle-orm";
import * as schema from "../../../infrastructure/persistence/index";
import { DATABASE_CONNECTION } from "../../../infrastructure/database/database.provider";
import { JwtPayload } from "../../../interfaces/users/jwt.type";
import { StockRequestDto } from "./dto/stock-request.dto";
import { RemitStockDto } from "./dto/remit-stock.dto";

@Injectable()
export class StockService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  /*
   * Carries `category_id` and the leaf name so the stock page can drill down
   * Category > Type > Variety instead of listing every product flat.
   */
  async getProducts() {
    const rows = await this.db
      .select({
        id: schema.productsTable.id,
        name: schema.productsTable.name,
        unit: schema.productsTable.unit,
        price_kobo: schema.productsTable.price_kobo,
        stock_quantity: schema.productsTable.stock_quantity,
        category: schema.productsTable.category,
        category_id: schema.productsTable.category_id,
        category_name: schema.product_categories.name,
        measure_value: schema.productsTable.measure_value,
        measure_unit: schema.productsTable.measure_unit,
        description: schema.productsTable.description,
        image_url: schema.productsTable.image_url,
        sort_order: schema.productsTable.sort_order,
      })
      .from(schema.productsTable)
      .leftJoin(
        schema.product_categories,
        eq(schema.product_categories.id, schema.productsTable.category_id),
      )
      .where(eq(schema.productsTable.is_active, true))
      .orderBy(schema.productsTable.sort_order, schema.productsTable.name);

    return { message: "Products retrieved", data: rows };
  }

  async requestStock(dto: StockRequestDto, user: JwtPayload) {
    const [profile] = await this.db
      .select()
      .from(schema.agent_profiles)
      .where(
        and(
          eq(schema.agent_profiles.user_id, user.sub),
          eq(schema.agent_profiles.status, "approved"),
        ),
      )
      .limit(1);

    if (!profile)
      throw new BadRequestException("Only approved agents can request stock");

    if (profile.kyc_status !== "approved") {
      throw new BadRequestException(
        "KYC verification required before requesting stock",
      );
    }

    const [product] = await this.db
      .select()
      .from(schema.productsTable)
      .where(
        and(
          eq(schema.productsTable.id, dto.product_id),
          eq(schema.productsTable.is_active, true),
        ),
      )
      .limit(1);

    if (!product)
      throw new BadRequestException("Product not found or inactive");

    /*
     * Informative only - the authoritative guard against overselling is the
     * atomic decrement in admin.service#fulfilStockRequest, which runs against
     * whatever stock remains at fulfillment time. This just gives the agent an
     * immediate, friendly rejection instead of a request that can never be
     * fulfilled.
     */
    if (product.stock_quantity < dto.quantity) {
      throw new BadRequestException(
        `Insufficient warehouse stock. Available: ${product.stock_quantity}, requested: ${dto.quantity}`,
      );
    }

    const amountToRemit = dto.quantity * product.price_kobo;

    const [request] = await this.db
      .insert(schema.stock_requests)
      .values({
        agent_id: user.sub,
        product_id: dto.product_id,
        quantity: dto.quantity,
        amount_to_remit: amountToRemit,
        status: "pending",
      })
      .returning();

    return {
      message: "Stock request submitted",
      data: {
        id: request.id,
        product_name: product.name,
        product_unit: product.unit,
        quantity: request.quantity,
        amount_to_remit: request.amount_to_remit,
        status: request.status,
      },
    };
  }

  async remitStock(dto: RemitStockDto, user: JwtPayload) {
    const [request] = await this.db
      .select()
      .from(schema.stock_requests)
      .where(
        and(
          eq(schema.stock_requests.id, dto.stock_request_id),
          eq(schema.stock_requests.agent_id, user.sub),
        ),
      )
      .limit(1);

    if (!request) throw new NotFoundException("Stock request not found");

    if (request.status !== "fulfilled") {
      throw new BadRequestException(
        "Can only remit against a fulfilled stock request",
      );
    }

    if (
      request.amount_remitted + dto.amount_remitted >
      request.amount_to_remit
    ) {
      throw new BadRequestException(
        "Remittance exceeds the amount owed for this request",
      );
    }

    /*
     * The checks above are informative; this UPDATE is the actual guard, so
     * two concurrent remittances cannot both read the same amount_remitted
     * and have one silently overwrite the other (or together push the total
     * past what is owed).
     */
    const [updated] = await this.db
      .update(schema.stock_requests)
      .set({
        amount_remitted: sql`${schema.stock_requests.amount_remitted} + ${dto.amount_remitted}`,
      })
      .where(
        sql`${schema.stock_requests.id} = ${dto.stock_request_id}
            AND ${schema.stock_requests.status} = 'fulfilled'
            AND ${schema.stock_requests.amount_remitted} + ${dto.amount_remitted} <= ${schema.stock_requests.amount_to_remit}`,
      )
      .returning();

    if (!updated) {
      throw new BadRequestException(
        "Remittance exceeds the amount owed for this request",
      );
    }

    return {
      message: "Remittance recorded",
      data: {
        stock_request_id: dto.stock_request_id,
        amount_remitted: updated.amount_remitted,
        amount_to_remit: updated.amount_to_remit,
        outstanding: updated.amount_to_remit - updated.amount_remitted,
      },
    };
  }

  async getMyStockRequests(user: JwtPayload) {
    const requests = await this.db
      .select()
      .from(schema.stock_requests)
      .where(eq(schema.stock_requests.agent_id, user.sub))
      .orderBy(desc(schema.stock_requests.created_at));

    return { message: "Stock requests retrieved", data: requests };
  }
}
