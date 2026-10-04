import { Controller, Get, Post, Param, Body, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { SellerService, type SalesOrderItem } from './seller.service';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../common/auth/roles.guard';
import { Roles } from '../common/auth/roles.decorator';
import type {
  ProductDetail,
  ProductListResponse,
  SellerCreateProductRequest,
} from '@shared/api.interface';

@Controller('seller')
@UseGuards(AuthGuard, RolesGuard)
@Roles('seller', 'admin')
export class SellerController {
  constructor(private readonly sellerService: SellerService) {}

  // 我的商品
  @Get('products')
  async getMyProducts(@Req() req: Request): Promise<ProductListResponse> {
    const user = (req as { user: { id: string } }).user;
    return this.sellerService.getMyProducts(user.id);
  }

  // 销售记录
  @Get('orders')
  async getSales(@Req() req: Request): Promise<SalesOrderItem[]> {
    const user = (req as { user: { id: string } }).user;
    return this.sellerService.getSales(user.id);
  }

  // 创建商品（draft）
  @Post('products')
  async createProduct(
    @Req() req: Request,
    @Body() dto: SellerCreateProductRequest,
  ): Promise<ProductDetail> {
    const user = (req as { user: { id: string } }).user;
    return this.sellerService.createProduct(dto, user.id);
  }

  // 提交审核：draft → pending_review
  @Post('products/:id/submit')
  async submitForReview(
    @Param('id') id: string,
    @Req() req: Request,
  ): Promise<ProductDetail> {
    const user = (req as { user: { id: string } }).user;
    return this.sellerService.submitForReview(id, user.id);
  }

  // 卖家下架商品
  @Post('products/:id/offline')
  async offline(
    @Param('id') id: string,
    @Req() req: Request,
  ): Promise<ProductDetail> {
    const user = (req as { user: { id: string } }).user;
    return this.sellerService.offline(id, user.id);
  }
}
