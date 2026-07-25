import { BadRequestException } from '@nestjs/common';
import { assertValidAdminTransition } from './order-status.util';

describe('assertValidAdminTransition', () => {
  it('allows confirming pickup orders without a payment screenshot', () => {
    expect(() => assertValidAdminTransition('PENDING', 'CONFIRMED', 'PICKUP', false, false)).not.toThrow();
  });

  it('rejects confirming delivery orders without a payment screenshot', () => {
    expect(() => assertValidAdminTransition('PENDING', 'CONFIRMED', 'DELIVERY', false, false)).toThrow(
      BadRequestException,
    );
  });

  it('allows confirming delivery orders with a payment screenshot', () => {
    expect(() => assertValidAdminTransition('PENDING', 'CONFIRMED', 'DELIVERY', true, false)).not.toThrow();
  });
});
