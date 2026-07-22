import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, Length } from 'class-validator';

export class UpdateOrderStatusDto {
  @ApiProperty({
    enum: ['CONFIRMED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'COMPLETED', 'CANCELLED', 'REJECTED'],
    example: 'CONFIRMED',
  })
  @IsEnum(['CONFIRMED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'COMPLETED', 'CANCELLED', 'REJECTED'])
  status!: 'CONFIRMED' | 'PREPARING' | 'READY' | 'OUT_FOR_DELIVERY' | 'COMPLETED' | 'CANCELLED' | 'REJECTED';

  @ApiPropertyOptional({ description: 'Required when rejecting or cancelling', example: 'Out of stock' })
  @IsOptional()
  @IsString()
  @Length(1, 500)
  reason?: string;

  @ApiPropertyOptional({ example: 'Confirmed after reviewing screenshot' })
  @IsOptional()
  @IsString()
  @Length(1, 500)
  note?: string;
}
