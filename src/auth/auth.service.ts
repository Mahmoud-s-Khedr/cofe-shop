import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { hash, verify } from 'argon2';
import { randomBytes } from 'crypto';
import { PoolClient } from 'pg';
import { DatabaseService } from '../database/database.service';
import { AppConfig } from '../config/configuration';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { RegisterDto } from './dto/register.dto';
import { ResendRegistrationCodeDto } from './dto/resend-registration-code.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyRegistrationDto } from './dto/verify-registration.dto';
import { VerificationService } from './verification.service';
import { AuthStateStore } from './auth-state.store';
import { LogoutDto } from './dto/logout.dto';
import { REFRESH_TTL_FALLBACK_SECONDS } from '../common/constants';
import { mapToAppUser } from '../common/mappers/app-user.mapper';

type UserRow = {
  id: number;
  name: string;
  phone: string;
  password_hash: string;
  role: 'USER' | 'ADMIN';
  status: 'PENDING_VERIFICATION' | 'ACTIVE' | 'BLOCKED';
};

@Injectable()
export class AuthService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService<{ app: AppConfig }, true>,
    private readonly authStateStore: AuthStateStore,
    private readonly verificationService: VerificationService,
  ) {}

  async register(dto: RegisterDto): Promise<Record<string, unknown>> {
    const passwordHash = await hash(dto.password);

    try {
      await this.databaseService.query(
        `INSERT INTO users (name, phone, password_hash, role, status)
         VALUES ($1, $2, $3, 'USER', 'PENDING_VERIFICATION')`,
        [dto.name, dto.phone, passwordHash],
      );
    } catch {
      throw new ConflictException('Phone number already registered');
    }

    const { code } = await this.verificationService.issue(dto.phone, 'REGISTRATION');
    return this.buildOtpSentResponse(code);
  }

  async resendRegistrationCode(dto: ResendRegistrationCodeDto): Promise<Record<string, unknown>> {
    const user = await this.databaseService.query<{ id: number }>(
      `SELECT id FROM users WHERE phone = $1 AND status = 'PENDING_VERIFICATION'`,
      [dto.phone],
    );
    if (!user.rowCount) {
      throw new BadRequestException('No pending registration found for this phone number');
    }

    const { code } = await this.verificationService.issue(dto.phone, 'REGISTRATION');
    return this.buildOtpSentResponse(code);
  }

  async verifyRegistration(dto: VerifyRegistrationDto): Promise<Record<string, unknown>> {
    await this.verificationService.verify(dto.phone, dto.code, 'REGISTRATION');

    return this.databaseService.withTransaction(async (client) => {
      const updated = await client.query<UserRow>(
        `UPDATE users
         SET status = 'ACTIVE', phone_verified_at = NOW(), updated_at = NOW()
         WHERE phone = $1 AND status = 'PENDING_VERIFICATION'
         RETURNING id, name, phone, password_hash, role, status`,
        [dto.phone],
      );

      if (!updated.rowCount) {
        throw new BadRequestException('No pending registration found for this phone number');
      }

      const user = updated.rows[0];
      const tokens = await this.generateTokens(user.id, user.phone, client);

      return { user: mapToAppUser(user), ...tokens };
    });
  }

  async login(dto: LoginDto): Promise<Record<string, unknown>> {
    const query = await this.databaseService.query<UserRow>(
      'SELECT id, name, phone, password_hash, role, status FROM users WHERE phone = $1 LIMIT 1',
      [dto.phone],
    );

    if (!query.rowCount) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const user = query.rows[0];

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await verify(user.password_hash, dto.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = await this.generateTokens(user.id, user.phone);
    return { user: mapToAppUser(user), ...tokens };
  }

  async forgotPassword(dto: ForgotPasswordDto): Promise<Record<string, unknown>> {
    const userQuery = await this.databaseService.query<{ id: number }>(
      `SELECT id FROM users WHERE phone = $1 AND status = 'ACTIVE' LIMIT 1`,
      [dto.phone],
    );

    if (!userQuery.rowCount) {
      return { message: 'If this phone number is registered, a code has been sent' };
    }

    const { code } = await this.verificationService.issue(dto.phone, 'PASSWORD_RESET');
    return this.buildOtpSentResponse(code);
  }

  async resetPassword(dto: ResetPasswordDto): Promise<Record<string, unknown>> {
    if (dto.newPassword !== dto.confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }

    await this.verificationService.verify(dto.phone, dto.code, 'PASSWORD_RESET');

    return this.databaseService.withTransaction(async (client) => {
      const account = await client.query<UserRow>(
        `SELECT id, name, phone, password_hash, role, status FROM users WHERE phone = $1 LIMIT 1`,
        [dto.phone],
      );

      if (!account.rowCount || account.rows[0].status !== 'ACTIVE') {
        throw new BadRequestException('User not found');
      }

      const user = account.rows[0];
      const passwordHash = await hash(dto.newPassword);

      await client.query(`UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2`, [
        passwordHash,
        user.id,
      ]);

      const tokens = await this.generateTokens(user.id, user.phone, client);
      return { message: 'Password reset successfully', ...tokens };
    });
  }

  async refresh(dto: RefreshTokenDto): Promise<Record<string, unknown>> {
    let payload: { sub: number; phone: string; jti: string };
    try {
      payload = await this.jwtService.verifyAsync(dto.refreshToken, {
        secret: this.appConfig.jwtRefreshSecret,
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (!payload.jti) throw new UnauthorizedException('Invalid refresh token');
    const storedUserId = await this.authStateStore.consumeRefreshTokenJti(payload.jti);
    if (!storedUserId || storedUserId !== payload.sub) throw new UnauthorizedException('Invalid refresh token');

    const user = await this.databaseService.query<UserRow>(
      'SELECT id, name, phone, password_hash, role, status FROM users WHERE id = $1 LIMIT 1',
      [payload.sub],
    );

    if (!user.rowCount || user.rows[0].status !== 'ACTIVE') {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const tokens = await this.generateTokens(user.rows[0].id, user.rows[0].phone);
    return { ...tokens };
  }

  async logout(dto: LogoutDto): Promise<Record<string, unknown>> {
    try {
      const payload: { jti?: string } = await this.jwtService.verifyAsync(dto.refreshToken, {
        secret: this.appConfig.jwtRefreshSecret,
      });
      if (payload.jti) {
        await this.authStateStore.revokeRefreshTokenJti(payload.jti);
      }
    } catch {
      // Token invalid or already expired — treat as successfully logged out
    }
    return {};
  }

  private get appConfig(): AppConfig {
    return this.configService.get('app', { infer: true });
  }

  private buildOtpSentResponse(code: string): Record<string, unknown> {
    return { message: 'Verification code sent', code };
  }

  private parseTtlSeconds(ttl: string): number {
    const match = ttl.match(/^(\d+)([smhd])$/);
    if (!match) return REFRESH_TTL_FALLBACK_SECONDS;
    const val = parseInt(match[1], 10);
    const units: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };
    return val * units[match[2]];
  }

  private async generateTokens(
    userId: number,
    phone: string,
    queryRunner?: PoolClient,
  ): Promise<Record<string, string>> {
    const jti = randomBytes(16).toString('hex');
    const basePayload = { sub: userId, phone };
    const refreshPayload = { ...basePayload, jti };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(basePayload, {
        secret: this.appConfig.jwtAccessSecret,
        expiresIn: this.appConfig.jwtAccessTtl as any,
      }),
      this.jwtService.signAsync(refreshPayload, {
        secret: this.appConfig.jwtRefreshSecret,
        expiresIn: this.appConfig.jwtRefreshTtl as any,
      }),
    ]);

    const ttlSeconds = this.parseTtlSeconds(this.appConfig.jwtRefreshTtl);
    await this.authStateStore.saveRefreshTokenJti(jti, userId, ttlSeconds, queryRunner);

    return { accessToken, refreshToken };
  }
}
