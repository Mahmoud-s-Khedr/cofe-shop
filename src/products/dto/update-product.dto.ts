import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, IsString, Length, Min } from 'class-validator';
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

  @ApiPropertyOptional({ description: 'Product description', example: 'Espresso with steamed milk foam' })
  @IsOptional()
  @IsString()
  @Length(1)
  description?: string;

  @ApiPropertyOptional({ description: 'Price in the local currency', example: 250, minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

}
