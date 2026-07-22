import { randomInt } from 'crypto';

export function generateOrderNumber(): string {
  const now = new Date();
  const datePart = `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, '0')}${String(
    now.getUTCDate(),
  ).padStart(2, '0')}`;
  const suffix = String(randomInt(0, 10000)).padStart(4, '0');
  return `BW-${datePart}-${suffix}`;
}
