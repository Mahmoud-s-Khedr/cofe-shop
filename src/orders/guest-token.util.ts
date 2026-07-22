import { createHash, randomBytes } from 'crypto';

export function generateGuestAccessToken(): string {
  return randomBytes(24).toString('hex');
}

export function hashGuestAccessToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
