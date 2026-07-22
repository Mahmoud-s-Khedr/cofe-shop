import { ApiProperty } from '@nestjs/swagger';
import { SuccessEnvelopeDto } from '../../common/dto/api-response-envelope.dto';

export class AdminUserDto {
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

export class AdminUserDataDto {
  @ApiProperty({ type: AdminUserDto })
  user!: AdminUserDto;
}

export class AdminUserResponseDto extends SuccessEnvelopeDto {
  @ApiProperty({ type: () => AdminUserDataDto })
  data!: AdminUserDataDto;
}

export class AdminUsersListDataDto {
  @ApiProperty({ type: [AdminUserDto] })
  users!: AdminUserDto[];
}

export class AdminUsersListResponseDto extends SuccessEnvelopeDto {
  @ApiProperty({ type: () => AdminUsersListDataDto })
  data!: AdminUsersListDataDto;
}
