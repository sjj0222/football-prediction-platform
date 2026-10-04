import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { ProductsService } from './products.service';
import { AuthGuard } from '../auth/auth.guard';
import { OptionalAuthGuard } from '../common/auth/optional-auth.guard';
import type {
  ProductDetail,
  ProductListResponse,
  SellerAddAdditionRequest,
} from '@shared/api.interface';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  // 公开：在售商品列表
  @Get()
  async getList(
    @Query('q') q?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ): Promise<ProductListResponse> {
    const pageNum = page && Number(page) > 0 ? Number(page) : 1;
    const pageSizeNum = pageSize && Number(pageSize) > 0 ? Math.min(Number(pageSize), 50) : 20;
    return this.productsService.getList(q, pageNum, pageSizeNum);
  }

  // 公开：商品详情（登录可选；已购/卖家/管理员可见内容）
  @Get(':id')
  @UseGuards(OptionalAuthGuard)
  async getDetail(
    @Param('id') id: string,
    @Req() req: Request,
  ): Promise<ProductDetail> {
    const appUser = (req as { appUser?: { userId: string; role: string } }).appUser;
    return this.productsService.getDetail(id, appUser ?? undefined);
  }

  // 卖家追加补充内容（发布后原文不可改，只允许追加）
  @Post(':id/additions')
  @UseGuards(AuthGuard)
  async addAddition(
    @Param('id') id: string,
    @Req() req: Request,
    @Body() dto: SellerAddAdditionRequest,
  ): Promise<{ additions: string[] }> {
    const user = (req as { user: { id: string } }).user;
    return this.productsService.addAddition(id, dto.content, user.id);
  }
}
