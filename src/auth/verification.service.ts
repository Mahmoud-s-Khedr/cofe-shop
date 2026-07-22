import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, randomInt } from 'crypto';
import { AppConfig } from '../config/configuration';
import { DatabaseService } from '../database/database.service';
import { OTP_MAX_ATTEMPTS } from '../common/constants';

export type VerificationPurpose = 'REGISTRATION' | 'PASSWORD_RESET';

@Injectable()
export class VerificationService {
  private readonly logger = new Logger(VerificationService.name);

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly configService: ConfigService<{ app: AppConfig }, true>,
  ) {}

  /**
   * Issues a new OTP for the given phone/purpose. No SMS provider is wired up
   * yet, so the plaintext code is returned in the response instead of being
   * sent — swap this for a real sender once one is available.
   */
  async issue(phone: string, purpose: VerificationPurpose): Promise<{ code: string }> {
    const code = this.appConfig.otpDevMode ? '000000' : String(randomInt(100000, 1000000));
    const codeHash = this.hashCode(code);

    await this.databaseService.query(
      `INSERT INTO verification_codes (phone, code_hash, purpose, expires_at)
       VALUES ($1, $2, $3, NOW() + ($4::text || ' minutes')::interval)`,
      [phone, codeHash, purpose, this.appConfig.otpTtlMinutes],
    );

    this.logger.log(`OTP issued for ${phone} (${purpose})`);
    return { code };
  }

  async verify(phone: string, code: string, purpose: VerificationPurpose): Promise<void> {
    const query = await this.databaseService.query<{
      id: number;
      code_hash: string;
      attempts: number;
      expires_at: Date;
      used_at: Date | null;
    }>(
      `SELECT id, code_hash, attempts, expires_at, used_at
       FROM verification_codes
       WHERE phone = $1 AND purpose = $2
       ORDER BY created_at DESC
       LIMIT 1`,
      [phone, purpose],
    );

    if (!query.rowCount) {
      throw new BadRequestException('No verification code found for this phone number');
    }

    const row = query.rows[0];

    if (row.used_at) {
      throw new BadRequestException('Code already used');
    }
    if (new Date(row.expires_at).getTime() < Date.now()) {
      throw new BadRequestException('Code expired');
    }
    if (row.attempts >= OTP_MAX_ATTEMPTS) {
      throw new BadRequestException('Too many attempts — request a new code');
    }

    if (this.hashCode(code) !== row.code_hash) {
      await this.databaseService.query('UPDATE verification_codes SET attempts = attempts + 1 WHERE id = $1', [
        row.id,
      ]);
      throw new BadRequestException('Invalid code');
    }

    await this.databaseService.query('UPDATE verification_codes SET used_at = NOW() WHERE id = $1', [row.id]);
  }

  private get appConfig(): AppConfig {
    return this.configService.get('app', { infer: true });
  }

  private hashCode(code: string): string {
    return createHmac('sha256', this.appConfig.otpSigningSecret).update(code).digest('hex');
  }
}
