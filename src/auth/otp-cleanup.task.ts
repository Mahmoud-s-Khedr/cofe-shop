import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class OtpCleanupTask {
  private readonly logger = new Logger(OtpCleanupTask.name);

  constructor(private readonly databaseService: DatabaseService) {}

  @Cron('0 * * * *') // every hour at :00
  async purgeExpiredCodes(): Promise<void> {
    const result = await this.databaseService.query(
      `DELETE FROM verification_codes
       WHERE used_at IS NOT NULL
          OR expires_at < NOW() - INTERVAL '1 day'`,
    );
    this.logger.log(`Purged ${result.rowCount ?? 0} expired/used verification codes`);
  }
}
