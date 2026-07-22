import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SuccessEnvelopeDto } from '../../common/dto/api-response-envelope.dto';

export class ReviewDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 3 })
  productId!: number;

  @ApiProperty({ example: 5, minimum: 1, maximum: 5 })
  rating!: number;

  @ApiPropertyOptional({ example: 'Great coffee!', nullable: true })
  comment!: string | null;

  @ApiProperty({ example: '2026-07-13T12:00:00.000Z' })
  createdAt!: string;
}

export class ReviewDataDto {
  @ApiProperty({ type: ReviewDto })
  review!: ReviewDto;
}

export class ReviewResponseDto extends SuccessEnvelopeDto {
  @ApiProperty({ type: () => ReviewDataDto })
  data!: ReviewDataDto;
}

export class ReviewListDataDto {
  @ApiProperty({ type: [ReviewDto] })
  items!: ReviewDto[];

  @ApiProperty({ example: 12 })
  total!: number;
}

export class ReviewListResponseDto extends SuccessEnvelopeDto {
  @ApiProperty({ type: () => ReviewListDataDto })
  data!: ReviewListDataDto;
}
