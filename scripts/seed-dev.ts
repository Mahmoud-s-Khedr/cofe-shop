import { Pool } from 'pg';
import { runDevSeed } from '../src/dev/dev-seeder';

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required');
  }

  const pool = new Pool({ connectionString: databaseUrl });
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const summary = await runDevSeed(client);
    await client.query('COMMIT');
    console.log(`Dev seed completed: created ${summary.productsCreated} product(s)`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

void main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Dev seed failed: ${message}`);
  process.exit(1);
});
