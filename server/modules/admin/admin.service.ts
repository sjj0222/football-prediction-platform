import {
  Injectable,
  Inject,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '../../database/database.module';
import { eq, and, count, desc, ilike, or, inArray } from 'drizzle-orm';
import { products, orders, users } from '@server/database/schema';
import type {
  ProductPublic,
  ProductDetail,
  ProductListResponse,
  ProductStatus,
  ProductResult,
  OrderItem,
  AdminOrderListResponse,
} from '@shared/api.interface';
import type { AdminCreateProductDto } from './dto/admin-create-product.dto';
import type { AdminUpdateProductDto } from './dto/admin-update-product.dto';
import type { AdminSetResultDto } from './dto/admin-set-result.dto';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(@Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase) {}

  // ========== 商品管理 ==========

  async getProductList(
    q: string | undefined,
    status: ProductStatus | undefined,
    page: number,
    pageSize: number,
  ): Promise<ProductListResponse> {
    const keywords = q
      ? q.split(/\s+/).filter((k: string) => k.length > 0)
      : [];

    const conditions = [];
    if (status) {
      conditions.push(eq(products.status, status));
    }

    const searchConditions = keywords.map((keyword: string) =>
      or(
        ilike(products.anchorName, `%${keyword}%`),
        ilike(products.homeTeam, `%${keyword}%`),
        ilike(products.awayTeam, `%${keyword}%`),
      ),
    );

    const whereClause = and(...conditions, ...searchConditions);

    try {
      const [countResult, items] = await Promise.all([
        this.db
          .select({ count: count() })
          .from(products)
          .where(whereClause),
        this.db
          .select({
            id: products.id,
            anchorName: products.anchorName,
            matchTime: products.matchTime,
            homeTeam: products.homeTeam,
            awayTeam: products.awayTeam,
            price: products.price,
            status: products.status,
            result: products.result,
            createdAt: products.createdAt,
            updatedAt: products.updatedAt,
          })
          .from(products)
          .where(whereClause)
          .orderBy(desc(products.matchTime))
          .limit(pageSize)
          .offset((page - 1) * pageSize),
      ]);

      const total = Number(countResult[0]?.count ?? 0);

      return {
        items: items.map((item) => this.mapProductPublic(item)),
        total,
        page,
        pageSize,
      };
    } catch (error) {
      this.logger.error(
        `管理员获取商品列表失败: q=${q}, status=${status}, page=${page}, pageSize=${pageSize}, error=${JSON.stringify(error)}`,
      );
      throw error;
    }
  }

  async getProductDetail(id: string): Promise<ProductDetail> {
    try {
      const rows = await this.db
        .select()
        .from(products)
        .where(eq(products.id, id))
        .limit(1);

      if (rows.length === 0) {
        throw new NotFoundException('商品不存在');
      }

      const product = rows[0];
      const base = this.mapProductPublic(product);

      return {
        ...base,
        hasPurchased: false,
        content: product.content,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `管理员获取商品详情失败: id=${id}, error=${JSON.stringify(error)}`,
      );
      throw error;
    }
  }

  async createProduct(dto: AdminCreateProductDto, userId: string): Promise<ProductDetail> {
    try {
      const result = await this.db
        .insert(products)
        .values({
          anchorName: dto.anchorName,
          matchTime: new Date(dto.matchTime),
          homeTeam: dto.homeTeam,
          awayTeam: dto.awayTeam,
          content: dto.content,
          price: String(dto.price),
          status: 'off_sale',
          result: 'pending',
        })
        .returning();

      const product = result[0];
      this.logger.log(`管理员创建商品成功: id=${product.id}, anchorName=${dto.anchorName}`);

      const base = this.mapProductPublic(product);
      return {
        ...base,
        hasPurchased: false,
        content: product.content,
      };
    } catch (error) {
      this.logger.error(
        `管理员创建商品失败: anchorName=${dto.anchorName}, error=${JSON.stringify(error)}`,
      );
      throw error;
    }
  }

  async updateProduct(
    id: string,
    dto: AdminUpdateProductDto,
    userId: string,
  ): Promise<ProductDetail> {
    const patch: Partial<typeof products.$inferInsert> = {};

    if (dto.anchorName !== undefined) {
      patch.anchorName = dto.anchorName;
    }
    if (dto.matchTime !== undefined) {
      patch.matchTime = new Date(dto.matchTime);
    }
    if (dto.homeTeam !== undefined) {
      patch.homeTeam = dto.homeTeam;
    }
    if (dto.awayTeam !== undefined) {
      patch.awayTeam = dto.awayTeam;
    }
    if (dto.content !== undefined) {
      patch.content = dto.content;
    }

    if (Object.keys(patch).length === 0) {
      throw new BadRequestException('未提供可更新字段');
    }

    patch.updatedAt = new Date();

    try {
      const updated = await this.db
        .update(products)
        .set(patch)
        .where(eq(products.id, id))
        .returning();

      if (updated.length === 0) {
        throw new NotFoundException('商品不存在');
      }

      this.logger.log(`管理员更新商品成功: id=${id}`);
      const product = updated[0];
      const base = this.mapProductPublic(product);
      return {
        ...base,
        hasPurchased: false,
        content: product.content,
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(
        `管理员更新商品失败: id=${id}, error=${JSON.stringify(error)}`,
      );
      throw error;
    }
  }

  async setProductOnSale(id: string, userId: string): Promise<ProductDetail> {
    return this.updateProductStatus(id, 'on_sale', userId);
  }

  async setProductOffSale(id: string, userId: string): Promise<ProductDetail> {
    return this.updateProductStatus(id, 'off_sale', userId);
  }

  private async updateProductStatus(
    id: string,
    status: ProductStatus,
    userId: string,
  ): Promise<ProductDetail> {
    try {
      const updated = await this.db
        .update(products)
        .set({
          status,
          updatedAt: new Date(),
        })
        .where(eq(products.id, id))
        .returning();

      if (updated.length === 0) {
        throw new NotFoundException('商品不存在');
      }

      this.logger.log(`管理员${status === 'on_sale' ? '上架' : '下架'}商品: id=${id}`);
      const product = updated[0];
      const base = this.mapProductPublic(product);
      return {
        ...base,
        hasPurchased: false,
        content: product.content,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `管理员${status === 'on_sale' ? '上架' : '下架'}商品失败: id=${id}, error=${JSON.stringify(error)}`,
      );
      throw error;
    }
  }

  async setProductResult(
    id: string,
    dto: AdminSetResultDto,
    userId: string,
  ): Promise<ProductDetail> {
    // 先查询商品状态，下架商品不允许标记结果
    const existing = await this.db
      .select({ status: products.status })
      .from(products)
      .where(eq(products.id, id))
      .limit(1);

    if (existing.length === 0) {
      throw new NotFoundException('商品不存在');
    }

    if (existing[0].status === 'off_sale') {
      throw new BadRequestException('下架商品不允许标记结果');
    }

    try {
      const updated = await this.db
        .update(products)
        .set({
          result: dto.result,
          updatedAt: new Date(),
        })
        .where(eq(products.id, id))
        .returning();

      if (updated.length === 0) {
        throw new NotFoundException('商品不存在');
      }

      this.logger.log(`管理员标记商品结果: id=${id}, result=${dto.result}`);
      const product = updated[0];
      const base = this.mapProductPublic(product);
      return {
        ...base,
        hasPurchased: false,
        content: product.content,
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(
        `管理员标记商品结果失败: id=${id}, result=${dto.result}, error=${JSON.stringify(error)}`,
      );
      throw error;
    }
  }

  // ========== 订单管理 ==========

  async getOrderList(page: number, pageSize: number): Promise<AdminOrderListResponse> {
    try {
      const [countResult, orderRows] = await Promise.all([
        this.db
          .select({ count: count() })
          .from(orders),
        this.db
          .select()
          .from(orders)
          .orderBy(desc(orders.createdAt))
          .limit(pageSize)
          .offset((page - 1) * pageSize),
      ]);

      const total = Number(countResult[0]?.count ?? 0);

      if (orderRows.length === 0) {
        return { items: [], total, page, pageSize };
      }

      // 批量查询关联的商品和用户
      const productIds = [...new Set(orderRows.map((o) => o.productId))];
      const userIds = [...new Set(orderRows.map((o) => o.userId))];

      const [productRows, userRows] = await Promise.all([
        this.db
          .select({
            id: products.id,
            anchorName: products.anchorName,
            matchTime: products.matchTime,
            homeTeam: products.homeTeam,
            awayTeam: products.awayTeam,
            price: products.price,
            status: products.status,
            result: products.result,
            createdAt: products.createdAt,
            updatedAt: products.updatedAt,
          })
          .from(products)
          .where(inArray(products.id, productIds)),
        this.db
          .select({
            id: users.id,
            username: users.username,
          })
          .from(users)
          .where(inArray(users.id, userIds)),
      ]);

      // 用 Map 分组
      const productMap = new Map<string, ProductPublic>();
      for (const p of productRows) {
        productMap.set(p.id, this.mapProductPublic(p));
      }

      const userMap = new Map<string, { id: string; username: string }>();
      for (const u of userRows) {
        userMap.set(u.id, u);
      }

      const items = orderRows.map((order) => {
        const product = productMap.get(order.productId);
        const user = userMap.get(order.userId);
        return {
          id: order.id,
          userId: order.userId,
          productId: order.productId,
          price: String(order.price),
          status: order.status as OrderItem['status'],
          createdAt: order.createdAt.toISOString(),
          product,
          username: user?.username,
        };
      });

      return { items, total, page, pageSize };
    } catch (error) {
      this.logger.error(
        `管理员获取订单列表失败: page=${page}, pageSize=${pageSize}, error=${JSON.stringify(error)}`,
      );
      throw error;
    }
  }

  // ========== 工具方法 ==========

  private mapProductPublic(row: {
    id: string;
    anchorName: string;
    matchTime: Date;
    homeTeam: string;
    awayTeam: string;
    price: string;
    status: string;
    result: string;
    createdAt: Date;
    updatedAt: Date;
  }): ProductPublic {
    return {
      id: row.id,
      anchorName: row.anchorName,
      matchTime: row.matchTime.toISOString(),
      homeTeam: row.homeTeam,
      awayTeam: row.awayTeam,
      price: String(row.price),
      status: row.status as ProductStatus,
      result: row.result as ProductResult,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
