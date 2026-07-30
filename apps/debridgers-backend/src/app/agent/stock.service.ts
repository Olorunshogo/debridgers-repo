import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { NodePgDatabase } from "drizzle-orm/node-postgres";
import { eq, and, desc } from "drizzle-orm";
import * as schema from "../../infrastructure/persistence/index";
import { DATABASE_CONNECTION } from "../../infrastructure/database/database.provider";
import { JwtPayload } from "../../interfaces/users/jwt.type";
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
        id: schema.products.id,
        name: schema.products.name,
        unit: schema.products.unit,
        price_kobo: schema.products.price_kobo,
        category: schema.products.category,
        category_id: schema.products.category_id,
        category_name: schema.product_categories.name,
        measure_value: schema.products.measure_value,
        measure_unit: schema.products.measure_unit,
        description: schema.products.description,
        image_url: schema.products.image_url,
        sort_order: schema.products.sort_order,
      })
      .from(schema.products)
      .leftJoin(
        schema.product_categories,
        eq(schema.product_categories.id, schema.products.category_id),
      )
      .where(eq(schema.products.is_active, true))
      .orderBy(schema.products.sort_order, schema.products.name);

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
      .from(schema.products)
      .where(
        and(
          eq(schema.products.id, dto.product_id),
          eq(schema.products.is_active, true),
        ),
      )
      .limit(1);

    if (!product)
      throw new BadRequestException("Product not found or inactive");

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

    const newAmountRemitted = request.amount_remitted + dto.amount_remitted;

    if (newAmountRemitted > request.amount_to_remit) {
      throw new BadRequestException(
        "Remittance exceeds the amount owed for this request",
      );
    }

    await this.db
      .update(schema.stock_requests)
      .set({ amount_remitted: newAmountRemitted })
      .where(eq(schema.stock_requests.id, dto.stock_request_id));

    return {
      message: "Remittance recorded",
      data: {
        stock_request_id: dto.stock_request_id,
        amount_remitted: newAmountRemitted,
        amount_to_remit: request.amount_to_remit,
        outstanding: request.amount_to_remit - newAmountRemitted,
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
