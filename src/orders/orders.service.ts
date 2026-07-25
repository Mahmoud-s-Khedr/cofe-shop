import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PoolClient, QueryResult, QueryResultRow } from 'pg';
import { DatabaseService } from '../database/database.service';
import { FilesService } from '../files/files.service';
import { AuthUser } from '../common/types/auth-user.type';
import { resolveOffsetPagination } from '../common/helpers/pagination.helpers';
import { DEFAULT_PAGE_SIZE } from '../common/constants';
import { CreateOrderDto } from './dto/create-order.dto';
import { CancelOrderDto } from './dto/cancel-order.dto';
import { ListMyOrdersQueryDto } from './dto/list-my-orders-query.dto';
import { generateOrderNumber } from './order-number.util';
import { generateGuestAccessToken, hashGuestAccessToken } from './guest-token.util';
import { assertValidAdminTransition, OrderStatus } from './order-status.util';

const ORDER_COLUMNS = `id, order_number AS "orderNumber", user_id AS "userId", customer_name AS "customerName",
  customer_phone AS "customerPhone", order_type AS "orderType", address, pickup_time::text AS "pickupTime",
  status, screenshot_url AS "screenshotUrl", screenshot_file_id AS "screenshotFileId",
  subtotal, delivery_fee AS "deliveryFee", total, currency, customer_notes AS "customerNotes",
  cancellation_reason AS "cancellationReason", rejection_reason AS "rejectionReason",
  guest_access_token_hash AS "guestAccessTokenHash",
  created_at::text AS "createdAt", updated_at::text AS "updatedAt"`;

type QueryRunner = {
  query: <T extends QueryResultRow = QueryResultRow>(text: string, values?: unknown[]) => Promise<QueryResult<T>>;
};

export type OrderAuthContext = { userId?: number; guestToken?: string };

export type AdminListOrdersFilter = {
  status?: string;
  orderType?: string;
  orderNumber?: string;
  customerPhone?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
};

type DbInt = number | string;

