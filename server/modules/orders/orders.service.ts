import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '../../database/database.module';
import { eq, and, desc, count, sql } from 'drizzle-orm';

import { orders, products } from '@server/database/schema';
import type { BuyResponse, OrderItem, OrderListResponse, ProductPublic } from '@shared/api.interface';

function extractPostgresErrorCode(error: unknown): string | undefined {
  let current: unknown = error;
  for (let depth = 0; depth < 4 && current && typeof current === 'object'; depth += 1) {
    const { code, cause } = current as { code?: unknown; cause?: unknown };
    if (typeof code === 'string') return code;
    current = cause;
  }
  return undefined;
}

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(@Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase) {}

  async buy(userId: string, productId: string): Promise<BuyResponse> {
    this.logger.log(`User ${userId} attempting to buy product ${productId}`);

    const productRows = await this.db
      .select({ id: products.id, status: products.status, price: products.price })
      .from(products)
      .where(eq(products.id, productId));

    if (productRows.length === 0) {
      throw new NotFoundException('商品不存在');
    }

    const product = productRows[0];
    if (product.status !== 'on_sale') {
      throw new BadRequestException('商品已下架，无法购买');
    }

    try {
      const inserted = await this.db
        .insert(orders)
        .values({
          userId,
          productId,
          price: product.price as string,
          status: 'paid',
        })
        .returning({ id: orders.id, productId: orders.productId });

      if (inserted.length === 0) {
        throw new ConflictException('购买失败');
      }

      this.logger.log(`Order created: ${inserted[0].id} for user ${userId}`);

      return {
        orderId: inserted[0].id,
        productId: inserted[0].productId,
      };
    } catch (error: unknown) {
      const code = extractPostgresErrorCode(error);
      if (code === '23505') {
        this.logger.warn(`Duplicate purchase attempt: user=${userId} product=${productId}`);
        throw new BadRequestException('已购买该商品');
      }
      throw error;
    }
  }

  async getMyOrders(
    userId: string,
    page: number,
    pageSize: number,
  ): Promise<OrderListResponse> {
    const offset = (page - 1) * pageSize;

    const [countResult, items] = await Promise.all([
      this.db
        .select({ count: count() })
        .from(orders)
        .where(eq(orders.userId, userId)),
      this.db
        .select({
          id: orders.id,
          userId: orders.userId,
          productId: orders.productId,
          price: orders.price,
          status: orders.status,
          createdAt: orders.createdAt,
          productId_rel: products.id,
          productAnchorName: products.anchorName,
          productMatchTime: products.matchTime,
          productHomeTeam: products.homeTeam,
          productAwayTeam: products.awayTeam,
          productPrice: products.price,
          productStatus: products.status,
          productResult: products.result,
          productCreatedAt: products.createdAt,
          productUpdatedAt: products.updatedAt,
        })
        .from(orders)
        .leftJoin(products, eq(orders.productId, products.id))
        .where(eq(orders.userId, userId))
        .orderBy(desc(orders.createdAt))
        .limit(pageSize)
        .offset(offset),
    ]);

    const total = Number(countResult[0]?.count ?? 0);

    const orderItems: OrderItem[] = items.map((row) => {
      let product: ProductPublic | undefined;
      if (row.productId_rel) {
        product = {
          id: row.productId_rel,
          anchorName: row.productAnchorName ?? '',
          matchTime: row.productMatchTime
            ? (row.productMatchTime as Date).toISOString()
            : '',
          homeTeam: row.productHomeTeam ?? '',
          awayTeam: row.productAwayTeam ?? '',
          price: String(row.productPrice ?? '0'),
          status: (row.productStatus as 'on_sale' | 'off_sale') ?? 'off_sale',
          result: (row.productResult as 'pending' | 'red' | 'black' | 'no_result') ?? 'pending',
          createdAt: row.productCreatedAt
            ? (row.productCreatedAt as Date).toISOString()
            : '',
          updatedAt: row.productUpdatedAt
            ? (row.productUpdatedAt as Date).toISOString()
            : '',
        };
      }
      return {
        id: row.id,
        userId: row.userId,
        productId: row.productId,
        price: String(row.price),
        status: row.status as 'paid',
        createdAt: (row.createdAt as Date).toISOString(),
        product,
      };
    });

    return {
      items: orderItems,
      total,
      page,
      pageSize,
    };
  }

  async getPurchasedContent(userId: string, productId: string): Promise<{ content: string }> {
    const orderRows = await this.db
      .select({ id: orders.id })
      .from(orders)
      .where(and(eq(orders.userId, userId), eq(orders.productId, productId)))
      .limit(1);

    if (orderRows.length === 0) {
      throw new ForbiddenException('未购买该商品');
    }

    const productRows = await this.db
      .select({ content: products.content })
      .from(products)
      .where(eq(products.id, productId))
      .limit(1);

    if (productRows.length === 0) {
      throw new NotFoundException('商品不存在');
    }

    return { content: productRows[0].content };
  }
}
