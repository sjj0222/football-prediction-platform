import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Req,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';

import { OrdersService } from './orders.service';
import { AuthGuard } from '../auth/auth.guard';
import type { AuthenticatedRequest } from '../auth/auth.guard';
import type { BuyResponse, OrderListResponse } from '@shared/api.interface';

@Controller('orders')
@UseGuards(AuthGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  // 购买：POST /orders  { productId }
  @Post()
  async buy(
    @Req() req: AuthenticatedRequest,
    @Body() dto: { productId: string },
  ): Promise<BuyResponse> {
    if (!dto.productId) {
      throw new BadRequestException('缺少 productId');
    }
    return this.ordersService.buy(req.user.id, dto.productId);
  }

  // 我的订单
  @Get('me')
  async getMyOrders(
    @Req() req: AuthenticatedRequest,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ): Promise<OrderListResponse> {
    const userId = req.user.id;
    const currentPage = page && Number(page) > 0 ? Number(page) : 1;
    const currentPageSize = pageSize && Number(pageSize) > 0 && Number(pageSize) <= 100 ? Number(pageSize) : 10;
    return this.ordersService.getMyOrders(userId, currentPage, currentPageSize);
  }
}
