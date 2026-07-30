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

    it('queries only available products for the public catalog', async () => {
      databaseService.query.mockResolvedValue({ rowCount: 1, rows: [{ id: 1, title: 'Latte' }] });

      await service.getProductById(1, true);

      expect(databaseService.query).toHaveBeenCalledWith(
        expect.stringContaining('id = $1 AND is_available = TRUE'),
        [1],
      );
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
        ['coffee', 'Espresso', null, 150],
      );
    });
  });

  describe('searchProducts', () => {
    it('does not constrain availability when an admin lists all products', async () => {
      databaseService.query
        .mockResolvedValueOnce({ rowCount: 2, rows: [{ id: 1, isAvailable: true }, { id: 2, isAvailable: false }] })
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ count: '2' }] });

      const result = await service.searchProducts({}, false);

      expect(result).toMatchObject({ total: 2 });
      expect(databaseService.query).toHaveBeenNthCalledWith(
        1,
        expect.not.stringContaining('is_available = TRUE'),
        [20, 0],
      );
    });

    it('filters products by requested availability for an admin', async () => {
      databaseService.query
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 2, isAvailable: false }] })
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ count: '1' }] });

      await service.searchProducts({ available: false }, false);

      expect(databaseService.query).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('WHERE is_available = $1'),
        [false, 20, 0],
      );
    });

    it('filters products by category', async () => {
      databaseService.query
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 1, category: 'coffee' }] })
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ count: '1' }] });

      const result = await service.searchProducts({ category: ProductCategory.coffee }, true);

      expect(result).toMatchObject({ items: [{ id: 1, category: 'coffee' }], total: 1 });
      expect(databaseService.query).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('is_available = TRUE AND category = $1'),
        ['coffee', 20, 0],
      );
    });

    it('rejects an invalid price range before querying', async () => {
      await expect(service.searchProducts({ minPrice: 200, maxPrice: 100 }, false)).rejects.toThrow(BadRequestException);

      expect(databaseService.query).not.toHaveBeenCalled();
    });
  });

  describe('deleteProduct', () => {
    it('hard-deletes the product and cleans up its image files', async () => {
      databaseService.query
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ file_id: 20 }] })
        .mockResolvedValueOnce({ rowCount: 1, rows: [] });

      await expect(service.deleteProduct(1)).resolves.toEqual({ message: 'Product deleted' });

      expect(databaseService.query).toHaveBeenNthCalledWith(
        2,
        'DELETE FROM products WHERE id = $1',
        [1],
      );
      expect(filesService.deleteFile).toHaveBeenCalledWith(20);
    });

    it('returns not found without attempting file cleanup when the product is absent', async () => {
      databaseService.query
        .mockResolvedValueOnce({ rowCount: 0, rows: [] })
        .mockResolvedValueOnce({ rowCount: 0, rows: [] });

      await expect(service.deleteProduct(1)).rejects.toThrow(NotFoundException);

      expect(filesService.deleteFile).not.toHaveBeenCalled();
    });
  });

  describe('updateAvailability', () => {
    it('returns the product after making it unavailable so an admin can re-enable it', async () => {
      databaseService.query
        .mockResolvedValueOnce({ rowCount: 1, rows: [] })
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 1, isAvailable: false }] });

      await expect(service.updateAvailability(1, { isAvailable: false })).resolves.toMatchObject({
        product: { id: 1, isAvailable: false },
      });

      expect(databaseService.query).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('FROM products WHERE id = $1'),
        [1],
      );
    });
  });

  describe('addImage', () => {
    it('appends a new image and preserves the existing primary image', async () => {
      databaseService.query
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 1 }] })
        .mockResolvedValueOnce({ rowCount: 1, rows: [] })
        .mockResolvedValueOnce({ rowCount: 1, rows: [] })
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 1, imageUrl: 'https://new' }] });
      filesService.uploadImage.mockResolvedValue({ fileId: 20, url: 'https://new' });

      const file = { originalname: 'a.jpg', mimetype: 'image/jpeg', size: 10, buffer: Buffer.from('x') };
      await service.addImage(1, file);

      expect(databaseService.query).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('INSERT INTO product_images'),
        [1, 20],
      );
      expect(databaseService.query).toHaveBeenNthCalledWith(
        3,
        expect.stringContaining('image_file_id = COALESCE'),
        [20, 'https://new', 1],
      );
      expect(filesService.deleteFile).not.toHaveBeenCalled();
    });

    it('rolls back the new upload if attaching it fails', async () => {
      databaseService.query
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 1 }] })
        .mockRejectedValueOnce(new Error('db error'));
      filesService.uploadImage.mockResolvedValue({ fileId: 20, url: 'https://new' });

      const file = { originalname: 'a.jpg', mimetype: 'image/jpeg', size: 10, buffer: Buffer.from('x') };
      await expect(service.addImage(1, file)).rejects.toThrow('db error');

      expect(filesService.deleteFile).toHaveBeenCalledWith(20);
    });
  });

  describe('removeImage', () => {
    it('throws NotFoundException when the selected image does not exist', async () => {
      databaseService.query
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 1 }] })
        .mockResolvedValueOnce({ rowCount: 0, rows: [] });

      await expect(service.removeImage(1, 20)).rejects.toThrow(NotFoundException);
    });

    it('removes a selected image and keeps the next image as the primary image', async () => {
      databaseService.query
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 1 }] })
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ file_id: 20 }] })
        .mockResolvedValueOnce({ rowCount: 1, rows: [] })
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ file_id: 21, url: 'https://next' }] })
        .mockResolvedValueOnce({ rowCount: 1, rows: [] })
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 1, imageUrl: 'https://next' }] });

      await service.removeImage(1, 20);

      expect(databaseService.query).toHaveBeenNthCalledWith(
        3,
        expect.stringContaining('DELETE FROM product_images'),
        [1, 20],
      );
      expect(databaseService.query).toHaveBeenNthCalledWith(
        5,
        expect.stringContaining('UPDATE products SET image_file_id'),
        [21, 'https://next', 1],
      );
      expect(filesService.deleteFile).toHaveBeenCalledWith(20);
    });

    it('throws NotFoundException when a selected image does not belong to the product', async () => {
      databaseService.query
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 1 }] })
        .mockResolvedValueOnce({ rowCount: 0, rows: [] });

      await expect(service.removeImage(1, 99)).rejects.toThrow(NotFoundException);
    });

    it('clears the primary image when the selected final image is removed', async () => {
      databaseService.query
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 1 }] })
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ file_id: 20 }] })
        .mockResolvedValueOnce({ rowCount: 1, rows: [] })
        .mockResolvedValueOnce({ rowCount: 0, rows: [] })
        .mockResolvedValueOnce({ rowCount: 1, rows: [] })
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 1, imageUrl: null, images: [] }] });

      await service.removeImage(1, 20);

      expect(databaseService.query).toHaveBeenNthCalledWith(
        5,
        expect.stringContaining('UPDATE products SET image_file_id'),
        [null, null, 1],
      );
      expect(filesService.deleteFile).toHaveBeenCalledWith(20);
    });
  });
});
