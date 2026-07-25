import { BadRequestException } from '@nestjs/common';

export type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PREPARING'
  | 'READY'
  | 'OUT_FOR_DELIVERY'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'REJECTED';

export const TERMINAL_STATUSES: ReadonlySet<OrderStatus> = new Set(['COMPLETED', 'CANCELLED', 'REJECTED']);

const NEXT_STATUSES: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ['CONFIRMED', 'REJECTED', 'CANCELLED'],
  CONFIRMED: ['PREPARING', 'CANCELLED'],
  PREPARING: ['READY', 'OUT_FOR_DELIVERY', 'CANCELLED'],
  READY: ['COMPLETED', 'CANCELLED'],
  OUT_FOR_DELIVERY: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
  REJECTED: [],
};

export function assertValidAdminTransition(
  current: OrderStatus,
  next: OrderStatus,
  orderType: 'DELIVERY' | 'PICKUP',
  hasScreenshot: boolean,
  hasReason: boolean,
): void {
  if (TERMINAL_STATUSES.has(current)) {
    throw new BadRequestException(`Order is already ${current} and cannot change status`);
  }
  if (!NEXT_STATUSES[current].includes(next)) {
    throw new BadRequestException(`Cannot transition order from ${current} to ${next}`);
  }
  if (next === 'CONFIRMED' && orderType === 'DELIVERY' && !hasScreenshot) {
    throw new BadRequestException('Order cannot be confirmed without a payment screenshot');
  }
  if (next === 'REJECTED' && !hasReason) {
    throw new BadRequestException('Rejection requires a reason');
  }
  if (next === 'READY' && orderType !== 'PICKUP') {
    throw new BadRequestException('Only pickup orders can become READY');
  }
  if (next === 'OUT_FOR_DELIVERY' && orderType !== 'DELIVERY') {
    throw new BadRequestException('Only delivery orders can become OUT_FOR_DELIVERY');
  }
}
