import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Length, Matches } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ description: 'Full name (2–150 chars)', example: 'Ahmed Ali', minLength: 2, maxLength: 150 })
  @IsString()
  @IsNotEmpty()
  @Length(2, 150)
  name!: string;

  @ApiProperty({ description: 'Phone number (7–32 chars)', example: '+22200000000', minLength: 7, maxLength: 32 })
  @IsString()
  @IsNotEmpty()
  @Length(7, 32)
  phone!: string;

  @ApiProperty({ description: 'Password — must contain letters and numbers (8–64 chars)', example: 'Secret123', minLength: 8, maxLength: 64 })
  @IsString()
  @Length(8, 64)
  @Matches(/^(?=.*[A-Za-z])(?=.*\d).+$/, { message: 'Password must contain letters and numbers' })
  password!: string;
}
