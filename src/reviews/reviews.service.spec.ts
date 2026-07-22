import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ReviewsService } from './reviews.service';

describe('ReviewsService', () => {
  const databaseService = { query: jest.fn() };
  const service = new ReviewsService(databaseService as any);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createReview', () => {
    it('throws NotFoundException when order is missing', async () => {
      databaseService.query.mockResolvedValueOnce({ rowCount: 0, rows: [] });

      await expect(service.createReview(1, 'BW-X', 1, { rating: 5 })).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when order belongs to another user', async () => {
      databaseService.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: '10', userId: '2', status: 'COMPLETED' }],
      });

      await expect(service.createReview(1, 'BW-X', 1, { rating: 5 })).rejects.toThrow(ForbiddenException);
    });

    it('throws BadRequestException when order is not completed', async () => {
      databaseService.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: '10', userId: '1', status: 'PENDING' }],
      });

      await expect(service.createReview(1, 'BW-X', 1, { rating: 5 })).rejects.toThrow(BadRequestException);
    });

    it('throws ConflictException when the item was already reviewed', async () => {
      databaseService.query
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: '10', userId: '1', status: 'COMPLETED' }] })
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: '1', productId: '5' }] })
        .mockRejectedValueOnce({ code: '23505' });

      await expect(service.createReview(1, 'BW-X', 1, { rating: 5 })).rejects.toThrow(ConflictException);
    });

    it('creates the review when all conditions are met', async () => {
      databaseService.query
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: '10', userId: '1', status: 'COMPLETED' }] })
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: '1', productId: '5' }] })
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 99 }] })
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 99, productId: 5, rating: 5, comment: null }] });

      const result = await service.createReview(1, 'BW-X', 1, { rating: 5 });

      expect(result).toMatchObject({ review: { id: 99, productId: 5, rating: 5 } });
    });
  });
});
