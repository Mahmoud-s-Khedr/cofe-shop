import { runDevSeed } from './dev-seeder';

describe('dev-seeder', () => {
  it('creates demo products that do not already exist', async () => {
    const query = jest.fn().mockImplementation((sql: string) => {
      if (sql.startsWith('SELECT id FROM products')) {
        return Promise.resolve({ rowCount: 0, rows: [] });
      }
      return Promise.resolve({ rowCount: 1, rows: [] });
    });

    const summary = await runDevSeed({ query } as any);

    expect(summary.productsCreated).toBeGreaterThan(0);
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO products (category, title'),
      expect.arrayContaining(['coffee']),
    );
  });

  it('skips products that already exist', async () => {
    const query = jest.fn().mockResolvedValue({ rowCount: 1, rows: [{ id: 1 }] });

    const summary = await runDevSeed({ query } as any);

    expect(summary.productsCreated).toBe(0);
  });
});
