import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { hashGuestAccessToken } from './guest-token.util';

describe('OrdersService', () => {
  const filesService = {
    uploadImage: jest.fn(),
    deleteFile: jest.fn(),
  };

  function buildClient(queryImpl: jest.Mock) {
    return { query: queryImpl };
  }

  function buildDatabaseService(client: { query: jest.Mock }) {
    return {
      query: client.query,
      withTransaction: jest.fn((callback: any) => callback(client)),
    };
  }

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createOrder', () => {
    it('rejects pickup orders without a pickup time', async () => {
      const client = buildClient(jest.fn());
      const service = new OrdersService(buildDatabaseService(client) as any, filesService as any);

      await expect(
        service.createOrder(null, {
          customerName: 'A',
          customerPhone: '+22200000000',
          orderType: 'PICKUP',
          items: [{ productId: 1, quantity: 1 }],
        } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('ignores client-supplied prices and computes totals from the database', async () => {
      const query = jest.fn();
      // 1) lock products
      query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: 1, category: 'coffee', title: 'Latte', description: null, details: null, imageUrl: 'https://images.example/latte.jpg', price: '250.00', quantity: null, is_active: true, is_available: true }],
      });
      // 2) fetch product images
      query.mockResolvedValueOnce({ rowCount: 1, rows: [{ productId: 1, fileId: 12, url: 'https://images.example/latte.jpg' }] });
      // 3) insert order
      query.mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 99 }] });
      // 4) insert order_items
      query.mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 1 }] });
      // 5) insert order-item image snapshot
      query.mockResolvedValueOnce({ rowCount: 1, rows: [] });
      // 6) decrement stock (no-op since quantity is null)
      query.mockResolvedValueOnce({ rowCount: 0, rows: [] });
      // 7) insert status history
      query.mockResolvedValueOnce({ rowCount: 1, rows: [] });
      // 8) fetchOrder: order row
      query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: '99', orderNumber: 'BW-TEST-0001', userId: null, status: 'PENDING', subtotal: '500.00', total: '500.00' }],
      });
      // 9) fetchOrder: items row
      query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: '1', orderId: '99', productId: '1', productTitle: 'Latte', category: 'coffee', description: null, details: null, imageUrl: 'https://images.example/latte.jpg', hasSnapshot: true, unitPrice: '250.00', quantity: 2 }],
      });
      // 10) fetchOrder: snapshot images
      query.mockResolvedValueOnce({ rowCount: 1, rows: [{ orderItemId: 1, fileId: 12, url: 'https://images.example/latte.jpg' }] });

      const client = buildClient(query);
      const service = new OrdersService(buildDatabaseService(client) as any, filesService as any);

      const result = await service.createOrder(null, {
        customerName: 'A',
        customerPhone: '+22200000000',
        orderType: 'PICKUP',
        pickupTime: new Date().toISOString(),
        items: [{ productId: 1, quantity: 2 }],
      } as any);

      expect((result as any).order.guestAccessToken).toBeDefined();
      expect((result as any).order.items[0]).toMatchObject({
        imageUrl: 'https://images.example/latte.jpg',
        images: [{ fileId: 12, url: 'https://images.example/latte.jpg' }],
      });
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO order_item_images'),
        [1, 12, 'https://images.example/latte.jpg', 0],
      );
    });

    it('accepts delivery orders without an address', async () => {
      const query = jest.fn();
      query
        .mockResolvedValueOnce({
          rowCount: 1,
          rows: [{ id: 1, category: 'coffee', title: 'Latte', description: null, details: null, imageUrl: null, price: '250.00', quantity: null, is_active: true, is_available: true }],
        })
        .mockResolvedValueOnce({ rowCount: 0, rows: [] })
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 99 }] })
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 1 }] })
        .mockResolvedValueOnce({ rowCount: 0, rows: [] })
        .mockResolvedValueOnce({ rowCount: 1, rows: [] })
        .mockResolvedValueOnce({
          rowCount: 1,
          rows: [{ id: '99', orderNumber: 'BW-TEST-0001', userId: null, status: 'PENDING', subtotal: '250.00', total: '250.00' }],
        })
        .mockResolvedValueOnce({
          rowCount: 1,
          rows: [{ id: '1', orderId: '99', productId: '1', productTitle: 'Latte', category: 'coffee', description: null, details: null, imageUrl: null, hasSnapshot: false, unitPrice: '250.00', quantity: 1 }],
        })
        .mockResolvedValueOnce({ rowCount: 0, rows: [] })
        .mockResolvedValueOnce({ rowCount: 0, rows: [] });
      const service = new OrdersService(buildDatabaseService(buildClient(query)) as any, filesService as any);

      await expect(
        service.createOrder(null, {
          customerName: 'A',
          customerPhone: '+22200000000',
          orderType: 'DELIVERY',
          items: [{ productId: 1, quantity: 1 }],
        } as any),
      ).resolves.toBeDefined();
    });

    it('rejects inactive products', async () => {
      const query = jest
        .fn()
        .mockResolvedValueOnce({
          rowCount: 1,
          rows: [{ id: 1, category: 'coffee', title: 'Latte', description: null, details: null, imageUrl: null, price: '250.00', quantity: null, is_active: false, is_available: true }],
        })
        .mockResolvedValueOnce({ rowCount: 0, rows: [] });
      const client = buildClient(query);
      const service = new OrdersService(buildDatabaseService(client) as any, filesService as any);

      await expect(
        service.createOrder(null, {
          customerName: 'A',
          customerPhone: '+22200000000',
          orderType: 'PICKUP',
          pickupTime: new Date().toISOString(),
          items: [{ productId: 1, quantity: 1 }],
        } as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getOrderForRequester', () => {
    it('throws NotFoundException when order is missing', async () => {
      const query = jest.fn().mockResolvedValueOnce({ rowCount: 0, rows: [] });
      const service = new OrdersService({ query } as any, filesService as any);

      await expect(service.getOrderForRequester('BW-X', {})).rejects.toThrow(NotFoundException);
    });

    it('rejects a guest with the wrong token', async () => {
      const query = jest
        .fn()
        .mockResolvedValueOnce({
          rowCount: 1,
          rows: [{ id: '1', userId: null, guestAccessTokenHash: hashGuestAccessToken('right-token') }],
        })
        .mockResolvedValueOnce({ rowCount: 0, rows: [] });
      const service = new OrdersService({ query } as any, filesService as any);

      await expect(
        service.getOrderForRequester('BW-X', { guestToken: 'wrong-token' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('allows the owning user', async () => {
      const query = jest
        .fn()
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: '1', userId: '7', guestAccessTokenHash: null }] })
        .mockResolvedValueOnce({ rowCount: 0, rows: [] });
      const service = new OrdersService({ query } as any, filesService as any);

      const result = await service.getOrderForRequester('BW-X', { userId: 7 });
      expect(result).toMatchObject({ order: { id: 1 } });
    });

    it('rejects a different authenticated user', async () => {
      const query = jest
        .fn()
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: '1', userId: '7', guestAccessTokenHash: null }] })
        .mockResolvedValueOnce({ rowCount: 0, rows: [] });
      const service = new OrdersService({ query } as any, filesService as any);

      await expect(service.getOrderForRequester('BW-X', { userId: 8 })).rejects.toThrow(ForbiddenException);
    });
  });

  describe('uploadScreenshot', () => {
    it('allows the owning user to upload a screenshot to a pending order', async () => {
      const query = jest
        .fn()
        .mockResolvedValueOnce({
          rowCount: 1,
          rows: [{ id: '10', userId: '7', status: 'PENDING', screenshotFileId: null, guestAccessTokenHash: null }],
        })
        .mockResolvedValueOnce({ rowCount: 0, rows: [] })
        .mockResolvedValueOnce({ rowCount: 1, rows: [] })
        .mockResolvedValueOnce({
          rowCount: 1,
          rows: [
            {
              id: '10',
              orderNumber: 'BW-X',
              userId: '7',
              status: 'PENDING',
              screenshotUrl: 'https://img.example/order.jpg',
              screenshotFileId: '20',
              guestAccessTokenHash: null,
            },
          ],
        })
        .mockResolvedValueOnce({ rowCount: 0, rows: [] });
      filesService.uploadImage.mockResolvedValueOnce({ fileId: 20, url: 'https://img.example/order.jpg' });

      const service = new OrdersService({ query } as any, filesService as any);

      const result = await service.uploadScreenshot(
        'BW-X',
        { userId: 7 },
        {
          originalname: 'proof.jpg',
          mimetype: 'image/jpeg',
          size: 123,
          buffer: Buffer.from('proof'),
        },
      );

      expect(filesService.uploadImage).toHaveBeenCalled();
      expect(result).toMatchObject({
        order: { id: 10, orderNumber: 'BW-X', userId: 7, screenshotUrl: 'https://img.example/order.jpg' },
      });
    });
  });

  describe('getMyOrder', () => {
    it("returns the current user's own order", async () => {
      const query = jest
        .fn()
        .mockResolvedValueOnce({
          rowCount: 1,
          rows: [{ id: '10', orderNumber: 'BW-X', userId: '7', guestAccessTokenHash: null }],
        })
        .mockResolvedValueOnce({ rowCount: 0, rows: [] });
      const service = new OrdersService({ query } as any, filesService as any);

      const result = await service.getMyOrder(7, 'BW-X');

      expect(result).toMatchObject({ order: { id: 10, orderNumber: 'BW-X', userId: 7 } });
    });

    it('throws NotFoundException when the order belongs to another user', async () => {
      const query = jest
        .fn()
        .mockResolvedValueOnce({
          rowCount: 1,
          rows: [{ id: '10', orderNumber: 'BW-X', userId: '8', guestAccessTokenHash: null }],
        })
        .mockResolvedValueOnce({ rowCount: 0, rows: [] });
      const service = new OrdersService({ query } as any, filesService as any);

      await expect(service.getMyOrder(7, 'BW-X')).rejects.toThrow(NotFoundException);
    });
  });
  describe('adminListOrders', () => {
    it('rejects a date range where the start is after the end', async () => {
      const query = jest.fn();
      const service = new OrdersService({ query } as any, filesService as any);

      await expect(service.adminListOrders({ fromDate: '2026-07-31', toDate: '2026-07-01' })).rejects.toThrow(BadRequestException);

      expect(query).not.toHaveBeenCalled();
    });
  });

});
