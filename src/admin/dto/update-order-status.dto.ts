import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString, Length, ValidateIf } from 'class-validator';

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

  @ApiPropertyOptional({
    enum: ['CASH', 'BANK'],
    description: 'Required when completing a pickup order',
    example: 'CASH',
  })
  @IsOptional()
  @IsEnum(['CASH', 'BANK'])
  paymentMethod?: 'CASH' | 'BANK';

  @ApiPropertyOptional({
    description: 'Required when paymentMethod is BANK for pickup completion',
    example: 'Bank of Mauritania',
  })
  @ValidateIf((dto: UpdateOrderStatusDto) => dto.paymentMethod === 'BANK')
  @IsString()
  @IsNotEmpty()
  @Length(1, 150)
  bankName?: string;
}