@Injectable()
export class OrdersService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly filesService: FilesService,
  ) {}

  async createOrder(user: AuthUser | null, dto: CreateOrderDto): Promise<Record<string, unknown>> {
    if (dto.orderType === 'DELIVERY' && !dto.address) {
      throw new BadRequestException('address is required for delivery orders');
    }
    if (dto.orderType === 'PICKUP' && !dto.pickupTime) {
      throw new BadRequestException('pickupTime is required for pickup orders');
    }

    return this.databaseService.withTransaction(async (client) => {
      const productIds = [...new Set(dto.items.map((item) => item.productId))];
      const products = await client.query<{
        id: number;
        category: string;
        title: string;
        description: string | null;
        details: string | null;
        imageUrl: string | null;
        price: string;
        quantity: number | null;
        is_active: boolean;
        is_available: boolean;
      }>(
        `SELECT id, category::text, title, description, details, image_url AS "imageUrl", price, quantity, is_active, is_available
         FROM products WHERE id = ANY($1::bigint[]) FOR UPDATE`,
        [productIds],
      );

      const productImages = await client.query<{ productId: number; fileId: number; url: string }>(
        `SELECT pi.product_id AS "productId", pi.file_id AS "fileId", f.url
         FROM product_images pi
         INNER JOIN files f ON f.id = pi.file_id
         WHERE pi.product_id = ANY($1::bigint[])
         ORDER BY pi.product_id, pi.id`,
        [productIds],
      );
      const imagesByProductId = new Map<number, Array<{ fileId: number; url: string }>>();
      for (const image of productImages.rows) {
        const images = imagesByProductId.get(Number(image.productId)) ?? [];
        images.push({ fileId: Number(image.fileId), url: image.url });
        imagesByProductId.set(Number(image.productId), images);
      }

      const productMap = new Map(products.rows.map((row) => [Number(row.id), row]));

      let subtotal = 0;
      const lineItems: Array<{
        productId: number;
        category: string;
        title: string;
        description: string | null;
        details: string | null;
        imageUrl: string | null;
        images: Array<{ fileId: number; url: string }>;
        unitPrice: number;
        quantity: number;
        lineTotal: number;
      }> = [];

      for (const item of dto.items) {
        const product = productMap.get(item.productId);
        if (!product) {
          throw new BadRequestException(`Product ${item.productId} does not exist`);
        }
        if (!product.is_active || !product.is_available) {
          throw new BadRequestException(`Product ${product.title} is not available`);
        }
        if (product.quantity !== null && item.quantity > product.quantity) {
          throw new BadRequestException(`Insufficient stock for ${product.title}`);
        }

        const unitPrice = Number(product.price);
        const lineTotal = unitPrice * item.quantity;
        const images = imagesByProductId.get(Number(product.id)) ?? [];
        subtotal += lineTotal;
        lineItems.push({
          productId: product.id,
          category: product.category,
          title: product.title,
          description: product.description,
          details: product.details,
          imageUrl: product.imageUrl ?? images[0]?.url ?? null,
          images,
          unitPrice,
          quantity: item.quantity,
          lineTotal,
        });
      }

      const deliveryFee = 0;
      const total = subtotal + deliveryFee;

      const guestAccessToken = user ? null : generateGuestAccessToken();
      const guestAccessTokenHash = guestAccessToken ? hashGuestAccessToken(guestAccessToken) : null;

      const orderId = await this.insertOrderWithUniqueNumber(client, {
        userId: user?.sub ?? null,
        customerName: dto.customerName,
        customerPhone: dto.customerPhone,
        orderType: dto.orderType,
        address: dto.orderType === 'DELIVERY' ? dto.address! : null,
        pickupTime: dto.orderType === 'PICKUP' ? dto.pickupTime! : null,
        subtotal,
        deliveryFee,
        total,
        customerNotes: dto.customerNotes ?? null,
        guestAccessTokenHash,
      });

      for (const item of lineItems) {
        const insertedItem = await client.query<{ id: number }>(
          `INSERT INTO order_items (
             order_id, product_id, product_title, product_category, product_description, product_details, image_url,
             unit_price, quantity, line_total
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
           RETURNING id`,
          [
            orderId.id,
            item.productId,
            item.title,
            item.category,
            item.description,
            item.details,
            item.imageUrl,
            item.unitPrice,
            item.quantity,
            item.lineTotal,
          ],
        );

        for (const [position, image] of item.images.entries()) {
          await client.query(
            `INSERT INTO order_item_images (order_item_id, file_id, url, position)
             VALUES ($1, $2, $3, $4)`,
            [insertedItem.rows[0].id, image.fileId, image.url, position],
          );
        }

        await client.query(
          `UPDATE products SET quantity = quantity - $1, updated_at = NOW()
           WHERE id = $2 AND quantity IS NOT NULL`,
          [item.quantity, item.productId],
        );
      }

      await client.query(
        `INSERT INTO order_status_history (order_id, previous_status, new_status, changed_by_user_id)
         VALUES ($1, NULL, 'PENDING', $2)`,
        [orderId.id, user?.sub ?? null],
      );

      const order = await this.fetchOrder(client, orderId.orderNumber);
      return { order: this.stripInternal({ ...order, ...(guestAccessToken ? { guestAccessToken } : {}) }) };
    });
  }

  async getOrderForRequester(orderNumber: string, auth: OrderAuthContext): Promise<Record<string, unknown>> {
    const order = await this.fetchOrder(this.databaseService, orderNumber);
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    this.assertRequesterCanAccess(order, auth);
    return { order: this.stripInternal(order) };
  }

  async uploadScreenshot(
    orderNumber: string,
    auth: OrderAuthContext,
    file: { originalname: string; mimetype: string; size: number; buffer: Buffer },
  ): Promise<Record<string, unknown>> {
    const order = await this.fetchOrder(this.databaseService, orderNumber);
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    this.assertRequesterCanAccess(order, auth);
    if (order.status !== 'PENDING') {
      throw new BadRequestException('Screenshot can only be uploaded while the order is pending');
    }

    const uploaded = await this.filesService.uploadImage(file, 'bw-cafe/orders');

    try {
      await this.databaseService.query(
        'UPDATE orders SET screenshot_file_id = $1, screenshot_url = $2, updated_at = NOW() WHERE id = $3',
        [uploaded.fileId, uploaded.url, order.id],
      );
    } catch (error) {
      await this.filesService.deleteFile(uploaded.fileId);
      throw error;
    }

    if (order.screenshotFileId) {
      await this.filesService.deleteFile(order.screenshotFileId as number);
    }

    return { order: this.stripInternal((await this.fetchOrder(this.databaseService, orderNumber))!) };
  }

  async cancelOrder(orderNumber: string, auth: OrderAuthContext, dto: CancelOrderDto): Promise<Record<string, unknown>> {
    return this.databaseService.withTransaction(async (client) => {
      const order = await this.fetchOrder(client, orderNumber, true);
      if (!order) {
        throw new NotFoundException('Order not found');
      }
      this.assertRequesterCanAccess(order, auth);

      const status = order.status as OrderStatus;
      if (status !== 'PENDING' && status !== 'CONFIRMED') {
        throw new BadRequestException(`Order cannot be cancelled while ${status}`);
      }

      await client.query(
        `UPDATE orders
         SET status = 'CANCELLED', cancellation_reason = $1, cancelled_at = NOW(), updated_at = NOW()
         WHERE id = $2`,
        [dto.reason ?? null, order.id],
      );
      await client.query(
        `INSERT INTO order_status_history (order_id, previous_status, new_status, changed_by_user_id, note)
         VALUES ($1, $2, 'CANCELLED', $3, $4)`,
        [order.id, status, auth.userId ?? null, dto.reason ?? null],
      );

      return { order: this.stripInternal((await this.fetchOrder(client, orderNumber))!) };
    });
  }

  async listMyOrders(userId: number, query: ListMyOrdersQueryDto): Promise<Record<string, unknown>> {
    const { limit, offset } = resolveOffsetPagination(query, { defaultLimit: DEFAULT_PAGE_SIZE, maxLimit: 100 });

    const items = await this.databaseService.query(
      `SELECT ${ORDER_COLUMNS} FROM orders WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
      [userId, limit, offset],
    );
    const total = await this.databaseService.query<{ count: string }>(
      'SELECT COUNT(*)::text AS count FROM orders WHERE user_id = $1',
      [userId],
    );

    return { items: (await this.hydrateOrders(this.databaseService, items.rows)).map((row) => this.stripInternal(row)), total: Number(total.rows[0].count) };
  }

  async getMyOrder(userId: number, orderNumber: string): Promise<Record<string, unknown>> {
    const order = await this.fetchOrder(this.databaseService, orderNumber);
    if (!order || order.userId !== userId) {
      throw new NotFoundException('Order not found');
    }
    return { order: this.stripInternal(order) };
  }

  async adminListOrders(filter: AdminListOrdersFilter): Promise<Record<string, unknown>> {
    if (filter.fromDate && filter.toDate && filter.fromDate > filter.toDate) {
      throw new BadRequestException('fromDate cannot be later than toDate');
    }

    const clauses: string[] = [];
    const params: unknown[] = [];

    if (filter.status) {
      params.push(filter.status);
      clauses.push(`status = $${params.length}`);
    }
    if (filter.orderType) {
      params.push(filter.orderType);
      clauses.push(`order_type = $${params.length}`);
    }
    if (filter.orderNumber) {
      params.push(filter.orderNumber);
      clauses.push(`order_number = $${params.length}`);
    }
    if (filter.customerPhone) {
      params.push(filter.customerPhone);
      clauses.push(`customer_phone = $${params.length}`);
    }
    if (filter.fromDate) {
      params.push(filter.fromDate);
      clauses.push(`created_at >= $${params.length}::date`);
    }
    if (filter.toDate) {
      params.push(filter.toDate);
      clauses.push(`created_at < ($${params.length}::date + INTERVAL '1 day')`);
    }

    const whereClause = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const { limit, offset } = resolveOffsetPagination(filter, { defaultLimit: DEFAULT_PAGE_SIZE, maxLimit: 100 });

    const items = await this.databaseService.query(
      `SELECT ${ORDER_COLUMNS} FROM orders ${whereClause}
       ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset],
    );
    const total = await this.databaseService.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM orders ${whereClause}`,
      params,
    );

    return { items: (await this.hydrateOrders(this.databaseService, items.rows)).map((row) => this.stripInternal(row)), total: Number(total.rows[0].count) };
  }

  async adminGetOrder(orderNumber: string): Promise<Record<string, unknown>> {
    const order = await this.fetchOrder(this.databaseService, orderNumber);
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    return { order: this.stripInternal(order) };
  }

  async adminTransitionStatus(
    orderNumber: string,
    adminUserId: number,
    next: OrderStatus,
    opts: { reason?: string; note?: string },
  ): Promise<Record<string, unknown>> {
    return this.databaseService.withTransaction(async (client) => {
      const order = await this.fetchOrder(client, orderNumber, true);
      if (!order) {
        throw new NotFoundException('Order not found');
      }

      const current = order.status as OrderStatus;
      assertValidAdminTransition(
        current,
        next,
        order.orderType as 'DELIVERY' | 'PICKUP',
        Boolean(order.screenshotFileId),
        Boolean(opts.reason),
      );

      const timestampColumn = this.timestampColumnFor(next);
      const setClauses = [
        'status = $1',
        'updated_at = NOW()',
        ...(timestampColumn ? [`${timestampColumn} = NOW()`] : []),
        ...(next === 'REJECTED' ? ['rejection_reason = $2'] : []),
        ...(next === 'CANCELLED' ? ['cancellation_reason = $2'] : []),
      ];
      const reasonParam = next === 'REJECTED' || next === 'CANCELLED' ? (opts.reason ?? null) : null;
      const params = setClauses.includes('rejection_reason = $2') || setClauses.includes('cancellation_reason = $2')
        ? [next, reasonParam, order.id]
        : [next, order.id];
      const whereIdIndex = params.length;

      await client.query(`UPDATE orders SET ${setClauses.join(', ')} WHERE id = $${whereIdIndex}`, params);

      await client.query(
        `INSERT INTO order_status_history (order_id, previous_status, new_status, changed_by_user_id, note)
         VALUES ($1, $2, $3, $4, $5)`,
        [order.id, current, next, adminUserId, opts.note ?? opts.reason ?? null],
      );

      return { order: this.stripInternal((await this.fetchOrder(client, orderNumber))!) };
    });
  }

  private timestampColumnFor(status: OrderStatus): string | null {
    switch (status) {
      case 'CONFIRMED':
        return 'confirmed_at';
      case 'COMPLETED':
        return 'completed_at';
      case 'CANCELLED':
        return 'cancelled_at';
      case 'REJECTED':
        return 'rejected_at';
      default:
        return null;
    }
  }

  private assertRequesterCanAccess(order: Record<string, unknown>, auth: OrderAuthContext): void {
    if (order.userId !== null && order.userId !== undefined) {
      if (auth.userId !== order.userId) {
        throw new ForbiddenException('Not allowed to access this order');
      }
      return;
    }

    if (!auth.guestToken || hashGuestAccessToken(auth.guestToken) !== order.guestAccessTokenHash) {
      throw new ForbiddenException('Not allowed to access this order');
    }
  }

  private stripInternal(row: Record<string, unknown>): Record<string, unknown> {
    const rest = { ...row };
    delete rest.guestAccessTokenHash;
    delete rest.screenshotFileId;
    return rest;
  }

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

  private async insertOrderWithUniqueNumber(
    client: PoolClient,
    values: {
      userId: number | null;
      customerName: string;
      customerPhone: string;
      orderType: 'DELIVERY' | 'PICKUP';
      address: string | null;
      pickupTime: string | null;
      subtotal: number;
      deliveryFee: number;
      total: number;
      customerNotes: string | null;
      guestAccessTokenHash: string | null;
    },
  ): Promise<{ id: number; orderNumber: string }> {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const orderNumber = generateOrderNumber();
      try {
        const insert = await client.query<{ id: number }>(
          `INSERT INTO orders (
             order_number, user_id, customer_name, customer_phone, order_type, address, pickup_time,
             subtotal, delivery_fee, total, customer_notes, guest_access_token_hash
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
           RETURNING id`,
          [
            orderNumber,
            values.userId,
            values.customerName,
            values.customerPhone,
            values.orderType,
            values.address,
            values.pickupTime,
            values.subtotal,
            values.deliveryFee,
            values.total,
            values.customerNotes,
            values.guestAccessTokenHash,
          ],
        );
        return { id: insert.rows[0].id, orderNumber };
      } catch (error) {
        if (this.isUniqueViolation(error) && attempt < 4) {
          continue;
        }
        throw error;
      }
    }
    throw new BadRequestException('Failed to generate a unique order number');
  }

  private isUniqueViolation(error: unknown): boolean {
    return Boolean((error as { code?: string } | null)?.code === '23505');
  }

  private async fetchOrder(
    runner: QueryRunner,
    orderNumber: string,
    forUpdate = false,
  ): Promise<Record<string, unknown> | null> {
    const result = await runner.query(
      `SELECT ${ORDER_COLUMNS} FROM orders WHERE order_number = $1 ${forUpdate ? 'FOR UPDATE' : ''}`,
      [orderNumber],
    );
    if (!result.rowCount) {
      return null;
    }
    return (await this.hydrateOrders(runner, [result.rows[0] as Record<string, unknown>]))[0];
  }

  /** Attaches ordered product snapshots in bulk so paginated lists do not cause N+1 queries. */
  private async hydrateOrders(runner: QueryRunner, rows: Record<string, unknown>[]): Promise<Record<string, unknown>[]> {
    if (!rows.length) {
      return [];
    }

    const orders = rows.map((order) => ({
      ...order,
      id: this.normalizeNullableInt(order.id),
      userId: this.normalizeNullableInt(order.userId),
      screenshotFileId: this.normalizeNullableInt(order.screenshotFileId),
    }));
    const orderIds = orders.map((order) => order.id).filter((id): id is number => id !== null);
    const items = await runner.query<{
      id: DbInt;
      orderId: DbInt;
      productId: DbInt | null;
      productTitle: string;
      category: string | null;
      description: string | null;
      details: string | null;
      imageUrl: string | null;
      hasSnapshot: boolean;
      unitPrice: string;
      quantity: number;
      lineTotal: string;
    }>(
      `SELECT oi.id, oi.order_id AS "orderId", oi.product_id AS "productId", oi.product_title AS "productTitle",
              COALESCE(oi.product_category::text, p.category::text) AS category,
              COALESCE(oi.product_description, p.description) AS description,
              COALESCE(oi.product_details, p.details) AS details,
              COALESCE(oi.image_url, p.image_url) AS "imageUrl",
              oi.product_category IS NOT NULL AS "hasSnapshot",
              oi.unit_price AS "unitPrice", oi.quantity, oi.line_total AS "lineTotal"
       FROM order_items oi
       LEFT JOIN products p ON p.id = oi.product_id
       WHERE oi.order_id = ANY($1::bigint[])
       ORDER BY oi.order_id, oi.id`,
      [orderIds],
    );

    const itemRows = items.rows.map((item) => ({
      ...item,
      id: this.normalizeNullableInt((item as { id: DbInt }).id),
      orderId: this.normalizeNullableInt((item as { orderId: DbInt }).orderId),
      productId: this.normalizeNullableInt((item as { productId: DbInt | null }).productId),
      images: [] as Array<{ fileId: number; url: string }>,
    }));
    const itemIds = itemRows.map((item) => item.id).filter((id): id is number => id !== null);
    const snapshotImages = itemIds.length
      ? await runner.query<{ orderItemId: number; fileId: number; url: string }>(
          `SELECT order_item_id AS "orderItemId", file_id AS "fileId", url
           FROM order_item_images WHERE order_item_id = ANY($1::bigint[])
           ORDER BY order_item_id, position`,
          [itemIds],
        )
      : { rows: [] as Array<{ orderItemId: number; fileId: number; url: string }> };
    const imagesByItemId = new Map<number, Array<{ fileId: number; url: string }>>();
    for (const image of snapshotImages.rows) {
      const imageList = imagesByItemId.get(Number(image.orderItemId)) ?? [];
      imageList.push({ fileId: Number(image.fileId), url: image.url });
      imagesByItemId.set(Number(image.orderItemId), imageList);
    }

    const legacyProductIds = [...new Set(itemRows
      .filter((item) => !item.hasSnapshot && item.productId !== null)
      .map((item) => item.productId as number))];
    const legacyImages = legacyProductIds.length
      ? await runner.query<{ productId: number; fileId: number; url: string }>(
          `SELECT pi.product_id AS "productId", pi.file_id AS "fileId", f.url
           FROM product_images pi
           INNER JOIN files f ON f.id = pi.file_id
           WHERE pi.product_id = ANY($1::bigint[])
           ORDER BY pi.product_id, pi.id`,
          [legacyProductIds],
        )
      : { rows: [] as Array<{ productId: number; fileId: number; url: string }> };
    const imagesByLegacyProductId = new Map<number, Array<{ fileId: number; url: string }>>();
    for (const image of legacyImages.rows) {
      const imageList = imagesByLegacyProductId.get(Number(image.productId)) ?? [];
      imageList.push({ fileId: Number(image.fileId), url: image.url });
      imagesByLegacyProductId.set(Number(image.productId), imageList);
    }

    const itemsByOrderId = new Map<number, Record<string, unknown>[]>();
    for (const item of itemRows) {
      const { orderId, hasSnapshot, ...publicItem } = item;
      const hydratedItem = {
        ...publicItem,
        images: hasSnapshot
          ? imagesByItemId.get(item.id as number) ?? []
          : imagesByLegacyProductId.get(item.productId as number) ?? [],
      };
      const orderItems = itemsByOrderId.get(orderId as number) ?? [];
      orderItems.push(hydratedItem);
      itemsByOrderId.set(orderId as number, orderItems);
    }

    return orders.map((order) => ({ ...order, items: itemsByOrderId.get(order.id as number) ?? [] }));
  }
}
