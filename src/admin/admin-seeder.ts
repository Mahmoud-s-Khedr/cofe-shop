import { PoolClient } from 'pg';

export const ADMIN_PHONE_REGEX = /^\+?[1-9]\d{7,15}$/;
export const ADMIN_PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d).+$/;

export type AdminSeedInput = {
  phone: string;
  password: string;
};

export function parseAdminSeedInput(env: NodeJS.ProcessEnv): AdminSeedInput {
  const phone = (env.ADMIN_PHONE ?? '').trim();
  const password = env.ADMIN_PASSWORD ?? '';

  if (!phone) {
    throw new Error('ADMIN_PHONE is required');
  }
  if (!ADMIN_PHONE_REGEX.test(phone)) {
    throw new Error('ADMIN_PHONE must be a valid E.164-like phone number');
  }
  if (!password) {
    throw new Error('ADMIN_PASSWORD is required');
  }
  if (password.length < 8 || password.length > 64) {
    throw new Error('ADMIN_PASSWORD must be between 8 and 64 characters');
  }
  if (!ADMIN_PASSWORD_REGEX.test(password)) {
    throw new Error('ADMIN_PASSWORD must contain letters and numbers');
  }

  return { phone, password };
}

export async function seedAdminUser(
  client: Pick<PoolClient, 'query'>,
  input: Pick<AdminSeedInput, 'phone'>,
  passwordHash: string,
): Promise<{ id: number; phone: string; created: boolean }> {
  const { phone } = input;
  const existing = await client.query<{ id: number; phone: string }>('SELECT id, phone FROM users WHERE phone = $1', [
    phone,
  ]);

  let created = false;
  let targetId: number;
  if (!existing.rowCount) {
    created = true;
    const inserted = await client.query<{ id: number }>(
      `INSERT INTO users (name, phone, password_hash, role, status)
       VALUES ('Primary Admin', $1, $2, 'ADMIN', 'ACTIVE')
       RETURNING id`,
      [phone, passwordHash],
    );
    if (!inserted.rowCount) {
      throw new Error('Failed to create admin user');
    }
    targetId = inserted.rows[0].id;
  } else {
    targetId = existing.rows[0].id;
  }

  const updated = await client.query<{ id: number; phone: string }>(
    `UPDATE users
     SET password_hash = $1, role = 'ADMIN', status = 'ACTIVE', updated_at = NOW()
     WHERE id = $2
     RETURNING id, phone`,
    [passwordHash, targetId],
  );

  if (!updated.rowCount) {
    throw new Error('Failed to seed admin user');
  }

  return { id: updated.rows[0].id, phone: updated.rows[0].phone, created };
}
