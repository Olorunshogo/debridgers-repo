import { Injectable, Inject } from "@nestjs/common";
import { NodePgDatabase } from "drizzle-orm/node-postgres";
import { eq, asc } from "drizzle-orm";
import * as schema from "../../../infrastructure/persistence/index";
import { DATABASE_CONNECTION } from "../../../infrastructure/database/database.provider";

@Injectable()
export class SimpleProductsService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async listProducts() {
    const rows = await this.db
      .select()
      .from(schema.simple_products)
      .where(eq(schema.simple_products.is_active, true))
      .orderBy(asc(schema.simple_products.sort_order));

    return { message: "Products retrieved", data: rows };
  }

  async getProductById(id: number) {
    const [product] = await this.db
      .select()
      .from(schema.simple_products)
      .where(eq(schema.simple_products.id, id))
      .limit(1);

    return {
      message: product ? "Product found" : "Product not found",
      data: product || null,
    };
  }
}
