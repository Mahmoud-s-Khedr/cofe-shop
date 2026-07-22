import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, Length } from 'class-validator';
import { createOffsetPaginationQueryDto } from '../../common/dto/offset-pagination-query.dto';

const ListUsersQueryDtoBase = createOffsetPaginationQueryDto({
  defaultLimit: 20,
  maxLimit: 100,
  maxOffset: 10_000,
});

export class ListUsersQueryDto extends ListUsersQueryDtoBase {
  @ApiPropertyOptional({ enum: ['PENDING_VERIFICATION', 'ACTIVE', 'BLOCKED'], description: 'Filter by account status', example: 'BLOCKED' })
  @IsOptional()
  @IsEnum(['PENDING_VERIFICATION', 'ACTIVE', 'BLOCKED'])
  status?: 'PENDING_VERIFICATION' | 'ACTIVE' | 'BLOCKED';

  @ApiPropertyOptional({ description: 'Search by name or phone (1–100 chars)', example: 'Ahmed', minLength: 1, maxLength: 100 })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  q?: string;
}
