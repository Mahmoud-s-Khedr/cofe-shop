import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SuccessEnvelopeDto } from '../../common/dto/api-response-envelope.dto';

export class AuthUserDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'Ahmed Ali' })
  name!: string;

  @ApiProperty({ example: '+22200000000' })
  phone!: string;

  @ApiProperty({ example: 'USER', enum: ['USER', 'ADMIN'] })
  role!: string;

  @ApiProperty({ example: 'ACTIVE', enum: ['PENDING_VERIFICATION', 'ACTIVE', 'BLOCKED'] })
  status!: string;
}

export class TokenDataDto {
  @ApiPropertyOptional({ type: AuthUserDto })
  user?: AuthUserDto;

  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  accessToken!: string;

  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  refreshToken!: string;
}

export class TokenResponseDto extends SuccessEnvelopeDto {
  @ApiProperty({ type: () => TokenDataDto })
  data!: TokenDataDto;
}

export class OtpSentDataDto {
  @ApiProperty({ example: 'Verification code sent' })
  message!: string;

  @ApiPropertyOptional({
    example: '000000',
    description: 'No SMS provider is wired up yet — the code is returned here instead of being sent.',
  })
  code?: string;
}

export class OtpSentResponseDto extends SuccessEnvelopeDto {
  @ApiProperty({ type: () => OtpSentDataDto })
  data!: OtpSentDataDto;
}

export class LogoutDataDto {}

export class LogoutResponseDto extends SuccessEnvelopeDto {
  @ApiProperty({ type: () => LogoutDataDto })
  data!: LogoutDataDto;
}
