import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class UpdateAvailabilityDto {
  @ApiProperty({ description: 'Whether the product can currently be ordered', example: false })
  @IsBoolean()
  isAvailable!: boolean;
}
