import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { RedisService } from '../redis/redis.service';

type QueryRunner = {
  query: (text: string, values?: unknown[]) => Promise<unknown>;
};

/** Redis-accelerated cache in front of the `refresh_tokens` table; Postgres remains the source of truth. */
@Injectable()
export class AuthStateStore implements OnModuleInit {
  private readonly logger = new Logger(AuthStateStore.name);

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly redisService: RedisService,
  ) {}

  onModuleInit(): void {
    if (this.redisService.isEnabled()) {
      this.logger.log('Auth state mode: hybrid (Postgres source + Redis accelerator)');
      return;
    }

    this.logger.warn('Auth state mode: postgres-fallback (Redis disabled)');
  }

  async saveRefreshTokenJti(
    jti: string,
    userId: number,
    ttlSeconds: number,
    queryRunner?: QueryRunner,
  ): Promise<void> {
    await this.tryRedisSet(
      `refresh_jti:${jti}`,
      () => this.redisService.set(`refresh_jti:${jti}`, String(userId), ttlSeconds),
      'refresh token save',
    );

    const runner = queryRunner ?? this.databaseService;
    await runner.query(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, NOW() + ($3::text || ' seconds')::interval)`,
      [userId, jti, ttlSeconds],
    );
  }

  async consumeRefreshTokenJti(jti: string): Promise<number | null> {
    await this.tryRedisSet(
      `refresh_jti:${jti}`,
      () => this.redisService.del(`refresh_jti:${jti}`),
      'refresh token consume',
    );

    const result = await this.databaseService.query<{ user_id: number }>(
      `DELETE FROM refresh_tokens
       WHERE token_hash = $1 AND revoked_at IS NULL AND expires_at > NOW()
       RETURNING user_id`,
      [jti],
    );

    if (!result.rowCount) {
      return null;
    }

    return result.rows[0].user_id;
  }

  async revokeRefreshTokenJti(jti: string): Promise<void> {
    await this.tryRedisSet(
      `refresh_jti:${jti}`,
      () => this.redisService.del(`refresh_jti:${jti}`),
      'refresh token revoke',
    );

    await this.databaseService.query(`UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = $1`, [jti]);
  }

  private async tryRedisSet(key: string, op: () => Promise<void>, action: string): Promise<void> {
    if (!this.redisService.isEnabled()) {
      return;
    }

    try {
      await op();
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Redis ${action} failed for ${key}, using Postgres only: ${msg}`);
    }
  }
}
