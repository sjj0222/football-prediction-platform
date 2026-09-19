import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';

import { OrdersService } from './orders.service';
import { AuthGuard } from '../auth/auth.guard';
import type { AuthenticatedRequest } from '../auth/auth.guard';
import type { BuyResponse, OrderListResponse } from '@shared/api.interface';

@Controller('api/orders')
@UseGuards(AuthGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post('buy/:productId')
  async buy(
    @Req() req: AuthenticatedRequest,
    @Param('productId') productId: string,
  ): Promise<BuyResponse> {
    const userId = req.user.id;
    return this.ordersService.buy(userId, productId);
  }

  @Get('my')
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

  @Get('my/:productId/content')
  async getPurchasedContent(
    @Req() req: AuthenticatedRequest,
    @Param('productId') productId: string,
  ): Promise<{ content: string }> {
    const userId = req.user.id;
    return this.ordersService.getPurchasedContent(userId, productId);
  }
}
