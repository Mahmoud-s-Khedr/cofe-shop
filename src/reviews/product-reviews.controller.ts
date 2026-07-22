import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { IdParamDto } from '../common/dto/id-param.dto';
import { ListProductReviewsQueryDto } from './dto/list-product-reviews-query.dto';
import { ReviewListResponseDto } from './dto/review-response.dto';
import { ReviewsService } from './reviews.service';

@ApiTags('Reviews')
@Controller('products/:id/reviews')
export class ProductReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get()
  @ApiParam({ name: 'id', type: Number })
  @ApiOperation({ summary: 'List reviews for a product' })
  @ApiResponse({ status: 200, description: 'Paginated reviews', type: ReviewListResponseDto })
  list(@Param() params: IdParamDto, @Query() query: ListProductReviewsQueryDto): Promise<Record<string, unknown>> {
    return this.reviewsService.listProductReviews(params.id, query);
  }
}
