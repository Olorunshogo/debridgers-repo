import { Global, Module } from "@nestjs/common";
import { TaxonomyService } from "./taxonomy.service";
import { SimpleProductsService } from "./simple-products.service";
import { ProductService } from "./product.service";
import { ProductController } from "./product.controller";
import { DatabaseModule } from "../../../infrastructure/database/database.module";
import { AuthModule } from "../auth/auth.module";

/*
 * Global because the taxonomy is read from the public catalogue, the admin
 * product form and the agent stock flow alike.
 */
@Global()
@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [ProductController],
  providers: [TaxonomyService, SimpleProductsService, ProductService],
  exports: [TaxonomyService, SimpleProductsService, ProductService],
})
export class CatalogModule {}
