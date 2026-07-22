import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class ResendRegistrationCodeDto {
  @ApiProperty({ description: 'Phone number', example: '+22200000000' })
  @IsString()
  @Length(7, 32)
  phone!: string;
}
