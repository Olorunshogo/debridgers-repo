import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { Inject } from "@nestjs/common";
import { NodePgDatabase } from "drizzle-orm/node-postgres";
import { eq, desc, count, isNull, and } from "drizzle-orm";
import * as schema from "../../../infrastructure/persistence/index";
import { DATABASE_CONNECTION } from "../../../infrastructure/database/database.provider";

export interface CreateProductDto {
  name: string;
  unit: string;
  category: string;
  price_kobo: number;
  description?: string;
  image_url?: string;
  stock_quantity?: number;
}

export interface UpdateProductDto {
  name?: string;
  unit?: string;
  category?: string;
  price_kobo?: number;
  description?: string;
  image_url?: string;
  stock_quantity?: number;
  is_active?: boolean;
  sort_order?: number;
}

export interface CreateStockRequestDto {
  product_id: number;
  quantity: number;
}

@Injectable()
export class ProductService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  /**
   * Create a new product (Admin only)
   */
  async createProduct(dto: CreateProductDto) {
    if (!dto.name || !dto.unit || !dto.category || !dto.price_kobo) {
      throw new BadRequestException(
        "Name, unit, category, and price_kobo are required",
      );
    }

    if (dto.price_kobo < 0) {
      throw new BadRequestException("Price cannot be negative");
    }

    const [product] = await this.db
      .insert(schema.productsTable)
      .values({
        name: dto.name,
        unit: dto.unit,
        category: dto.category,
        price_kobo: dto.price_kobo,
        description: dto.description || null,
        image_url: dto.image_url || null,
        stock_quantity: dto.stock_quantity ?? 0,
        is_active: true,
        sort_order: 0,
        deleted_at: null,
      })
      .returning();

    return {
      message: "Product created successfully",
      data: product,
    };
  }

  /**
   * Update product (Admin only)
   */
  async updateProduct(productId: number, dto: UpdateProductDto) {
    const [existing] = await this.db
      .select()
      .from(schema.productsTable)
      .where(eq(schema.productsTable.id, productId))
      .limit(1);

    if (!existing || existing.deleted_at) {
      throw new NotFoundException("Product not found");
    }

    if (dto.price_kobo !== undefined && dto.price_kobo < 0) {
      throw new BadRequestException("Price cannot be negative");
    }

    const [updated] = await this.db
      .update(schema.productsTable)
      .set({
        name: dto.name ?? existing.name,
        unit: dto.unit ?? existing.unit,
        category: dto.category ?? existing.category,
        price_kobo: dto.price_kobo ?? existing.price_kobo,
        description: dto.description ?? existing.description,
        image_url: dto.image_url ?? existing.image_url,
        stock_quantity: dto.stock_quantity ?? existing.stock_quantity,
        is_active: dto.is_active ?? existing.is_active,
        sort_order: dto.sort_order ?? existing.sort_order,
      })
      .where(eq(schema.productsTable.id, productId))
      .returning();

    return {
      message: "Product updated successfully",
      data: updated,
    };
  }

  /**
   * List all active products (Buyer view) - excludes soft-deleted
   */
  async listProducts(page: number = 1, limit: number = 20) {
    const offset = (page - 1) * limit;

    const [products, [{ total }]] = await Promise.all([
      this.db
        .select()
        .from(schema.productsTable)
        .where(
          and(
            eq(schema.productsTable.is_active, true),
            isNull(schema.productsTable.deleted_at),
          ),
        )
        .orderBy(desc(schema.productsTable.sort_order))
        .limit(limit)
        .offset(offset),
      this.db
        .select({ total: count() })
        .from(schema.productsTable)
        .where(
          and(
            eq(schema.productsTable.is_active, true),
            isNull(schema.productsTable.deleted_at),
          ),
        ),
    ]);

    return {
      message: "Products retrieved",
      data: {
        products: products.map((p) => ({
          id: p.id,
          name: p.name,
          unit: p.unit,
          category: p.category,
          price_kobo: p.price_kobo,
          price_naira: Math.round(p.price_kobo / 100),
          description: p.description,
          image_url: p.image_url,
          stock_quantity: p.stock_quantity,
          created_at: p.created_at,
        })),
        pagination: {
          page,
          limit,
          total: Number(total ?? 0),
        },
      },
    };
  }

  /**
   * Get single product by ID - excludes soft-deleted
   */
  async getProductById(productId: number) {
    const [product] = await this.db
      .select()
      .from(schema.productsTable)
      .where(
        and(
          eq(schema.productsTable.id, productId),
          isNull(schema.productsTable.deleted_at),
        ),
      )
      .limit(1);

    if (!product) {
      throw new NotFoundException("Product not found");
    }

    return {
      message: "Product retrieved",
      data: {
        id: product.id,
        name: product.name,
        unit: product.unit,
        category: product.category,
        price_kobo: product.price_kobo,
        price_naira: Math.round(product.price_kobo / 100),
        description: product.description,
        image_url: product.image_url,
        stock_quantity: product.stock_quantity,
        is_active: product.is_active,
        created_at: product.created_at,
      },
    };
  }

  async deleteProduct(productId: number) {
    const [existing] = await this.db
      .select()
      .from(schema.productsTable)
      .where(eq(schema.productsTable.id, productId))
      .limit(1);

    if (!existing || existing.deleted_at) {
      throw new NotFoundException("Product not found");
    }

    const [deleted] = await this.db
      .update(schema.productsTable)
      .set({ deleted_at: new Date() })
      .where(eq(schema.productsTable.id, productId))
      .returning();

    return {
      message: "Product deleted successfully",
      data: deleted,
    };
  }

  async requestStock(agentId: number, dto: CreateStockRequestDto) {
    const [product] = await this.db
      .select()
      .from(schema.productsTable)
      .where(
        and(
          eq(schema.productsTable.id, dto.product_id),
          isNull(schema.productsTable.deleted_at),
        ),
      )
      .limit(1);

    if (!product) {
      throw new NotFoundException("Product not found");
    }

    if (dto.quantity <= 0) {
      throw new BadRequestException("Quantity must be greater than 0");
    }

    if (product.stock_quantity < dto.quantity) {
      throw new BadRequestException(
        `Insufficient stock. Available: ${product.stock_quantity}, Requested: ${dto.quantity}`,
      );
    }

    // Create stock request
    // Note: This assumes stock_requests table exists with agent_id, product_id, quantity fields
    const [stockRequest] = await this.db
      .insert(schema.stock_requests)
      .values({
        agent_id: agentId,
        product_id: dto.product_id,
        quantity: dto.quantity,
        status: "pending",
        /*
         * Remit is the full catalogue price. Commission is no longer deducted
         * from consignment cost; agents earn only on bags above monthly target.
         */
        amount_to_remit: dto.quantity * product.price_kobo,
        amount_remitted: 0,
      })
      .returning();

    return {
      message: "Stock request created",
      data: stockRequest,
    };
  }

  /**
   * Get stock requests for admin (to fulfill)
   */
  async getStockRequests(
    page: number = 1,
    limit: number = 20,
    status?: string,
  ) {
    const offset = (page - 1) * limit;

    const whereConditions = status
      ? eq(
          schema.stock_requests.status,
          status as "pending" | "fulfilled" | "cancelled",
        )
      : undefined;

    const [requests, [{ total }]] = await Promise.all([
      this.db
        .select()
        .from(schema.stock_requests)
        .where(whereConditions)
        .orderBy(desc(schema.stock_requests.created_at))
        .limit(limit)
        .offset(offset),
      this.db
        .select({ total: count() })
        .from(schema.stock_requests)
        .where(whereConditions),
    ]);

    return {
      message: "Stock requests retrieved",
      data: {
        requests,
        pagination: {
          page,
          limit,
          total: Number(total ?? 0),
        },
      },
    };
  }
}
