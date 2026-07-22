import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const OrderAccessToken = createParamDecorator((_data: unknown, context: ExecutionContext): string | undefined => {
  const request = context.switchToHttp().getRequest();
  const header = request.headers['x-order-token'];
  return Array.isArray(header) ? header[0] : header;
});
