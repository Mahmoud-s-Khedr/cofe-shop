import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class VerifyRegistrationDto {
  @ApiProperty({ description: 'Phone number', example: '+22200000000' })
  @IsString()
  @Length(7, 32)
  phone!: string;

  @ApiProperty({ description: 'One-time code sent to the phone (4–8 digits)', example: '000000', minLength: 4, maxLength: 8 })
  @IsString()
  @Length(4, 8)
  code!: string;
}
