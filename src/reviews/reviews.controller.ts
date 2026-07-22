import { Body, Controller, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AuthUser } from '../common/types/auth-user.type';
import { ErrorResponseDto } from '../common/dto/error-response.dto';
import { CreateReviewDto } from './dto/create-review.dto';
import { ReviewResponseDto } from './dto/review-response.dto';
import { ReviewsService } from './reviews.service';

@ApiTags('Reviews')
@ApiBearerAuth()
@Controller('orders/:orderNumber/items/:itemId')
@UseGuards(JwtAuthGuard)
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post('review')
  @ApiOperation({ summary: 'Review a purchased order item (order must be completed)' })
  @ApiResponse({ status: 201, description: 'Review created', type: ReviewResponseDto })
  @ApiResponse({ status: 409, description: 'Item already reviewed', type: ErrorResponseDto })
  createReview(
    @CurrentUser() user: AuthUser,
    @Param('orderNumber') orderNumber: string,
    @Param('itemId', ParseIntPipe) itemId: number,
    @Body() dto: CreateReviewDto,
  ): Promise<Record<string, unknown>> {
    return this.reviewsService.createReview(user.sub, orderNumber, itemId, dto);
  }
}
