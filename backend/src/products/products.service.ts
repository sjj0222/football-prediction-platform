import { Injectable, Inject, Logger, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '../database/database.module';
import { eq, and, count, desc, ilike, or, asc, isNull } from 'drizzle-orm';
import { products, matches, orders, productAdditions, users } from '@server/database/schema';
import type {
  ProductPublic,
  ProductDetail,
  ProductListResponse,
  ProductStatus,
  SellerCreateProductRequest,
} from '@shared/api.interface';

export interface Viewer {
  userId: string;
  role: string;
}

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(@Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase) {}

  /** 公开商品列表：仅 online，可按关键字搜索（标题/描述/球队/联赛） */
  async getList(
    q: string | undefined,
    page: number,
    pageSize: number,
  ): Promise<ProductListResponse> {
    const keywords = q ? q.split(/\s+/).filter((k: string) => k.length > 0) : [];

    const baseConditions = [eq(products.status, 'online'), isNull(products.deletedAt)];

    const searchConditions = keywords.map((keyword: string) =>
      or(
        ilike(products.title, `%${keyword}%`),
        ilike(products.description, `%${keyword}%`),
        ilike(matches.homeTeam, `%${keyword}%`),
        ilike(matches.awayTeam, `%${keyword}%`),
        ilike(matches.league, `%${keyword}%`),
      ),
    );

    const whereClause = and(...baseConditions, ...searchConditions);

    try {
      const [countResult, items] = await Promise.all([
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
            league: matches.league,
            homeTeam: matches.homeTeam,
            awayTeam: matches.awayTeam,
            matchTime: matches.matchTime,
          })
          .from(products)
          .innerJoin(matches, eq(products.matchId, matches.id))
          .where(whereClause)
          .orderBy(desc(matches.matchTime))
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
      this.logger.error(`获取商品列表失败: q=${q}, error=${JSON.stringify(error)}`);
      throw error;
    }
  }

  /** 卖家查看自己全部商品（含草稿/待审核/上下架，不含已删除） */
  async getMyProducts(sellerId: string): Promise<ProductListResponse> {
    const items = await this.db
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
        league: matches.league,
        homeTeam: matches.homeTeam,
        awayTeam: matches.awayTeam,
        matchTime: matches.matchTime,
      })
      .from(products)
      .innerJoin(matches, eq(products.matchId, matches.id))
      .where(and(eq(products.sellerId, sellerId), isNull(products.deletedAt)))
      .orderBy(desc(products.createdAt));

    return {
      items: items.map((item) => this.mapProductPublic(item)),
      total: items.length,
      page: 1,
      pageSize: items.length,
    };
  }

  /**
   * 商品详情：
   * - 未登录/未购买：仅返回公开信息（online 商品；offline 仅已购用户可见；deleted 一律不可见）
   * - 已购买 / 卖家本人 / 管理员：额外返回 content 与 additions
   */
  async getDetail(id: string, viewer?: Viewer): Promise<ProductDetail> {
    try {
      const rows = await this.db
        .select({
          id: products.id,
          sellerId: products.sellerId,
          matchId: products.matchId,
          title: products.title,
          description: products.description,
          content: products.content,
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
        .where(eq(products.id, id))
        .limit(1);

      if (rows.length === 0) {
        throw new NotFoundException('商品不存在');
      }

      const product = rows[0];

      // 已删除：任何人不可见
      if (product.deletedAt) {
        throw new NotFoundException('商品不存在');
      }

      const isSeller = viewer?.userId === product.sellerId;
      const isAdmin = viewer?.role === 'admin';

      // 购买状态
      const hasPurchased = viewer
        ? (
            await this.db
              .select({ id: orders.id })
              .from(orders)
              .where(
                and(
                  eq(orders.buyerId, viewer.userId),
                  eq(orders.productId, id),
                  eq(orders.status, 'paid'),
                ),
              )
              .limit(1)
          ).length > 0
        : false;

      // 非 online 状态：仅已购用户、卖家、管理员可看
      if (product.status !== 'online' && !hasPurchased && !isSeller && !isAdmin) {
        throw new NotFoundException('商品不存在');
      }

      const base = this.mapProductPublic(product);

      const detail: ProductDetail = {
        ...base,
        hasPurchased,
      };

      const canSeeContent = hasPurchased || isSeller || isAdmin;
      if (canSeeContent) {
        detail.content = product.content;
        const additionRows = await this.db
          .select({ content: productAdditions.content, createdAt: productAdditions.createdAt })
          .from(productAdditions)
          .where(eq(productAdditions.productId, id))
          .orderBy(asc(productAdditions.createdAt));
        detail.additions = additionRows.map((row) => row.content);
      }

      return detail;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`获取商品详情失败: id=${id}, error=${JSON.stringify(error)}`);
      throw error;
    }
  }

  /** 卖家创建商品（draft） */
  async createBySeller(dto: SellerCreateProductRequest, sellerId: string): Promise<ProductDetail> {
    if (!dto.matchId) throw new BadRequestException('请选择比赛');
    if (!dto.title?.trim()) throw new BadRequestException('请填写商品标题');
    if (!dto.content?.trim()) throw new BadRequestException('请填写商品内容');
    if (!dto.price || Number(dto.price) < 0) throw new BadRequestException('价格必须大于等于 0');

    // 校验比赛存在
    const matchRows = await this.db
      .select({ id: matches.id })
      .from(matches)
      .where(eq(matches.id, dto.matchId))
      .limit(1);
    if (matchRows.length === 0) {
      throw new BadRequestException('比赛不存在');
    }

    const inserted = await this.db
      .insert(products)
      .values({
        sellerId,
        matchId: dto.matchId,
        title: dto.title.trim(),
        description: dto.description?.trim() ?? '',
        content: dto.content,
        price: String(dto.price),
        status: 'draft',
      })
      .returning();

    // 返回完整详情（含比赛信息）
    return this.getDetail(inserted[0].id, { userId: sellerId, role: 'seller' });
  }

  /** 卖家提交审核：draft → pending_review */
  async submitForReview(id: string, sellerId: string): Promise<ProductDetail> {
    const rows = await this.db.select().from(products).where(eq(products.id, id)).limit(1);
    if (rows.length === 0) {
      throw new NotFoundException('商品不存在');
    }
    const product = rows[0];
    if (product.sellerId !== sellerId) {
      throw new ForbiddenException('无权操作该商品');
    }
    if (product.status !== 'draft') {
      throw new BadRequestException('仅草稿状态可提交审核');
    }

    const updated = await this.db
      .update(products)
      .set({ status: 'pending_review', updatedAt: new Date() })
      .where(eq(products.id, id))
      .returning();

    return this.getDetail(id, { userId: sellerId, role: 'seller' });
  }

  /** 卖家追加补充内容（发布后原文不可改，只允许追加） */
  async addAddition(id: string, content: string, sellerId: string): Promise<{ additions: string[] }> {
    if (!content?.trim()) throw new BadRequestException('补充内容不能为空');
    const rows = await this.db.select().from(products).where(eq(products.id, id)).limit(1);
    if (rows.length === 0) {
      throw new NotFoundException('商品不存在');
    }
    const product = rows[0];
    if (product.sellerId !== sellerId) {
      throw new ForbiddenException('无权操作该商品');
    }

    await this.db.insert(productAdditions).values({ productId: id, content });

    const additionRows = await this.db
      .select({ content: productAdditions.content })
      .from(productAdditions)
      .where(eq(productAdditions.productId, id))
      .orderBy(asc(productAdditions.createdAt));

    return { additions: additionRows.map((row) => row.content) };
  }

  /** 卖家下架（V0.2 扩展：状态 online → offline；为后续阶段保留） */
  async sellerOffline(id: string, sellerId: string): Promise<ProductDetail> {
    const rows = await this.db.select().from(products).where(eq(products.id, id)).limit(1);
    if (rows.length === 0) {
      throw new NotFoundException('商品不存在');
    }
    const product = rows[0];
    if (product.sellerId !== sellerId) {
      throw new ForbiddenException('无权操作该商品');
    }
    await this.db
      .update(products)
      .set({ status: 'offline', updatedAt: new Date() })
      .where(eq(products.id, id));
    return this.getDetail(id, { userId: sellerId, role: 'seller' });
  }

  private mapProductPublic(row: {
    id: string;
    sellerId: string;
    matchId: string;
    title: string;
    description: string;
    price: string;
    status: string;
    createdAt: Date;
    updatedAt: Date;
    league: string;
    homeTeam: string;
    awayTeam: string;
    matchTime: Date;
  }): ProductPublic {
    return {
      id: row.id,
      sellerId: row.sellerId,
      matchId: row.matchId,
      title: row.title,
      description: row.description,
      price: String(row.price),
      status: row.status as ProductStatus,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      league: row.league,
      homeTeam: row.homeTeam,
      awayTeam: row.awayTeam,
      matchTime: row.matchTime.toISOString(),
    };
  }
}
