import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from "@nestjs/swagger";
import {
  ProductService,
  CreateProductDto,
  UpdateProductDto,
} from "./product.service";
import { AuthGuard } from "../../shared/guards/auth.guard";
import { RolesGuard } from "../../shared/guards/roles.guard";
import { Roles } from "../../shared/decorators/roles.decorator";

@ApiTags("Catalog - Products")
@Controller("catalog")
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  /**
   * Admin: Create new product
   */
  @Post("products")
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("admin")
  @ApiBearerAuth("access-token")
  @ApiOperation({ summary: "Create a new product (Admin only)" })
  async createProduct(@Body() dto: CreateProductDto) {
    return this.productService.createProduct(dto);
  }

  /**
   * Admin: Update product
   */
  @Patch("products/:id")
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("admin")
  @ApiBearerAuth("access-token")
  @ApiOperation({ summary: "Update product (Admin only)" })
  async updateProduct(
    @Param("id", ParseIntPipe) productId: number,
    @Body() dto: UpdateProductDto,
  ) {
    return this.productService.updateProduct(productId, dto);
  }

  /**
   * Admin: Delete product (soft delete)
   */
  @Delete("products/:id")
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("admin")
  @ApiBearerAuth("access-token")
  @ApiOperation({ summary: "Delete product (soft delete - Admin only)" })
  async deleteProduct(@Param("id", ParseIntPipe) productId: number) {
    return this.productService.deleteProduct(productId);
  }

  /**
   * Buyer/Public: List all active products
   */
  @Get("products")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "List all active products" })
  @ApiQuery({ name: "page", required: false, example: 1 })
  @ApiQuery({ name: "limit", required: false, example: 20 })
  async listProducts(
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? Math.min(parseInt(limit, 10), 100) : 20;

    return this.productService.listProducts(pageNum, limitNum);
  }

  /**
   * Buyer/Public: Get single product by ID
   */
  @Get("products/:id")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Get product details" })
  async getProduct(@Param("id", ParseIntPipe) productId: number) {
    return this.productService.getProductById(productId);
  }
}
