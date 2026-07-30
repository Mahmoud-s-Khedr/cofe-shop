import { Controller, ForbiddenException, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ErrorResponseDto } from '../common/dto/error-response.dto';
import { IdParamDto } from '../common/dto/id-param.dto';
import { OptionalJwtAuthGuard } from '../common/guards/optional-jwt-auth.guard';
import { AuthUser } from '../common/types/auth-user.type';
import { SearchProductsDto } from './dto/search-products.dto';
import { ProductListResponseDto, ProductResponseDto } from './dto/product-response.dto';
import { ProductsService } from './products.service';

@ApiTags('Products')
@Controller('products')
@UseGuards(OptionalJwtAuthGuard)
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @ApiHeader({
    name: 'Authorization',
    required: false,
    description: 'Optional admin Bearer token. Admins can view unavailable products and use the available filter.',
  })
  @ApiOperation({ summary: 'Search/list products (admins can include unavailable products)' })
  @ApiResponse({ status: 200, description: 'Paginated product list', type: ProductListResponseDto })
  @ApiResponse({ status: 403, description: 'The available filter is restricted to admins', type: ErrorResponseDto })
  list(
    @Query() query: SearchProductsDto,
    @CurrentUser() user: AuthUser | null,
  ): Promise<Record<string, unknown>> {
    if (query.available !== undefined && !user?.isAdmin) {
      throw new ForbiddenException('The available filter is restricted to admins');
    }

    return this.productsService.searchProducts(query, !user?.isAdmin);
  }

  @Get(':id')
  @ApiParam({ name: 'id', type: Number })
  @ApiOperation({ summary: 'Get a single available product' })
  @ApiResponse({ status: 200, description: 'Product details', type: ProductResponseDto })
  @ApiResponse({ status: 404, description: 'Product not found', type: ErrorResponseDto })
  getById(@Param() params: IdParamDto): Promise<Record<string, unknown>> {
    return this.productsService.getProductById(params.id, true);
  }
}
