import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ErrorResponseDto } from '../common/dto/error-response.dto';
import { IdParamDto } from '../common/dto/id-param.dto';
import { SearchProductsDto } from './dto/search-products.dto';
import { ProductListResponseDto, ProductResponseDto } from './dto/product-response.dto';
import { ProductsService } from './products.service';

@ApiTags('Products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @ApiOperation({ summary: 'Search/list available products' })
  @ApiResponse({ status: 200, description: 'Paginated product list', type: ProductListResponseDto })
  list(@Query() query: SearchProductsDto): Promise<Record<string, unknown>> {
    return this.productsService.searchProducts(query, true);
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
