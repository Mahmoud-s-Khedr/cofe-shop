import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Min,
  ValidateNested,
} from 'class-validator';

export class CreateOrderItemDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  productId!: number;

  @ApiProperty({ example: 2 })
  @IsInt()
  @Min(1)
  quantity!: number;
}

export class CreateOrderDto {
  @ApiProperty({ example: 'Customer Name' })
  @IsString()
  @Length(1, 150)
  customerName!: string;

  @ApiProperty({ example: '+22200000000' })
  @IsString()
  @Length(7, 32)
  customerPhone!: string;

  @ApiProperty({ enum: ['DELIVERY', 'PICKUP'], example: 'DELIVERY' })
  @IsEnum(['DELIVERY', 'PICKUP'])
  orderType!: 'DELIVERY' | 'PICKUP';

  @ApiPropertyOptional({ description: 'Required for DELIVERY orders', example: 'Full delivery address as one string' })
  @IsOptional()
  @IsString()
  @Length(1, 1000)
  address?: string;

  @ApiPropertyOptional({ description: 'Required for PICKUP orders (ISO 8601)', example: '2026-07-13T18:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  pickupTime?: string;

  @ApiProperty({ type: [CreateOrderItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items!: CreateOrderItemDto[];

  @ApiPropertyOptional({ example: 'Call before arriving' })
  @IsOptional()
  @IsString()
  @Length(1, 1000)
  customerNotes?: string;
}
