import {
  Controller,
  Get,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { ProductsService } from './products.service';
import { OptionalAuthGuard } from '@server/common/auth/optional-auth.guard';
import type {
  ProductDetail,
  ProductListResponse,
} from '@shared/api.interface';

@Controller('api/products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

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

  @Get(':id')
  @UseGuards(OptionalAuthGuard)
  async getDetail(
    @Param('id') id: string,
    @Req() req: Request,
  ): Promise<ProductDetail> {
    const userId = (req as { appUser?: { userId: string } }).appUser?.userId;
    return this.productsService.getDetail(id, userId);
  }
}
