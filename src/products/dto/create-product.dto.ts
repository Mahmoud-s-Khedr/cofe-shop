import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, IsString, Length, Min } from 'class-validator';
import { ProductCategory } from '../product-category.enum';

export class CreateProductDto {
  @ApiProperty({ enum: ProductCategory, enumName: 'ProductCategory', description: 'Product menu category', example: ProductCategory.coffee })
  @IsEnum(ProductCategory)
  category!: ProductCategory;

  @ApiProperty({ description: 'Product title (1–255 chars)', example: 'Cappuccino', minLength: 1, maxLength: 255 })
  @IsString()
  @Length(1, 255)
  title!: string;

  @ApiPropertyOptional({ description: 'Product description', example: 'Espresso with steamed milk foam' })
  @Transform(({ value }) => typeof value === 'string' && value.trim() === '' ? undefined : value)
  @IsOptional()
  @IsString()
  @Length(1)
  description?: string;

  @ApiProperty({ description: 'Price in the local currency', example: 250, minimum: 0 })
  @IsNumber()
  @Min(0)
  price!: number;

}
