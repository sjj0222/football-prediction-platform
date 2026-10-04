import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '../database/database.module';
import { eq, and, desc, isNull } from 'drizzle-orm';
import { orders, products, matches } from '@server/database/schema';
import { ProductsService } from '../products/products.service';
import type {
  ProductDetail,
  ProductListResponse,
  SellerCreateProductRequest,
} from '@shared/api.interface';

export interface SalesOrderItem {
  id: string;
  productId: string;
  title: string;
  homeTeam: string;
  awayTeam: string;
  matchTime: string;
  price: string;
  createdAt: string;
}

@Injectable()
export class SellerService {
  constructor(
    private readonly productsService: ProductsService,
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
  ) {}

  getMyProducts(sellerId: string): Promise<ProductListResponse> {
    return this.productsService.getMyProducts(sellerId);
  }

  createProduct(dto: SellerCreateProductRequest, sellerId: string): Promise<ProductDetail> {
    return this.productsService.createBySeller(dto, sellerId);
  }

  submitForReview(id: string, sellerId: string): Promise<ProductDetail> {
    return this.productsService.submitForReview(id, sellerId);
  }

  offline(id: string, sellerId: string): Promise<ProductDetail> {
    return this.productsService.sellerOffline(id, sellerId);
  }

  /** 销售记录：卖出订单（含已退款） */
  async getSales(sellerId: string): Promise<SalesOrderItem[]> {
    const rows = await this.db
      .select({
        id: orders.id,
        productId: orders.productId,
        title: products.title,
        homeTeam: matches.homeTeam,
        awayTeam: matches.awayTeam,
        matchTime: matches.matchTime,
        price: orders.price,
        createdAt: orders.createdAt,
      })
      .from(orders)
      .innerJoin(products, eq(orders.productId, products.id))
      .innerJoin(matches, eq(products.matchId, matches.id))
      .where(and(eq(products.sellerId, sellerId), isNull(products.deletedAt)))
      .orderBy(desc(orders.createdAt));

    return rows.map((row) => ({
      id: row.id,
      productId: row.productId,
      title: row.title,
      homeTeam: row.homeTeam,
      awayTeam: row.awayTeam,
      matchTime: row.matchTime.toISOString(),
      price: String(row.price),
      createdAt: row.createdAt.toISOString(),
    }));
  }
}
