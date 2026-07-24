import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { FilesService } from '../files/files.service';
import { escapeLike } from '../common/helpers/db.helpers';
import { resolveOffsetPagination } from '../common/helpers/pagination.helpers';
import { DEFAULT_PAGE_SIZE } from '../common/constants';
import { CreateProductDto } from './dto/create-product.dto';
import { SearchProductsDto } from './dto/search-products.dto';
import { UpdateAvailabilityDto } from './dto/update-availability.dto';
import { UpdateProductDto } from './dto/update-product.dto';

const PRODUCT_COLUMNS = `id, category, title, description, details, price, quantity, image_url AS "imageUrl",
  COALESCE((
    SELECT json_agg(json_build_object('fileId', pi.file_id, 'url', f.url) ORDER BY pi.id)
    FROM product_images pi
    INNER JOIN files f ON f.id = pi.file_id
    WHERE pi.product_id = products.id
  ), '[]'::json) AS images,
  is_available AS "isAvailable", is_active AS "isActive",
  created_at::text AS "createdAt", updated_at::text AS "updatedAt"`;

@Injectable()
export class ProductsService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly filesService: FilesService,
  ) {}

  async searchProducts(dto: SearchProductsDto, includeInactive: boolean): Promise<Record<string, unknown>> {
    if (dto.minPrice !== undefined && dto.maxPrice !== undefined && dto.minPrice > dto.maxPrice) {
      throw new BadRequestException('minPrice cannot be greater than maxPrice');
    }

    const clauses: string[] = [];
    const params: unknown[] = [];

    if (!includeInactive) {
      clauses.push('is_active = TRUE');
    }
    if (dto.available !== undefined) {
      params.push(dto.available);
      clauses.push(`is_available = $${params.length}`);
    }
    if (dto.category !== undefined) {
      params.push(dto.category);
      clauses.push(`category = $${params.length}`);
    }
    if (dto.minPrice !== undefined) {
      params.push(dto.minPrice);
      clauses.push(`price >= $${params.length}`);
    }
    if (dto.maxPrice !== undefined) {
      params.push(dto.maxPrice);
      clauses.push(`price <= $${params.length}`);
    }
    if (dto.search) {
      params.push(`%${escapeLike(dto.search)}%`);
      clauses.push(`(title ILIKE $${params.length} ESCAPE '\\' OR description ILIKE $${params.length} ESCAPE '\\')`);
    }

    const whereClause = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const { limit, offset } = resolveOffsetPagination(dto, { defaultLimit: DEFAULT_PAGE_SIZE, maxLimit: 100 });
    const sortClause = this.resolveSort(dto.sort);

    const items = await this.databaseService.query(
      `SELECT ${PRODUCT_COLUMNS} FROM products ${whereClause}
       ORDER BY ${sortClause}, id DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset],
    );

    const total = await this.databaseService.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM products ${whereClause}`,
      params,
    );

    return { items: items.rows, total: Number(total.rows[0].count) };
  }

  async getProductById(productId: number, includeInactive: boolean): Promise<Record<string, unknown>> {
    const product = await this.fetchProduct(productId, includeInactive);
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    return { product };
  }

  async createProduct(dto: CreateProductDto): Promise<Record<string, unknown>> {
    const insert = await this.databaseService.query<{ id: number }>(
      `INSERT INTO products (category, title, description, details, price, quantity)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [dto.category, dto.title, dto.description ?? null, dto.details ?? null, dto.price, dto.quantity ?? null],
    );

    return { product: await this.fetchProduct(insert.rows[0].id, true) };
  }

  async updateProduct(productId: number, dto: UpdateProductDto): Promise<Record<string, unknown>> {
    await this.assertProductExists(productId);

    await this.databaseService.query(
      `UPDATE products
       SET category = COALESCE($1, category),
           title = COALESCE($2, title),
           description = COALESCE($3, description),
           details = COALESCE($4, details),
           price = COALESCE($5, price),
           quantity = COALESCE($6, quantity),
           updated_at = NOW()
       WHERE id = $7`,
      [dto.category ?? null, dto.title ?? null, dto.description ?? null, dto.details ?? null, dto.price ?? null, dto.quantity ?? null, productId],
    );

    return { product: await this.fetchProduct(productId, true) };
  }

  async updateAvailability(productId: number, dto: UpdateAvailabilityDto): Promise<Record<string, unknown>> {
    const result = await this.databaseService.query(
      'UPDATE products SET is_available = $1, updated_at = NOW() WHERE id = $2',
      [dto.isAvailable, productId],
    );
    if (!result.rowCount) {
      throw new NotFoundException('Product not found');
    }
    return { product: await this.fetchProduct(productId, true) };
  }

  /** Soft delete: deactivate rather than physically remove, so historical order items stay intact. */
  async deleteProduct(productId: number): Promise<Record<string, unknown>> {
    const result = await this.databaseService.query(
      'UPDATE products SET is_active = FALSE, is_available = FALSE, updated_at = NOW() WHERE id = $1',
      [productId],
    );
    if (!result.rowCount) {
      throw new NotFoundException('Product not found');
    }
    return { message: 'Product deactivated' };
  }

  async addImage(
    productId: number,
    file: { originalname: string; mimetype: string; size: number; buffer: Buffer },
  ): Promise<Record<string, unknown>> {
    await this.assertProductExists(productId);

    const uploaded = await this.filesService.uploadImage(file, 'bw-cafe/products');

    try {
      await this.databaseService.query(
        'INSERT INTO product_images (product_id, file_id) VALUES ($1, $2)',
        [productId, uploaded.fileId],
      );
      await this.databaseService.query(
        `UPDATE products
         SET image_file_id = COALESCE(image_file_id, $1),
             image_url = CASE WHEN image_file_id IS NULL THEN $2 ELSE image_url END,
             updated_at = NOW()
         WHERE id = $3`,
        [uploaded.fileId, uploaded.url, productId],
      );
    } catch (error) {
      await this.filesService.deleteFile(uploaded.fileId);
      throw error;
    }

    return { product: await this.fetchProduct(productId, true) };
  }

  async removeImage(productId: number, fileId: number): Promise<Record<string, unknown>> {
    await this.assertProductExists(productId);

    const image = await this.databaseService.query<{ file_id: number }>(
      'SELECT file_id FROM product_images WHERE product_id = $1 AND file_id = $2',
      [productId, fileId],
    );
    if (!image.rowCount) {
      throw new NotFoundException('Product image not found');
    }

    const previousFileId = image.rows[0].file_id;
    await this.databaseService.query(
      'DELETE FROM product_images WHERE product_id = $1 AND file_id = $2',
      [productId, previousFileId],
    );

    const nextImage = await this.databaseService.query<{ file_id: number; url: string }>(
      `SELECT pi.file_id, f.url
       FROM product_images pi
       INNER JOIN files f ON f.id = pi.file_id
       WHERE pi.product_id = $1
       ORDER BY pi.id
       LIMIT 1`,
      [productId],
    );
    await this.databaseService.query(
      'UPDATE products SET image_file_id = $1, image_url = $2, updated_at = NOW() WHERE id = $3',
      [nextImage.rows[0]?.file_id ?? null, nextImage.rows[0]?.url ?? null, productId],
    );
    await this.filesService.deleteFile(previousFileId);

    return { product: await this.fetchProduct(productId, true) };
  }

  private async assertProductExists(productId: number): Promise<void> {
    const result = await this.databaseService.query('SELECT id FROM products WHERE id = $1', [productId]);
    if (!result.rowCount) {
      throw new NotFoundException('Product not found');
    }
  }

  private async fetchProduct(productId: number, includeInactive: boolean): Promise<Record<string, unknown> | null> {
    const whereClause = includeInactive ? 'id = $1' : 'id = $1 AND is_active = TRUE';
    const result = await this.databaseService.query(`SELECT ${PRODUCT_COLUMNS} FROM products WHERE ${whereClause}`, [
      productId,
    ]);
    return result.rowCount ? result.rows[0] : null;
  }

  private resolveSort(sort: SearchProductsDto['sort']): string {
    switch (sort) {
      case 'price_asc':
        return 'price ASC';
      case 'price_desc':
        return 'price DESC';
      default:
        return 'created_at DESC';
    }
  }
}
