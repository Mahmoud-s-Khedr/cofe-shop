import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsNumber, IsOptional, IsString, Length, Min } from 'class-validator';
import { ProductCategory } from '../product-category.enum';

export class UpdateProductDto {
  @ApiPropertyOptional({ enum: ProductCategory, enumName: 'ProductCategory', description: 'Product menu category', example: ProductCategory.coffee })
  @IsOptional()
  @IsEnum(ProductCategory)
  category?: ProductCategory;

  @ApiPropertyOptional({ description: 'Product title (1–255 chars)', example: 'Cappuccino', minLength: 1, maxLength: 255 })
  @IsOptional()
  @IsString()
  @Length(1, 255)
  title?: string;

  @ApiPropertyOptional({ description: 'Short description (1–2000 chars)', example: 'Espresso with steamed milk foam', maxLength: 2000 })
  @IsOptional()
  @IsString()
  @Length(1, 2000)
  description?: string;

  @ApiPropertyOptional({ description: 'Additional free-text details', example: 'Contains dairy', maxLength: 2000 })
  @IsOptional()
  @IsString()
  @Length(1, 2000)
  details?: string;

  @ApiPropertyOptional({ description: 'Price in the local currency', example: 250, minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @ApiPropertyOptional({ description: 'Stock quantity; omit to not track stock', example: 50, minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  quantity?: number;
}
