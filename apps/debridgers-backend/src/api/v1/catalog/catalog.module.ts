import { Global, Module } from "@nestjs/common";
import { TaxonomyService } from "./taxonomy.service";
import { DatabaseModule } from "../../../infrastructure/database/database.module";

/*
 * Global because the taxonomy is read from the public catalogue, the admin
 * product form and the agent stock flow alike.
 */
@Global()
@Module({
  imports: [DatabaseModule],
  providers: [TaxonomyService],
  exports: [TaxonomyService],
})
export class CatalogModule {}
