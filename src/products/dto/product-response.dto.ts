import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SuccessEnvelopeDto } from '../../common/dto/api-response-envelope.dto';
import { ProductCategory } from '../product-category.enum';

export class ProductImageDto {
  @ApiProperty({ example: 1 })
  fileId!: number;

  @ApiProperty({ example: 'https://res.cloudinary.com/demo/image/upload/bw-cafe/products/1.jpg' })
  url!: string;
}

export class ProductDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ enum: ProductCategory, enumName: 'ProductCategory', example: ProductCategory.coffee })
  category!: ProductCategory;

  @ApiProperty({ example: 'Cappuccino' })
  title!: string;

  @ApiPropertyOptional({ example: 'Espresso with steamed milk foam', nullable: true })
  description!: string | null;

  @ApiPropertyOptional({ example: 'Contains dairy', nullable: true })
  details!: string | null;

  @ApiProperty({ example: 250 })
  price!: number;

  @ApiPropertyOptional({ example: 50, nullable: true, description: 'null means stock is not tracked' })
  quantity!: number | null;

  @ApiPropertyOptional({ example: 'https://res.cloudinary.com/demo/image/upload/bw-cafe/products/1.jpg', nullable: true })
  imageUrl!: string | null;

  @ApiProperty({ type: [ProductImageDto], description: 'Product images in upload order; the first image is imageUrl.' })
  images!: ProductImageDto[];

  @ApiProperty({ example: true })
  isAvailable!: boolean;

  @ApiProperty({ example: true })
  isActive!: boolean;

  @ApiProperty({ example: '2026-03-28T12:00:00.000Z' })
  createdAt!: string;

  @ApiProperty({ example: '2026-03-28T12:00:00.000Z' })
  updatedAt!: string;
}

export class ProductDataDto {
  @ApiProperty({ type: ProductDto })
  product!: ProductDto;
}

export class ProductResponseDto extends SuccessEnvelopeDto {
  @ApiProperty({ type: () => ProductDataDto })
  data!: ProductDataDto;
}

export class ProductListDataDto {
  @ApiProperty({ type: [ProductDto] })
  items!: ProductDto[];

  @ApiProperty({ example: 42 })
  total!: number;
}

export class ProductListResponseDto extends SuccessEnvelopeDto {
  @ApiProperty({ type: () => ProductListDataDto })
  data!: ProductListDataDto;
}
