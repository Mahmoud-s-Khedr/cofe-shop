import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { createOffsetPaginationQueryDto } from '../../common/dto/offset-pagination-query.dto';

const ListAdminOrdersQueryDtoBase = createOffsetPaginationQueryDto({
  defaultLimit: 20,
  maxLimit: 100,
});

export class ListAdminOrdersQueryDto extends ListAdminOrdersQueryDtoBase {
  @ApiPropertyOptional({
    enum: ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'COMPLETED', 'CANCELLED', 'REJECTED'],
  })
  @IsOptional()
  @IsEnum(['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'COMPLETED', 'CANCELLED', 'REJECTED'])
  status?: string;

  @ApiPropertyOptional({ enum: ['DELIVERY', 'PICKUP'] })
  @IsOptional()
  @IsEnum(['DELIVERY', 'PICKUP'])
  orderType?: string;

  @ApiPropertyOptional({ example: 'BW-20260713-0042' })
  @IsOptional()
  @IsString()
  orderNumber?: string;

  @ApiPropertyOptional({ example: '+22200000000' })
  @IsOptional()
  @IsString()
  customerPhone?: string;

  @ApiPropertyOptional({ example: '2026-07-01' })
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @ApiPropertyOptional({ example: '2026-07-31' })
  @IsOptional()
  @IsDateString()
  toDate?: string;
}
