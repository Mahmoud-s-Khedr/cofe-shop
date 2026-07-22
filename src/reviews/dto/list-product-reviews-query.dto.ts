import { createOffsetPaginationQueryDto } from '../../common/dto/offset-pagination-query.dto';

const ListProductReviewsQueryDtoBase = createOffsetPaginationQueryDto({
  defaultLimit: 20,
  maxLimit: 100,
});

export class ListProductReviewsQueryDto extends ListProductReviewsQueryDtoBase {}
