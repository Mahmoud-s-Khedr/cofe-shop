type AppUserSource = Record<string, unknown>;

export type AppUser = {
  id: number;
  name: string;
  phone: string;
  role: string;
  status: string;
  phoneVerifiedAt: string | null;
};

export function mapToAppUser(source: AppUserSource): AppUser {
  return {
    id: toNumber(source.id),
    name: asString(source.name),
    phone: asString(source.phone),
    role: asString(source.role),
    status: asString(source.status),
    phoneVerifiedAt: asNullableString(source.phone_verified_at),
  };
}

function toNumber(value: unknown): number {
  return typeof value === 'number' ? value : Number(value ?? 0);
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function asNullableString(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  return typeof value === 'string' ? value : String(value);
}
