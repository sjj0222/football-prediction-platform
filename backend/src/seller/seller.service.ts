import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '../database/database.module';
import { ProductsService } from '../products/products.service';
import type {
  ProductDetail,
  ProductListResponse,
  SellerCreateProductRequest,
} from '@shared/api.interface';

@Injectable()
export class SellerService {
  constructor(
    private readonly productsService: ProductsService,
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
}
