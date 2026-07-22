import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  const databaseService = {
    query: jest.fn(),
  };

  const configService = {
    get: jest.fn().mockReturnValue({
      jwtAccessSecret: 'access-secret',
    }),
  } as unknown as ConfigService;

  const strategy = new JwtStrategy(configService as any, databaseService as any);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('accepts a token for an active user', async () => {
    databaseService.query.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{ id: 1, phone: '+22200000001', role: 'USER', status: 'ACTIVE' }],
    });

    await expect(strategy.validate({ sub: 1, phone: '+22200000001' })).resolves.toEqual({
      sub: 1,
      phone: '+22200000001',
      isAdmin: false,
    });
  });

  it('accepts numeric-string sub and normalizes it to number', async () => {
    databaseService.query.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{ id: 63, phone: '+22200000063', role: 'ADMIN', status: 'ACTIVE' }],
    });

    await expect(strategy.validate({ sub: '63', phone: '+22200000063' } as any)).resolves.toEqual({
      sub: 63,
      phone: '+22200000063',
      isAdmin: true,
    });
    expect(databaseService.query).toHaveBeenCalledWith(
      'SELECT id, phone, role, status FROM users WHERE id = $1 LIMIT 1',
      [63],
    );
  });

  it('rejects invalid sub values early', async () => {
    await expect(strategy.validate({ sub: 'abc', phone: 'x' } as any)).rejects.toThrow('Invalid token');
    await expect(strategy.validate({ sub: 0, phone: 'x' } as any)).rejects.toThrow('Invalid token');
    await expect(strategy.validate({ sub: -5, phone: 'x' } as any)).rejects.toThrow('Invalid token');
    await expect(strategy.validate({ phone: 'x' } as any)).rejects.toThrow('Invalid token');
    expect(databaseService.query).not.toHaveBeenCalled();
  });

  it('rejects tokens for blocked or pending users', async () => {
    databaseService.query.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{ id: 2, phone: '+22200000002', role: 'USER', status: 'BLOCKED' }],
    });

    await expect(strategy.validate({ sub: 2, phone: '+22200000002' })).rejects.toThrow('Invalid token');
  });
});
