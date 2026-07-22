import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { hash, verify } from 'argon2';
import { DatabaseService } from '../database/database.service';
import { AuthUser } from '../common/types/auth-user.type';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { mapToAppUser } from '../common/mappers/app-user.mapper';

@Injectable()
export class UsersService {
  constructor(private readonly databaseService: DatabaseService) {}

  async getMe(user: AuthUser): Promise<Record<string, unknown>> {
    const query = await this.databaseService.query(
      'SELECT id, name, phone, role, status FROM users WHERE id = $1',
      [user.sub],
    );

    if (!query.rowCount) {
      throw new NotFoundException('User not found');
    }

    return { user: mapToAppUser(query.rows[0]) };
  }

  async updateMe(user: AuthUser, dto: UpdateProfileDto): Promise<Record<string, unknown>> {
    if (dto.name === undefined) {
      throw new BadRequestException('Nothing to update');
    }

    const result = await this.databaseService.query(
      'UPDATE users SET name = $1, updated_at = NOW() WHERE id = $2',
      [dto.name, user.sub],
    );

    if (!result.rowCount) {
      throw new NotFoundException('User not found');
    }

    return this.getMe(user);
  }

  async changePassword(user: AuthUser, dto: ChangePasswordDto): Promise<Record<string, unknown>> {
    const query = await this.databaseService.query<{ password_hash: string }>(
      'SELECT password_hash FROM users WHERE id = $1',
      [user.sub],
    );

    if (!query.rowCount) {
      throw new NotFoundException('User not found');
    }

    const isOldPasswordValid = await verify(query.rows[0].password_hash, dto.oldPassword);
    if (!isOldPasswordValid) {
      throw new BadRequestException('Invalid old password');
    }

    const newPasswordHash = await hash(dto.newPassword);
    await this.databaseService.query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [
      newPasswordHash,
      user.sub,
    ]);

    return { message: 'Password changed successfully' };
  }
}
