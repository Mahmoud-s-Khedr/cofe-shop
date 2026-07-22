import { ApiProperty } from '@nestjs/swagger';
import { SuccessEnvelopeDto } from '../../common/dto/api-response-envelope.dto';

export class UserDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'Ahmed Mohamed' })
  name!: string;

  @ApiProperty({ example: '+22200000000' })
  phone!: string;

  @ApiProperty({ example: 'USER', enum: ['USER', 'ADMIN'] })
  role!: string;

  @ApiProperty({ example: 'ACTIVE', enum: ['PENDING_VERIFICATION', 'ACTIVE', 'BLOCKED'] })
  status!: string;
}

export class UserProfileDataDto {
  @ApiProperty({ type: UserDto })
  user!: UserDto;
}

export class UserProfileResponseDto extends SuccessEnvelopeDto {
  @ApiProperty({ type: () => UserProfileDataDto })
  data!: UserProfileDataDto;
}

export class SuccessDataDto {
  @ApiProperty({ example: 'Operation completed successfully' })
  message!: string;
}

export class SuccessResponseDto extends SuccessEnvelopeDto {
  @ApiProperty({ type: () => SuccessDataDto })
  data!: SuccessDataDto;
}
