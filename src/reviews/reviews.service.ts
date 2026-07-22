import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { resolveOffsetPagination } from '../common/helpers/pagination.helpers';
import { DEFAULT_PAGE_SIZE } from '../common/constants';
import { CreateReviewDto } from './dto/create-review.dto';
import { OffsetPaginationQuery } from '../common/dto/offset-pagination-query.dto';

const REVIEW_COLUMNS = `id, product_id AS "productId", rating, comment, created_at::text AS "createdAt"`;

@Injectable()
export class ReviewsService {
  constructor(private readonly databaseService: DatabaseService) {}

  private normalizeNullableInt(value: unknown): number | null {
    if (value === null || value === undefined) {
      return null;
    }
    if (typeof value === 'number') {
      return Number.isInteger(value) ? value : null;
    }
    if (typeof value === 'string' && value.trim().length > 0) {
      const parsed = Number(value);
      return Number.isInteger(parsed) ? parsed : null;
    }
    return null;
  }

  async createReview(
    userId: number,
    orderNumber: string,
    orderItemId: number,
    dto: CreateReviewDto,
  ): Promise<Record<string, unknown>> {
    const order = await this.databaseService.query<{ id: number; userId: number | null; status: string }>(
      'SELECT id, user_id AS "userId", status FROM orders WHERE order_number = $1',
      [orderNumber],
    );
    if (!order.rowCount) {
      throw new NotFoundException('Order not found');
    }
    const normalizedOrderId = this.normalizeNullableInt(order.rows[0].id);
    const normalizedOrderUserId = this.normalizeNullableInt(order.rows[0].userId);
    if (normalizedOrderId === null) {
      throw new NotFoundException('Order not found');
    }
    if (normalizedOrderUserId !== userId) {
      throw new ForbiddenException('Not allowed to review this order');
    }
    if (order.rows[0].status !== 'COMPLETED') {
      throw new BadRequestException('Only completed orders can be reviewed');
    }

    const item = await this.databaseService.query<{ id: number; productId: number | null }>(
      'SELECT id, product_id AS "productId" FROM order_items WHERE id = $1 AND order_id = $2',
      [orderItemId, normalizedOrderId],
    );
    const normalizedProductId = item.rowCount ? this.normalizeNullableInt(item.rows[0].productId) : null;
    if (!item.rowCount || normalizedProductId === null) {
      throw new NotFoundException('Order item not found');
    }

    try {
      const insert = await this.databaseService.query<{ id: number }>(
        `INSERT INTO reviews (user_id, product_id, order_item_id, rating, comment)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        [userId, normalizedProductId, orderItemId, dto.rating, dto.comment ?? null],
      );

      const review = await this.databaseService.query(`SELECT ${REVIEW_COLUMNS} FROM reviews WHERE id = $1`, [
        insert.rows[0].id,
      ]);
      return { review: review.rows[0] };
    } catch (error) {
      if ((error as { code?: string } | null)?.code === '23505') {
        throw new ConflictException('This order item has already been reviewed');
      }
      throw error;
    }
  }

  async listProductReviews(productId: number, query: OffsetPaginationQuery): Promise<Record<string, unknown>> {
    const { limit, offset } = resolveOffsetPagination(query, { defaultLimit: DEFAULT_PAGE_SIZE, maxLimit: 100 });

    const items = await this.databaseService.query(
      `SELECT ${REVIEW_COLUMNS} FROM reviews WHERE product_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
      [productId, limit, offset],
    );
    const total = await this.databaseService.query<{ count: string }>(
      'SELECT COUNT(*)::text AS count FROM reviews WHERE product_id = $1',
      [productId],
    );

    return { items: items.rows, total: Number(total.rows[0].count) };
  }
}
