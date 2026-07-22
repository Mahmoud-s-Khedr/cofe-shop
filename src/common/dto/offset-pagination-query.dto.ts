import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

type OffsetPaginationDtoOptions = {
  defaultLimit?: number;
  maxLimit: number;
  maxOffset?: number;
};

export type OffsetPaginationQuery = {
  page?: number;
  limit?: number;
  offset?: number;
};

export function createOffsetPaginationQueryDto(options: OffsetPaginationDtoOptions) {
  const defaultLimit = options.defaultLimit ?? 20;
  const offsetDescription = options.maxOffset !== undefined
    ? `Pagination offset (0-${options.maxOffset}, default 0)`
    : 'Pagination offset (default 0)';

  abstract class OffsetPaginationQueryDto {
    @ApiPropertyOptional({ description: 'Page number (default 1)', example: 1, minimum: 1 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page?: number;

    @ApiPropertyOptional({
      description: `Page size (1-${options.maxLimit}, default ${defaultLimit})`,
      example: defaultLimit,
      minimum: 1,
      maximum: options.maxLimit,
    })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(options.maxLimit)
    limit?: number;

    @ApiPropertyOptional({
      description: offsetDescription,
      example: 0,
      minimum: 0,
      ...(options.maxOffset !== undefined ? { maximum: options.maxOffset } : {}),
    })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(0)
    offset?: number;
  }

  if (options.maxOffset !== undefined) {
    Max(options.maxOffset)(OffsetPaginationQueryDto.prototype, 'offset');
  }

  return OffsetPaginationQueryDto;
}
