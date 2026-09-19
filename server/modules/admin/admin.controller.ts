import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminGuard } from './admin.guard';
import type { AdminAuthenticatedRequest } from './admin.guard';
import { AdminCreateProductDto } from './dto/admin-create-product.dto';
import { AdminUpdateProductDto } from './dto/admin-update-product.dto';
import { AdminSetResultDto } from './dto/admin-set-result.dto';
import type {
  ProductDetail,
  ProductListResponse,
  AdminOrderListResponse,
  ProductStatus,
} from '@shared/api.interface';

@Controller('api/admin')
@UseGuards(AdminGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ========== 商品管理 ==========

  @Get('products')
  async getProductList(
    @Query('q') q?: string,
    @Query('status') status?: ProductStatus,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ): Promise<ProductListResponse> {
    const pageNum = page && Number(page) > 0 ? Number(page) : 1;
    const pageSizeNum = pageSize && Number(pageSize) > 0 ? Math.min(Number(pageSize), 50) : 20;
    return this.adminService.getProductList(q, status, pageNum, pageSizeNum);
  }

  @Get('products/:id')
  async getProductDetail(@Param('id') id: string): Promise<ProductDetail> {
    return this.adminService.getProductDetail(id);
  }

  @Post('products')
  async createProduct(
    @Req() req: AdminAuthenticatedRequest,
    @Body() dto: AdminCreateProductDto,
  ): Promise<ProductDetail> {
    const { id: userId } = req.user;
    return this.adminService.createProduct(dto, userId);
  }

  @Put('products/:id')
  async updateProduct(
    @Param('id') id: string,
    @Req() req: AdminAuthenticatedRequest,
    @Body() dto: AdminUpdateProductDto,
  ): Promise<ProductDetail> {
    const { id: userId } = req.user;
    return this.adminService.updateProduct(id, dto, userId);
  }

  @Post('products/:id/on-sale')
  async onSaleProduct(
    @Param('id') id: string,
    @Req() req: AdminAuthenticatedRequest,
  ): Promise<ProductDetail> {
    const { id: userId } = req.user;
    return this.adminService.setProductOnSale(id, userId);
  }

  @Post('products/:id/off-sale')
  async offSaleProduct(
    @Param('id') id: string,
    @Req() req: AdminAuthenticatedRequest,
  ): Promise<ProductDetail> {
    const { id: userId } = req.user;
    return this.adminService.setProductOffSale(id, userId);
  }

  @Post('products/:id/result')
  async setProductResult(
    @Param('id') id: string,
    @Req() req: AdminAuthenticatedRequest,
    @Body() dto: AdminSetResultDto,
  ): Promise<ProductDetail> {
    const { id: userId } = req.user;
    return this.adminService.setProductResult(id, dto, userId);
  }

  // ========== 订单管理 ==========

  @Get('orders')
  async getOrderList(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ): Promise<AdminOrderListResponse> {
    const pageNum = page && Number(page) > 0 ? Number(page) : 1;
    const pageSizeNum = pageSize && Number(pageSize) > 0 ? Math.min(Number(pageSize), 50) : 20;
    return this.adminService.getOrderList(pageNum, pageSizeNum);
  }
}
