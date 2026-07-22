import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class ForgotPasswordDto {
  @ApiProperty({ description: 'Registered phone number', example: '+22200000000' })
  @IsString()
  @Length(7, 32)
  phone!: string;
}
