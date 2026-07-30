import { ForbiddenException } from '@nestjs/common';
import { ProductsController } from './products.controller';

describe('ProductsController', () => {
  const productsService = {
    searchProducts: jest.fn(),
  };
  const controller = new ProductsController(productsService as any);

  beforeEach(() => {
    jest.clearAllMocks();
    productsService.searchProducts.mockResolvedValue({ items: [], total: 0 });
  });

  it('shows guests and regular users only available products', async () => {
    await controller.list({}, null);
    await controller.list({}, { sub: 1, phone: '+22200000001', isAdmin: false });

    expect(productsService.searchProducts).toHaveBeenNthCalledWith(1, {}, true);
    expect(productsService.searchProducts).toHaveBeenNthCalledWith(2, {}, true);
  });

  it('lets admins list all products or filter by availability', async () => {
    const admin = { sub: 1, phone: '+22200000001', isAdmin: true };

    await controller.list({}, admin);
    await controller.list({ available: false }, admin);

    expect(productsService.searchProducts).toHaveBeenNthCalledWith(1, {}, false);
    expect(productsService.searchProducts).toHaveBeenNthCalledWith(2, { available: false }, false);
  });

  it('rejects the availability filter for guests and regular users', () => {
    expect(() => controller.list({ available: false }, null)).toThrow(ForbiddenException);
    expect(() => controller.list({ available: true }, { sub: 1, phone: '+22200000001', isAdmin: false })).toThrow(
      ForbiddenException,
    );
  });
});
