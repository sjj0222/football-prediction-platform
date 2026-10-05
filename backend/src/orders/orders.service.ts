import { Injectable, Inject, Logger, BadRequestException } from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '../database/database.module';
import { eq, and, desc, count, isNull, sql } from 'drizzle-orm';
import { orders, products, matches, walletTransactions, users } from '@server/database/schema';
import type { BuyResponse, OrderItem, OrderListResponse } from '@shared/api.interface';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(@Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase) {}

  /**
   * 购买流程（账本事务）：
   * 1. 商品必须是 online 且未删除
   * 2. 同一用户同一商品只能购买一次（UNIQUE(buyer_id, product_id)），已购直接返回已有订单
   * 3. 检查余额 >= 价格
   * 4. 扣款（wallet_transactions 记 purchase 负值）
   * 5. 生成 paid 订单，开放内容查看
   */
  async buy(userId: string, productId: string): Promise<BuyResponse> {
    // 已购检查（防重复购买）
    const existing = await this.db
      .select()
      .from(orders)
      .where(and(eq(orders.buyerId, userId), eq(orders.productId, productId)))
      .limit(1);
    if (existing.length > 0) {
      return { orderId: existing[0].id, productId };
    }

    // 商品校验
    const productRows = await this.db
      .select()
      .from(products)
      .where(and(eq(products.id, productId), eq(products.status, 'online'), isNull(products.deletedAt)))
      .limit(1);
    if (productRows.length === 0) {
      throw new BadRequestException('商品不存在或未上架');
    }
    const product = productRows[0];
    const price = Number(product.price);
    if (!(price >= 0)) {
      throw new BadRequestException('商品价格异常');
    }

    // 余额检查
    const balanceRows = await this.db
      .select({ total: sql<string>`COALESCE(SUM(${walletTransactions.amount}), 0)` })
      .from(walletTransactions)
      .where(eq(walletTransactions.userId, userId));
    const balance = Number(balanceRows[0]?.total ?? 0);
    if (balance < price) {
      throw new BadRequestException('余额不足，请先充值');
    }

    // 事务：扣款 + 生成订单
    try {
      const result = await this.db.transaction(async (tx) => {
        // 锁用户行：同一用户并发购买串行化，防止余额检查竞态导致超扣
        const lockedUser = await tx
          .select({ id: users.id })
          .from(users)
          .where(eq(users.id, userId))
          .for('update')
          .limit(1);
        if (lockedUser.length === 0) {
          throw new BadRequestException('用户不存在');
        }

        // 事务内重新校验余额（行锁生效后读取最新值，余额不足则回滚）
        const balanceRows = await tx
          .select({ total: sql<string>`COALESCE(SUM(${walletTransactions.amount}), 0)` })
          .from(walletTransactions)
          .where(eq(walletTransactions.userId, userId));
        const balanceNow = Number(balanceRows[0]?.total ?? 0);
        if (balanceNow < price) {
          throw new BadRequestException('余额不足，请先充值');
        }

        // 扣款流水（负数）
        await tx.insert(walletTransactions).values({
          userId,
          amount: String(-price),
          type: 'purchase',
          remark: `购买商品 ${product.title}`,
        });
        const inserted = await tx
          .insert(orders)
          .values({
            buyerId: userId,
            productId,
            price: String(price),
            status: 'paid',
          })
          .returning();
        return inserted[0];
      });
      return { orderId: result.id, productId };
    } catch (error) {
      // UNIQUE 冲突兜底：并发重复购买
      const existingAgain = await this.db
        .select()
        .from(orders)
        .where(and(eq(orders.buyerId, userId), eq(orders.productId, productId)))
        .limit(1);
      if (existingAgain.length > 0) {
        return { orderId: existingAgain[0].id, productId };
      }
      this.logger.error(`购买失败: userId=${userId}, productId=${productId}, error=${JSON.stringify(error)}`);
      throw error;
    }
  }

  /** 我的订单（join 商品与比赛） */
  async getMyOrders(userId: string, page: number, pageSize: number): Promise<OrderListResponse> {
    const [countResult, items] = await Promise.all([
      this.db
        .select({ count: count() })
        .from(orders)
        .where(eq(orders.buyerId, userId)),
      this.db
        .select({
          id: orders.id,
          buyerId: orders.buyerId,
          productId: orders.productId,
          price: orders.price,
          status: orders.status,
          createdAt: orders.createdAt,
          updatedAt: orders.updatedAt,
          title: products.title,
          description: products.description,
          sellerId: products.sellerId,
          league: matches.league,
          homeTeam: matches.homeTeam,
          awayTeam: matches.awayTeam,
          matchTime: matches.matchTime,
        })
        .from(orders)
        .innerJoin(products, eq(orders.productId, products.id))
        .innerJoin(matches, eq(products.matchId, matches.id))
        .where(eq(orders.buyerId, userId))
        .orderBy(desc(orders.createdAt))
        .limit(pageSize)
        .offset((page - 1) * pageSize),
    ]);

    return {
      items: items.map((row) => this.mapOrderItem(row)),
      total: Number(countResult[0]?.count ?? 0),
      page,
      pageSize,
    };
  }

  private mapOrderItem(row: {
    id: string;
    buyerId: string;
    productId: string;
    price: string;
    status: string;
    createdAt: Date;
    updatedAt: Date;
    title: string;
    description: string;
    sellerId: string;
    league: string;
    homeTeam: string;
    awayTeam: string;
    matchTime: Date;
  }): OrderItem {
    return {
      id: row.id,
      buyerId: row.buyerId,
      productId: row.productId,
      price: String(row.price),
      status: row.status as OrderItem['status'],
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      product: {
        id: row.productId,
        sellerId: row.sellerId,
        matchId: '',
        title: row.title,
        description: row.description,
        price: String(row.price),
        status: 'online',
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
        league: row.league,
        homeTeam: row.homeTeam,
        awayTeam: row.awayTeam,
        matchTime: row.matchTime.toISOString(),
      },
    };
  }
}
