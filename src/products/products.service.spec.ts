import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ProductCategory } from './product-category.enum';
import { ProductsService } from './products.service';

describe('ProductsService', () => {
  const databaseService = {
    query: jest.fn(),
  };

  const filesService = {
    uploadImage: jest.fn(),
    deleteFile: jest.fn(),
  };

  const service = new ProductsService(databaseService as any, filesService as any);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getProductById', () => {
    it('throws NotFoundException when missing', async () => {
      databaseService.query.mockResolvedValue({ rowCount: 0, rows: [] });

      await expect(service.getProductById(1, false)).rejects.toThrow(NotFoundException);
    });

    it('returns the product when found', async () => {
      databaseService.query.mockResolvedValue({ rowCount: 1, rows: [{ id: 1, title: 'Latte' }] });

      const result = await service.getProductById(1, false);

      expect(result).toMatchObject({ product: { id: 1, title: 'Latte' } });
    });
  });

  describe('createProduct', () => {
    it('inserts and returns the created product', async () => {
      databaseService.query
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 5 }] })
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 5, title: 'Espresso' }] });

      const result = await service.createProduct({ category: ProductCategory.coffee, title: 'Espresso', price: 150 });

      expect(result).toMatchObject({ product: { id: 5, title: 'Espresso' } });
      expect(databaseService.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO products (category, title'),
        ['coffee', 'Espresso', null, null, 150, null],
      );
    });
  });

  describe('searchProducts', () => {
    it('filters products by category', async () => {
      databaseService.query
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 1, category: 'coffee' }] })
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ count: '1' }] });

      const result = await service.searchProducts({ category: ProductCategory.coffee }, false);

      expect(result).toMatchObject({ items: [{ id: 1, category: 'coffee' }], total: 1 });
      expect(databaseService.query).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('category = $1'),
        ['coffee', 20, 0],
      );
    });
  });

  describe('replaceImage', () => {
    it('deletes the old file after the new one is attached', async () => {
      databaseService.query
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ image_file_id: 10 }] })
        .mockResolvedValueOnce({ rowCount: 1, rows: [] })
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 1, imageUrl: 'https://new' }] });
      filesService.uploadImage.mockResolvedValue({ fileId: 20, url: 'https://new' });

      const file = { originalname: 'a.jpg', mimetype: 'image/jpeg', size: 10, buffer: Buffer.from('x') };
      await service.replaceImage(1, file);

      expect(filesService.deleteFile).toHaveBeenCalledWith(10);
    });

    it('rolls back the new upload if attaching it fails', async () => {
      databaseService.query
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ image_file_id: null }] })
        .mockRejectedValueOnce(new Error('db error'));
      filesService.uploadImage.mockResolvedValue({ fileId: 20, url: 'https://new' });

      const file = { originalname: 'a.jpg', mimetype: 'image/jpeg', size: 10, buffer: Buffer.from('x') };
      await expect(service.replaceImage(1, file)).rejects.toThrow('db error');

      expect(filesService.deleteFile).toHaveBeenCalledWith(20);
    });
  });

  describe('removeImage', () => {
    it('throws BadRequestException when product has no image', async () => {
      databaseService.query.mockResolvedValueOnce({ rowCount: 1, rows: [{ image_file_id: null }] });

      await expect(service.removeImage(1)).rejects.toThrow(BadRequestException);
    });
  });
});
