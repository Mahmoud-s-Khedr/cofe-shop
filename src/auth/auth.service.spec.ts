import { BadRequestException, ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { hash } from 'argon2';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  const databaseService = {
    query: jest.fn(),
    withTransaction: jest.fn(),
  };

  const jwtService = {
    signAsync: jest.fn(),
    verifyAsync: jest.fn(),
  } as unknown as JwtService;

  const appConfig = {
    jwtAccessSecret: 'access',
    jwtRefreshSecret: 'refresh',
    jwtAccessTtl: '15m',
    jwtRefreshTtl: '30d',
    otpSigningSecret: 'otp-secret',
    otpDevMode: true,
    otpTtlMinutes: 10,
  };

  const configService = {
    get: jest.fn().mockImplementation(() => appConfig),
  } as unknown as ConfigService;

  const authStateStore = {
    saveRefreshTokenJti: jest.fn().mockResolvedValue(undefined),
    consumeRefreshTokenJti: jest.fn().mockResolvedValue(1),
    revokeRefreshTokenJti: jest.fn().mockResolvedValue(undefined),
  };

  const verificationService = {
    issue: jest.fn(),
    verify: jest.fn(),
  };

  const service = new AuthService(
    databaseService as any,
    jwtService,
    configService as any,
    authStateStore as any,
    verificationService as any,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('rejects duplicate phone on registration', async () => {
    databaseService.query.mockRejectedValue(new Error('unique_violation'));

    await expect(
      service.register({ name: 'User', phone: '+22200000001', password: 'abc12345' }),
    ).rejects.toThrow(ConflictException);
  });

  it('rejects login for non-active users', async () => {
    databaseService.query.mockResolvedValue({
      rowCount: 1,
      rows: [
        {
          id: 1,
          name: 'User',
          phone: '+22200000001',
          password_hash: await hash('abc12345'),
          role: 'USER',
          status: 'BLOCKED',
        },
      ],
    });

    await expect(service.login({ phone: '+22200000001', password: 'abc12345' })).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('rejects password reset for non-active users', async () => {
    verificationService.verify.mockResolvedValue(undefined);

    const client = {
      query: jest.fn().mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: 1, name: 'User', phone: '+22200000001', status: 'BLOCKED', role: 'USER' }],
      }),
    };
    databaseService.withTransaction.mockImplementation((callback: any) => callback(client));

    await expect(
      service.resetPassword({
        phone: '+22200000001',
        code: '123456',
        newPassword: 'abc12345',
        confirmPassword: 'abc12345',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('returns the verification code in the registration response', async () => {
    databaseService.query.mockResolvedValueOnce({ rowCount: 1, rows: [] });
    verificationService.issue.mockResolvedValue({ code: '123456' });

    const response = await service.register({ name: 'User', phone: '+22200000001', password: 'abc12345' });

    expect(verificationService.issue).toHaveBeenCalledWith('+22200000001', 'REGISTRATION');
    expect(response).toMatchObject({ message: 'Verification code sent', code: '123456' });
  });

  it('silently succeeds for forgot-password when phone is unregistered', async () => {
    databaseService.query.mockResolvedValue({ rowCount: 0, rows: [] });

    const response = await service.forgotPassword({ phone: '+22200000099' });

    expect(response).toMatchObject({ message: 'If this phone number is registered, a code has been sent' });
    expect(verificationService.issue).not.toHaveBeenCalled();
  });

  it('verifies the code before completing registration', async () => {
    verificationService.verify.mockResolvedValue(undefined);

    const client = {
      query: jest
        .fn()
        .mockResolvedValueOnce({
          rowCount: 1,
          rows: [{ id: 11, name: 'User', phone: '+22200000001', password_hash: 'hash', role: 'USER', status: 'ACTIVE' }],
        })
        .mockResolvedValueOnce({ rowCount: 1, rows: [] }),
    };
    databaseService.withTransaction.mockImplementation((callback: any) => callback(client));
    jwtService.signAsync = jest.fn().mockResolvedValueOnce('access').mockResolvedValueOnce('refresh') as any;

    const response = await service.verifyRegistration({ phone: '+22200000001', code: '123456' });

    expect(verificationService.verify).toHaveBeenCalledWith('+22200000001', '123456', 'REGISTRATION');
    expect(response).toMatchObject({ user: { id: 11, phone: '+22200000001' } });
  });

  it('throws UnauthorizedException when refresh token has no jti', async () => {
    (jwtService.verifyAsync as jest.Mock).mockResolvedValue({ sub: 1, phone: '+22200000001' });

    await expect(service.refresh({ refreshToken: 'no-jti-token' })).rejects.toThrow(UnauthorizedException);
  });

  it('rejects resetPassword when confirmPassword does not match', async () => {
    await expect(
      service.resetPassword({
        phone: '+22200000001',
        code: '123456',
        newPassword: 'abc12345',
        confirmPassword: 'different1',
      }),
    ).rejects.toThrow(BadRequestException);
  });
});
