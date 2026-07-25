import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SuccessEnvelopeDto } from '../../common/dto/api-response-envelope.dto';

export class OrderItemImageDto {
  @ApiProperty({ example: 1 })
  fileId!: number;

  @ApiProperty({ example: 'https://res.cloudinary.com/demo/image/upload/bw-cafe/products/1.jpg' })
  url!: string;
}

export class OrderItemDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiPropertyOptional({ example: 3, nullable: true })
  productId!: number | null;

  @ApiProperty({ example: 'Cappuccino' })
  productTitle!: string;

  @ApiPropertyOptional({ nullable: true, example: 'coffee' })
  category!: string | null;

  @ApiPropertyOptional({ nullable: true, example: 'Espresso with steamed milk foam' })
  description!: string | null;

  @ApiPropertyOptional({ nullable: true, example: 'Contains dairy' })
  details!: string | null;

  @ApiPropertyOptional({ nullable: true, example: 'https://res.cloudinary.com/demo/image/upload/bw-cafe/products/1.jpg' })
  imageUrl!: string | null;

  @ApiProperty({ type: [OrderItemImageDto] })
  images!: OrderItemImageDto[];

  @ApiProperty({ example: 250 })
  unitPrice!: number;

  @ApiProperty({ example: 2 })
  quantity!: number;

  @ApiProperty({ example: 500 })
  lineTotal!: number;
}

export class OrderDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'BW-20260713-0042' })
  orderNumber!: string;

  @ApiPropertyOptional({ example: 'Customer Name' })
  customerName!: string;

  @ApiProperty({ example: '+22200000000' })
  customerPhone!: string;

  @ApiProperty({ enum: ['DELIVERY', 'PICKUP'], example: 'DELIVERY' })
  orderType!: string;

  @ApiPropertyOptional({ nullable: true, example: 'Full delivery address as one string' })
  address!: string | null;

  @ApiPropertyOptional({ nullable: true, example: null })
  pickupTime!: string | null;

  @ApiProperty({
    enum: ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'COMPLETED', 'CANCELLED', 'REJECTED'],
    example: 'PENDING',
  })
  status!: string;

  @ApiPropertyOptional({ nullable: true })
  screenshotUrl!: string | null;

  @ApiProperty({ example: 500 })
  subtotal!: number;

  @ApiProperty({ example: 0 })
  deliveryFee!: number;

  @ApiProperty({ example: 500 })
  total!: number;

  @ApiProperty({ example: 'MRU' })
  currency!: string;

  @ApiPropertyOptional({ nullable: true })
  customerNotes!: string | null;

  @ApiPropertyOptional({ nullable: true })
  cancellationReason!: string | null;

  @ApiPropertyOptional({ nullable: true })
  rejectionReason!: string | null;

  @ApiProperty({ example: '2026-07-13T12:00:00.000Z' })
  createdAt!: string;

  @ApiProperty({ type: [OrderItemDto] })
  items!: OrderItemDto[];

  @ApiPropertyOptional({ description: 'Only present once, at creation, for guest orders' })
  guestAccessToken?: string;
}

export class OrderDataDto {
  @ApiProperty({ type: OrderDto })
  order!: OrderDto;
}

export class OrderResponseDto extends SuccessEnvelopeDto {
  @ApiProperty({ type: () => OrderDataDto })
  data!: OrderDataDto;
}

export class OrderListDataDto {
  @ApiProperty({ type: [OrderDto] })
  items!: OrderDto[];

  @ApiProperty({ example: 42 })
  total!: number;
}

export class OrderListResponseDto extends SuccessEnvelopeDto {
  @ApiProperty({ type: () => OrderListDataDto })
  data!: OrderListDataDto;
}
