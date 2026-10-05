import {
  Injectable,
  Inject,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '../database/database.module';
import { eq, and, count, desc, ilike, or, isNull, sql, inArray } from 'drizzle-orm';
import { products, orders, users, matches, walletTransactions, adminLogs } from '@server/database/schema';
import { hashPassword } from '../common/auth/password';
import { WalletService } from '../wallet/wallet.service';
import type {
  ProductDetail,
  ProductListResponse,
  ProductStatus,
} from '@shared/api.interface';

export interface AdminUserItem {
  id: string;
  phone: string;
  role: string;
  status: string;
  createdAt: string;
}

export interface AdminProductItem {
  id: string;
  sellerId: string;
  matchId: string;
  title: string;
  description: string;
  price: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  league: string;
  homeTeam: string;
  awayTeam: string;
  matchTime: string;
  sellerPhone: string;
}

export interface AdminOrderItem {
  id: string;
  buyerId: string;
  productId: string;
  price: string;
  status: string;
  createdAt: string;
  productTitle: string;
  buyerPhone: string;
}

export interface AdminLogItem {
  id: string;
  adminId: string;
  action: string;
  targetType: string;
  targetId: string;
  reason: string;
  createdAt: string;
  adminPhone: string;
}

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
    private readonly walletService: WalletService,
  ) {}

  // ========== 工具：操作日志 ==========

  private async logAction(
    adminId: string,
    action: string,
    targetType: string,
    targetId: string,
    reason?: string,
  ): Promise<void> {
    await this.db.insert(adminLogs).values({
      adminId,
      action,
      targetType,
      targetId,
      reason: reason ?? '',
    });
  }

  // ========== 用户管理 ==========

  async getUsers(
    q: string | undefined,
    page: number,
    pageSize: number,
  ): Promise<{ items: AdminUserItem[]; total: number; page: number; pageSize: number }> {
    const conditions = q
      ? [or(ilike(users.phone, `%${q}%`), ilike(users.role, `%${q}%`))]
      : [];
    const whereClause = conditions.length ? and(...conditions) : undefined;

    const [countResult, rows] = await Promise.all([
      this.db.select({ count: count() }).from(users).where(whereClause),
      this.db
        .select()
        .from(users)
        .where(whereClause)
        .orderBy(desc(users.createdAt))
        .limit(pageSize)
        .offset((page - 1) * pageSize),
    ]);

    return {
      items: rows.map((u) => ({
        id: u.id,
        phone: u.phone,
        role: u.role,
        status: u.status,
        createdAt: u.createdAt.toISOString(),
      })),
      total: Number(countResult[0]?.count ?? 0),
      page,
      pageSize,
    };
  }

  async setUserStatus(
    id: string,
    status: 'frozen' | 'active',
    adminId: string,
    reason?: string,
  ): Promise<AdminUserItem> {
    const rows = await this.db.select().from(users).where(eq(users.id, id)).limit(1);
    if (rows.length === 0) {
      throw new NotFoundException('用户不存在');
    }
    const updated = await this.db
      .update(users)
      .set({ status, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    await this.logAction(
      adminId,
      status === 'frozen' ? 'freeze_user' : 'unfreeze_user',
      'user',
      id,
      reason,
    );
    const u = updated[0];
    return {
      id: u.id,
      phone: u.phone,
      role: u.role,
      status: u.status,
      createdAt: u.createdAt.toISOString(),
    };
  }

  async resetPassword(
    id: string,
    newPassword: string,
    adminId: string,
  ): Promise<{ ok: true }> {
    if (!newPassword || newPassword.length < 6) {
      throw new BadRequestException('新密码长度至少 6 位');
    }
    const rows = await this.db.select().from(users).where(eq(users.id, id)).limit(1);
    if (rows.length === 0) {
      throw new NotFoundException('用户不存在');
    }
    const passwordHash = hashPassword(newPassword);
    await this.db
      .update(users)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(users.id, id));
    await this.logAction(adminId, 'reset_password', 'user', id);
    return { ok: true };
  }

  /** 指定卖家 / 取消卖家（禁止发布权限） */
  async setSeller(
    id: string,
    role: 'seller' | 'buyer',
    adminId: string,
  ): Promise<AdminUserItem> {
    const rows = await this.db.select().from(users).where(eq(users.id, id)).limit(1);
    if (rows.length === 0) {
      throw new NotFoundException('用户不存在');
    }
    if (rows[0].role === 'admin') {
      throw new BadRequestException('不能修改管理员角色');
    }
    const updated = await this.db
      .update(users)
      .set({ role, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    await this.logAction(
      adminId,
      role === 'seller' ? 'assign_seller' : 'revoke_seller',
      'user',
      id,
    );
    const u = updated[0];
    return {
      id: u.id,
      phone: u.phone,
      role: u.role,
      status: u.status,
      createdAt: u.createdAt.toISOString(),
    };
  }

  // ========== 商品管理 ==========

  async getProducts(
    q: string | undefined,
    status: ProductStatus | undefined,
    page: number,
    pageSize: number,
  ): Promise<{ items: AdminProductItem[]; total: number; page: number; pageSize: number }> {
    const keywords = q
      ? q.split(/\s+/).filter((k: string) => k.length > 0)
      : [];
    const conditions: ReturnType<typeof eq>[] = [];
    if (status) {
      conditions.push(eq(products.status, status));
    }
    const searchConditions = keywords.map((keyword: string) =>
      or(
        ilike(products.title, `%${keyword}%`),
        ilike(matches.homeTeam, `%${keyword}%`),
        ilike(matches.awayTeam, `%${keyword}%`),
        ilike(matches.league, `%${keyword}%`),
      ),
    );
    const whereClause = and(...conditions, ...searchConditions);

    const [countResult, rows] = await Promise.all([
      this.db
        .select({ count: count() })
        .from(products)
        .innerJoin(matches, eq(products.matchId, matches.id))
        .where(whereClause),
      this.db
        .select({
          id: products.id,
          sellerId: products.sellerId,
          matchId: products.matchId,
          title: products.title,
          description: products.description,
          price: products.price,
          status: products.status,
          createdAt: products.createdAt,
          updatedAt: products.updatedAt,
          deletedAt: products.deletedAt,
          league: matches.league,
          homeTeam: matches.homeTeam,
          awayTeam: matches.awayTeam,
          matchTime: matches.matchTime,
        })
        .from(products)
        .innerJoin(matches, eq(products.matchId, matches.id))
        .where(whereClause)
        .orderBy(desc(products.createdAt))
        .limit(pageSize)
        .offset((page - 1) * pageSize),
    ]);

    const sellerIds = [...new Set(rows.map((r) => r.sellerId))];
    const sellerRows =
      sellerIds.length > 0
        ? await this.db
            .select({ id: users.id, phone: users.phone })
            .from(users)
            .where(inArray(users.id, sellerIds))
        : [];
    const sellerMap = new Map(sellerRows.map((s) => [s.id, s.phone]));

    return {
      items: rows.map((r) => ({
        id: r.id,
        sellerId: r.sellerId,
        matchId: r.matchId,
        title: r.title,
        description: r.description,
        price: String(r.price),
        status: r.status,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
        league: r.league,
        homeTeam: r.homeTeam,
        awayTeam: r.awayTeam,
        matchTime: r.matchTime.toISOString(),
        sellerPhone: sellerMap.get(r.sellerId) ?? '',
      })),
      total: Number(countResult[0]?.count ?? 0),
      page,
      pageSize,
    };
  }

  /** 审核通过：pending_review → online */
  async approveProduct(id: string, adminId: string): Promise<ProductDetail> {
    return this.transitionProductStatus(id, 'online', 'approve_product', adminId, '审核通过');
  }

  /** 审核拒绝：pending_review → offline */
  async rejectProduct(id: string, adminId: string, reason?: string): Promise<ProductDetail> {
    return this.transitionProductStatus(id, 'offline', 'reject_product', adminId, reason ?? '审核拒绝');
  }

  /** 下架：online → offline */
  async offlineProduct(id: string, adminId: string, reason?: string): Promise<ProductDetail> {
    return this.transitionProductStatus(id, 'offline', 'offline_product', adminId, reason);
  }

  private async transitionProductStatus(
    id: string,
    targetStatus: ProductStatus,
    action: string,
    adminId: string,
    reason?: string,
  ): Promise<ProductDetail> {
    const rows = await this.db.select().from(products).where(eq(products.id, id)).limit(1);
    if (rows.length === 0) {
      throw new NotFoundException('商品不存在');
    }
    const product = rows[0];
    if (action === 'approve_product' && product.status !== 'pending_review') {
      throw new BadRequestException('仅待审核商品可通过审核');
    }
    if ((action === 'reject_product' || action === 'offline_product') && product.status === 'deleted') {
      throw new BadRequestException('已删除商品不可操作');
    }
    const updated = await this.db
      .update(products)
      .set({ status: targetStatus, updatedAt: new Date() })
      .where(eq(products.id, id))
      .returning();
    await this.logAction(adminId, action, 'product', id, reason);
    return this.mapProductDetail(updated[0]);
  }

  /**
   * 商品删除流程：
   * 管理员确认 → 商品删除（软删） → 查询购买用户 → 全部退款 → 记录日志
   */
  async deleteProduct(id: string, adminId: string, reason?: string): Promise<{ ok: true }> {
    const quick = await this.db
      .select({ id: products.id })
      .from(products)
      .where(eq(products.id, id))
      .limit(1);
    if (quick.length === 0) {
      throw new NotFoundException('商品不存在');
    }

    await this.db.transaction(async (tx) => {
      // 锁商品行：同一商品并发删除串行化，防止重复执行退款
      const locked = await tx
        .select()
        .from(products)
        .where(eq(products.id, id))
        .for('update')
        .limit(1);
      if (locked.length === 0) {
        throw new NotFoundException('商品不存在');
      }
      if (locked[0].deletedAt) {
        throw new BadRequestException('商品已删除');
      }

      // 软删除商品
      await tx
        .update(products)
        .set({ status: 'deleted', deletedAt: new Date(), updatedAt: new Date() })
        .where(eq(products.id, id));

      // 查询该商品所有已支付订单（锁订单行，与单笔退款互斥，防双重退款）
      const paidOrders = await tx
        .select()
        .from(orders)
        .where(and(eq(orders.productId, id), eq(orders.status, 'paid')))
        .for('update');

      // 全部退款（幂等：钱包记 refund 正数，订单置 refunded）
      for (const order of paidOrders) {
        await tx.insert(walletTransactions).values({
          userId: order.buyerId,
          amount: String(Number(order.price)),
          type: 'refund',
          remark: `商品删除退款：${locked[0].title}`,
        });
        await tx
          .update(orders)
          .set({ status: 'refunded', updatedAt: new Date() })
          .where(eq(orders.id, order.id));
      }
    });

    await this.logAction(adminId, 'delete_product', 'product', id, reason);
    this.logger.log(`管理员删除商品并退款: id=${id}, reason=${reason ?? ''}`);
    return { ok: true };
  }

  // ========== 订单 / 退款管理 ==========

  async getOrders(
    status: string | undefined,
    page: number,
    pageSize: number,
  ): Promise<{ items: AdminOrderItem[]; total: number; page: number; pageSize: number }> {
    const conditions = status
      ? [eq(orders.status, status as 'paid' | 'refunded')]
      : [];
    const whereClause = conditions.length ? and(...conditions) : undefined;

    const [countResult, rows] = await Promise.all([
      this.db.select({ count: count() }).from(orders).where(whereClause),
      this.db
        .select({
          id: orders.id,
          buyerId: orders.buyerId,
          productId: orders.productId,
          price: orders.price,
          status: orders.status,
          createdAt: orders.createdAt,
          productTitle: products.title,
          buyerPhone: users.phone,
        })
        .from(orders)
        .innerJoin(products, eq(orders.productId, products.id))
        .innerJoin(users, eq(orders.buyerId, users.id))
        .where(whereClause)
        .orderBy(desc(orders.createdAt))
        .limit(pageSize)
        .offset((page - 1) * pageSize),
    ]);

    return {
      items: rows.map((r) => ({
        id: r.id,
        buyerId: r.buyerId,
        productId: r.productId,
        price: String(r.price),
        status: r.status,
        createdAt: r.createdAt.toISOString(),
        productTitle: r.productTitle,
        buyerPhone: r.buyerPhone,
      })),
      total: Number(countResult[0]?.count ?? 0),
      page,
      pageSize,
    };
  }

  /** 单笔退款：paid → refunded + 钱包退回（幂等） */
  async refundOrder(orderId: string, adminId: string, reason?: string): Promise<{ ok: true }> {
    const quick = await this.db
      .select({ id: orders.id })
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);
    if (quick.length === 0) {
      throw new NotFoundException('订单不存在');
    }

    await this.db.transaction(async (tx) => {
      // 锁订单行：同一订单并发退款串行化，防止双重退款
      const locked = await tx
        .select()
        .from(orders)
        .where(eq(orders.id, orderId))
        .for('update')
        .limit(1);
      if (locked.length === 0) {
        throw new NotFoundException('订单不存在');
      }
      if (locked[0].status === 'refunded') {
        throw new BadRequestException('订单已退款');
      }
      const order = locked[0];
      const productRows = await tx
        .select({ title: products.title })
        .from(products)
        .where(eq(products.id, order.productId))
        .limit(1);
      const productTitle = productRows[0]?.title ?? '';

      await tx.insert(walletTransactions).values({
        userId: order.buyerId,
        amount: String(Number(order.price)),
        type: 'refund',
        remark: `订单退款：${productTitle}`,
      });
      await tx
        .update(orders)
        .set({ status: 'refunded', updatedAt: new Date() })
        .where(eq(orders.id, orderId));
    });

    await this.logAction(adminId, 'refund_order', 'order', orderId, reason);
    return { ok: true };
  }

  // ========== 日志 ==========

  async getLogs(
    page: number,
    pageSize: number,
  ): Promise<{ items: AdminLogItem[]; total: number; page: number; pageSize: number }> {
    const [countResult, rows] = await Promise.all([
      this.db.select({ count: count() }).from(adminLogs),
      this.db
        .select({
          id: adminLogs.id,
          adminId: adminLogs.adminId,
          action: adminLogs.action,
          targetType: adminLogs.targetType,
          targetId: adminLogs.targetId,
          reason: adminLogs.reason,
          createdAt: adminLogs.createdAt,
          adminPhone: users.phone,
        })
        .from(adminLogs)
        .innerJoin(users, eq(adminLogs.adminId, users.id))
        .orderBy(desc(adminLogs.createdAt))
        .limit(pageSize)
        .offset((page - 1) * pageSize),
    ]);

    return {
      items: rows.map((r) => ({
        id: r.id,
        adminId: r.adminId,
        action: r.action,
        targetType: r.targetType,
        targetId: r.targetId,
        reason: r.reason,
        createdAt: r.createdAt.toISOString(),
        adminPhone: r.adminPhone,
      })),
      total: Number(countResult[0]?.count ?? 0),
      page,
      pageSize,
    };
  }

  // ========== 工具方法 ==========

  private mapProductDetail(row: {
    id: string;
    sellerId: string;
    matchId: string;
    author: string;
    title: string;
    description: string;
    content: string;
    price: string;
    status: string;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
  }): ProductDetail {
    return {
      id: row.id,
      sellerId: row.sellerId,
      matchId: row.matchId,
      author: row.author,
      title: row.title,
      description: row.description,
      content: row.content,
      price: String(row.price),
      status: row.status as ProductStatus,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      hasPurchased: false,
      additions: [],
    };
  }
}
