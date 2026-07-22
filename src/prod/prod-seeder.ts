import { hash } from 'argon2';
import { PoolClient } from 'pg';
import { AdminSeedInput, parseAdminSeedInput, seedAdminUser } from '../admin/admin-seeder';

type Queryable = Pick<PoolClient, 'query'>;

export type ProdSeedInput = AdminSeedInput;

export type ProdSeedSummary = {
  admin: {
    action: 'created' | 'updated';
    id: number;
    phone: string;
  };
};

export function parseProdSeedInput(env: NodeJS.ProcessEnv): ProdSeedInput {
  return parseAdminSeedInput(env);
}

export async function runProdSeed(client: Queryable, input: ProdSeedInput): Promise<ProdSeedSummary> {
  const passwordHash = await hash(input.password);
  const admin = await seedAdminUser(client, { phone: input.phone }, passwordHash);

  return {
    admin: {
      action: admin.created ? 'created' : 'updated',
      id: admin.id,
      phone: admin.phone,
    },
  };
}
