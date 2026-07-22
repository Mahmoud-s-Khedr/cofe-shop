import { parseProdSeedInput, runProdSeed } from './prod-seeder';

jest.mock('argon2', () => ({
  hash: jest.fn(async () => 'hashed'),
}));

jest.mock('../admin/admin-seeder', () => ({
  ...jest.requireActual('../admin/admin-seeder'),
  seedAdminUser: jest.fn(),
}));

import { seedAdminUser } from '../admin/admin-seeder';

describe('prod-seeder', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('reuses admin env parsing rules', () => {
    const input = parseProdSeedInput({
      ADMIN_PHONE: '+201000000000',
      ADMIN_PASSWORD: 'Secret123',
    });

    expect(input).toEqual({ phone: '+201000000000', password: 'Secret123' });
  });

  it('runs the admin seed step and returns a summary', async () => {
    (seedAdminUser as jest.Mock).mockResolvedValue({ id: 7, phone: '+201000000000', created: true });

    const summary = await runProdSeed({ query: jest.fn() } as any, {
      phone: '+201000000000',
      password: 'Secret123',
    });

    expect(seedAdminUser).toHaveBeenCalledTimes(1);
    expect(summary.admin).toEqual({ action: 'created', id: 7, phone: '+201000000000' });
  });

  it('propagates failures from the admin step', async () => {
    (seedAdminUser as jest.Mock).mockRejectedValue(new Error('admin failure'));

    await expect(
      runProdSeed({ query: jest.fn() } as any, { phone: '+201000000000', password: 'Secret123' }),
    ).rejects.toThrow('admin failure');
  });
});
