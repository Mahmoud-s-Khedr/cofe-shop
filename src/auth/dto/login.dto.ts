import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class LoginDto {
  @ApiProperty({ description: 'Phone number', example: '+22200000000' })
  @IsString()
  @Length(7, 32)
  phone!: string;

  @ApiProperty({ description: 'User password (8–64 chars)', example: 'Secret123', minLength: 8, maxLength: 64 })
  @IsString()
  @Length(8, 64)
  password!: string;
}
