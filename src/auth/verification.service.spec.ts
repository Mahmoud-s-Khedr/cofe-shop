import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { VerificationService } from './verification.service';

describe('VerificationService', () => {
  const databaseService = {
    query: jest.fn(),
  };

  const configService = {
    get: jest.fn().mockReturnValue({
      otpSigningSecret: 'otp-secret',
      otpDevMode: true,
      otpTtlMinutes: 10,
    }),
  } as unknown as ConfigService;

  const service = new VerificationService(databaseService as any, configService as any);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('issues a fixed dev-mode code and stores its hash', async () => {
    databaseService.query.mockResolvedValueOnce({ rowCount: 1, rows: [] });

    const result = await service.issue('+22200000001', 'REGISTRATION');

    expect(result.code).toBe('000000');
    expect(databaseService.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO verification_codes'),
      ['+22200000001', expect.any(String), 'REGISTRATION', 10],
    );
  });

  it('rejects verification when no code exists', async () => {
    databaseService.query.mockResolvedValueOnce({ rowCount: 0, rows: [] });

    await expect(service.verify('+22200000001', '000000', 'REGISTRATION')).rejects.toThrow(BadRequestException);
  });

  it('rejects an incorrect code and increments attempts', async () => {
    databaseService.query
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            id: 5,
            code_hash: 'not-a-match',
            attempts: 0,
            expires_at: new Date(Date.now() + 60_000),
            used_at: null,
          },
        ],
      })
      .mockResolvedValueOnce({ rowCount: 1, rows: [] });

    await expect(service.verify('+22200000001', '111111', 'REGISTRATION')).rejects.toThrow(BadRequestException);
    expect(databaseService.query).toHaveBeenLastCalledWith(
      'UPDATE verification_codes SET attempts = attempts + 1 WHERE id = $1',
      [5],
    );
  });

  it('rejects an expired code', async () => {
    databaseService.query.mockResolvedValueOnce({
      rowCount: 1,
      rows: [
        {
          id: 6,
          code_hash: 'x',
          attempts: 0,
          expires_at: new Date(Date.now() - 60_000),
          used_at: null,
        },
      ],
    });

    await expect(service.verify('+22200000001', '000000', 'REGISTRATION')).rejects.toThrow('Code expired');
  });
});
