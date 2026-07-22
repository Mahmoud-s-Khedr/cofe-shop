import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { escapeLike } from '../common/helpers/db.helpers';
import { resolveOffsetPagination } from '../common/helpers/pagination.helpers';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { mapToAppUser } from '../common/mappers/app-user.mapper';

const USER_COLUMNS = 'id, name, phone, role, status, phone_verified_at';

@Injectable()
export class AdminService {
  constructor(private readonly databaseService: DatabaseService) {}

  async listUsers(queryDto: ListUsersQueryDto): Promise<Record<string, unknown>> {
    const { limit, offset } = resolveOffsetPagination(queryDto, { defaultLimit: 20, maxLimit: 100 });
    const params: unknown[] = [];
    const clauses: string[] = [];

    if (queryDto.status) {
      params.push(queryDto.status);
      clauses.push(`status = $${params.length}`);
    }
    if (queryDto.q) {
      const escaped = escapeLike(queryDto.q);
      params.push(`%${escaped}%`, `%${escaped}%`);
      clauses.push(`(name ILIKE $${params.length - 1} ESCAPE '\\' OR phone ILIKE $${params.length} ESCAPE '\\')`);
    }

    const whereClause = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const query = await this.databaseService.query(
      `SELECT ${USER_COLUMNS} FROM users ${whereClause}
       ORDER BY id DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset],
    );

    return { users: query.rows.map((row) => mapToAppUser(row)) };
  }

  async getUserDetails(userId: number): Promise<Record<string, unknown>> {
    const query = await this.databaseService.query(`SELECT ${USER_COLUMNS} FROM users WHERE id = $1`, [userId]);
    if (!query.rowCount) {
      throw new NotFoundException('User not found');
    }
    return { user: mapToAppUser(query.rows[0]) };
  }

  async updateUserStatus(userId: number, dto: UpdateUserStatusDto): Promise<Record<string, unknown>> {
    const query = await this.databaseService.query(
      `UPDATE users SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING ${USER_COLUMNS}`,
      [dto.status, userId],
    );
    if (!query.rowCount) {
      throw new NotFoundException('User not found');
    }
    return { user: mapToAppUser(query.rows[0]) };
  }
}
