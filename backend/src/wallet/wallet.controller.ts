import { Controller, Get, Post, Query, Body, Req, UseGuards, BadRequestException } from '@nestjs/common';
import type { Request } from 'express';
import { WalletService, type WalletBalance, type WalletTransactionItem } from './wallet.service';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../common/auth/roles.guard';
import { Roles } from '../common/auth/roles.decorator';

@Controller('wallet')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  // 当前用户余额
  @Get('balance')
  @UseGuards(AuthGuard)
  async getBalance(@Req() req: Request): Promise<WalletBalance> {
    const user = (req as unknown as { user: { id: string } }).user;
    return this.walletService.getBalance(user.id);
  }

  // 当前用户流水
  @Get('transactions')
  @UseGuards(AuthGuard)
  async getTransactions(
    @Req() req: Request,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ): Promise<{ items: WalletTransactionItem[]; total: number; page: number; pageSize: number }> {
    const user = (req as unknown as { user: { id: string } }).user;
    const pageNum = page && Number(page) > 0 ? Number(page) : 1;
    const pageSizeNum = pageSize && Number(pageSize) > 0 ? Math.min(Number(pageSize), 50) : 20;
    return this.walletService.listTransactions(user.id, pageNum, pageSizeNum);
  }

  // 管理员给用户加钱 / 扣款（账本模式，直接记流水）
  @Post('admin/adjust')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin')
  async adminAdjust(
    @Body() dto: { userId: string; amount: number; type?: 'admin_add' | 'refund' | 'purchase'; remark?: string },
  ): Promise<WalletBalance> {
    if (!dto.userId || !dto.amount || Number.isNaN(Number(dto.amount))) {
      throw new BadRequestException('参数不合法');
    }
    const type = dto.type ?? 'admin_add';
    const remark = dto.remark ?? (type === 'purchase' ? '购买扣款' : '管理员调整余额');
    // amount 传负值表示扣款（purchase 场景由订单系统直接调用 append 负数）
    await this.walletService.append(dto.userId, type, Number(dto.amount), remark);
    return this.walletService.getBalance(dto.userId);
  }
}
