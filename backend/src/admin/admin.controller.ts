import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AdminService, type AdminUserItem } from './admin.service';
import { AuthGuard } from '../auth/auth.guard';
import type { AuthenticatedRequest } from '../auth/auth.guard';
import { RolesGuard } from '../common/auth/roles.guard';
import { AdminOnly } from '../common/auth/roles.decorator';
import type { ProductDetail, ProductStatus } from '@shared/api.interface';

@Controller('admin')
@UseGuards(AuthGuard, RolesGuard)
@AdminOnly()
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ========== 用户管理 ==========

  @Get('users')
  async getUsers(
    @Query('q') q?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.adminService.getUsers(q, this.pageNum(page), this.pageSizeNum(pageSize));
  }

  @Post('users/:id/freeze')
  async freezeUser(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
    @Body() dto?: { reason?: string },
  ): Promise<AdminUserItem> {
    return this.adminService.setUserStatus(id, 'frozen', req.user.id, dto?.reason);
  }

  @Post('users/:id/unfreeze')
  async unfreezeUser(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<AdminUserItem> {
    return this.adminService.setUserStatus(id, 'active', req.user.id);
  }

  @Post('users/:id/reset-password')
  async resetPassword(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
    @Body() dto: { newPassword: string },
  ): Promise<{ ok: true }> {
    return this.adminService.resetPassword(id, dto.newPassword, req.user.id);
  }

  // 指定卖家 / 取消卖家
  @Post('users/:id/set-role')
  async setRole(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
    @Body() dto: { role: 'seller' | 'buyer' },
  ): Promise<AdminUserItem> {
    if (dto.role !== 'seller' && dto.role !== 'buyer') {
      throw new Error('无效角色');
    }
    return this.adminService.setSeller(id, dto.role, req.user.id);
  }

  // ========== 商品管理 ==========

  @Get('products')
  async getProducts(
    @Query('q') q?: string,
    @Query('status') status?: ProductStatus,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.adminService.getProducts(q, status, this.pageNum(page), this.pageSizeNum(pageSize));
  }

  @Post('products/:id/approve')
  async approveProduct(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<ProductDetail> {
    return this.adminService.approveProduct(id, req.user.id);
  }

  @Post('products/:id/reject')
  async rejectProduct(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
    @Body() dto?: { reason?: string },
  ): Promise<ProductDetail> {
    return this.adminService.rejectProduct(id, req.user.id, dto?.reason);
  }

  @Post('products/:id/offline')
  async offlineProduct(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
    @Body() dto?: { reason?: string },
  ): Promise<ProductDetail> {
    return this.adminService.offlineProduct(id, req.user.id, dto?.reason);
  }

  @Post('products/:id/delete')
  async deleteProduct(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
    @Body() dto?: { reason?: string },
  ): Promise<{ ok: true }> {
    return this.adminService.deleteProduct(id, req.user.id, dto?.reason);
  }

  // ========== 订单 / 退款管理 ==========

  @Get('orders')
  async getOrders(
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.adminService.getOrders(status, this.pageNum(page), this.pageSizeNum(pageSize));
  }

  @Post('orders/:id/refund')
  async refundOrder(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
    @Body() dto?: { reason?: string },
  ): Promise<{ ok: true }> {
    return this.adminService.refundOrder(id, req.user.id, dto?.reason);
  }

  // ========== 日志 ==========

  @Get('logs')
  async getLogs(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.adminService.getLogs(this.pageNum(page), this.pageSizeNum(pageSize));
  }

  private pageNum(page?: string): number {
    return page && Number(page) > 0 ? Number(page) : 1;
  }

  private pageSizeNum(pageSize?: string): number {
    return pageSize && Number(pageSize) > 0 ? Math.min(Number(pageSize), 50) : 20;
  }
}
