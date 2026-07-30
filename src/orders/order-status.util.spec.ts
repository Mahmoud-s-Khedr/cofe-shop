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

  it('requires a payment method when completing a pickup order', () => {
    expect(() => assertValidAdminTransition('READY', 'COMPLETED', 'PICKUP', false, false)).toThrow(
      'Pickup completion requires a payment method',
    );
  });

  it('allows completing a pickup order with cash and no bank name', () => {
    expect(() => assertValidAdminTransition('READY', 'COMPLETED', 'PICKUP', false, false, 'CASH')).not.toThrow();
  });

  it('requires a bank name for bank payment on pickup completion', () => {
    expect(() => assertValidAdminTransition('READY', 'COMPLETED', 'PICKUP', false, false, 'BANK')).toThrow(
      'Bank payment requires a bank name',
    );
  });

  it('allows bank payment with a bank name on pickup completion', () => {
    expect(() => assertValidAdminTransition('READY', 'COMPLETED', 'PICKUP', false, false, 'BANK', 'Bank of Mauritania')).not.toThrow();
  });

  it('rejects a bank name for cash payment on pickup completion', () => {
    expect(() => assertValidAdminTransition('READY', 'COMPLETED', 'PICKUP', false, false, 'CASH', 'Any bank')).toThrow(
      'Cash payment cannot include a bank name',
    );
  });

  it('does not require payment details to complete a delivery order', () => {
    expect(() => assertValidAdminTransition('OUT_FOR_DELIVERY', 'COMPLETED', 'DELIVERY', false, false)).not.toThrow();
  });
});
