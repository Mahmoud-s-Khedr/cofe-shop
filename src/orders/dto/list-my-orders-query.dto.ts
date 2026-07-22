import { createOffsetPaginationQueryDto } from '../../common/dto/offset-pagination-query.dto';

const ListMyOrdersQueryDtoBase = createOffsetPaginationQueryDto({
  defaultLimit: 20,
  maxLimit: 100,
});

export class ListMyOrdersQueryDto extends ListMyOrdersQueryDtoBase {}
