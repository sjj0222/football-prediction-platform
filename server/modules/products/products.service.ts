import { Injectable, Inject, Logger, NotFoundException } from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '../../database/database.module';
import { eq, and, count, desc, ilike, or } from 'drizzle-orm';
import { products, orders } from '@server/database/schema';
import type {
  ProductPublic,
  ProductDetail,
  ProductListResponse,
  ProductStatus,
  ProductResult,
} from '@shared/api.interface';

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(@Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase) {}

  async getList(
    q: string | undefined,
    page: number,
    pageSize: number,
  ): Promise<ProductListResponse> {
    const keywords = q
      ? q.split(/\s+/).filter((k: string) => k.length > 0)
      : [];

    const baseConditions = [eq(products.status, 'on_sale')];

    const searchConditions = keywords.map((keyword: string) =>
      or(
        ilike(products.anchorName, `%${keyword}%`),
        ilike(products.homeTeam, `%${keyword}%`),
        ilike(products.awayTeam, `%${keyword}%`),
      ),
    );

    const whereClause = and(...baseConditions, ...searchConditions);

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
        `获取商品列表失败: q=${q}, page=${page}, pageSize=${pageSize}, error=${JSON.stringify(error)}`,
      );
      throw error;
    }
  }

  async getDetail(id: string, userId: string | undefined): Promise<ProductDetail> {
    try {
      const [productRows, orderRows] = await Promise.all([
        this.db
          .select()
          .from(products)
          .where(eq(products.id, id))
          .limit(1),
        userId
          ? this.db
              .select()
              .from(orders)
              .where(
                and(
                  eq(orders.userId, userId),
                  eq(orders.productId, id),
                  eq(orders.status, 'paid'),
                ),
              )
              .limit(1)
          : Promise.resolve([]),
      ]);

      if (productRows.length === 0) {
        throw new NotFoundException('商品不存在');
      }

      const product = productRows[0];
      const hasPurchased = orderRows.length > 0;

      // 下架商品只有已购买用户才能查看
      if (product.status === 'off_sale' && !hasPurchased) {
        throw new NotFoundException('商品不存在');
      }

      const base = this.mapProductPublic(product);

      const detail: ProductDetail = {
        ...base,
        hasPurchased,
      };

      // 已购买则返回 content（下架商品已购买也可查看内容）
      if (hasPurchased) {
        detail.content = product.content;
      }

      return detail;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `获取商品详情失败: id=${id}, userId=${userId}, error=${JSON.stringify(error)}`,
      );
      throw error;
    }
  }

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
