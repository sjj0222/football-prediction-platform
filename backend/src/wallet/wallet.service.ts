import { Injectable, Inject, Logger } from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '../database/database.module';
import { eq, and, desc, count, sql } from 'drizzle-orm';
import { walletTransactions } from '@server/database/schema';

export type WalletTxType = 'purchase' | 'admin_add' | 'refund';

export interface WalletTransactionItem {
  id: string;
  amount: string; // 带符号：purchase 为负，admin_add/refund 为正
  type: WalletTxType;
  remark: string;
  createdAt: string;
}

export interface WalletBalance {
  balance: string;
}

/**
 * 钱包账本模式：余额 = SUM(wallet_transactions.amount)
 * 增加：admin_add / refund（正数）；减少：purchase（负数）
 */
@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);

  constructor(@Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase) {}

  /** 记录一笔流水。amount 带符号（purchase 传负值） */
  async append(userId: string, type: WalletTxType, amount: number, remark: string): Promise<void> {
    await this.db.insert(walletTransactions).values({
      userId,
      amount: String(amount),
      type,
      remark,
    });
  }

  /** 计算余额（账本聚合） */
  async getBalance(userId: string): Promise<WalletBalance> {
    const rows = await this.db
      .select({ total: sql<string>`COALESCE(SUM(${walletTransactions.amount}), 0)` })
      .from(walletTransactions)
      .where(eq(walletTransactions.userId, userId));
    return { balance: rows[0]?.total ?? '0' };
  }

  /** 流水列表 */
  async listTransactions(
    userId: string,
    page: number,
    pageSize: number,
  ): Promise<{ items: WalletTransactionItem[]; total: number; page: number; pageSize: number }> {
    const [countResult, items] = await Promise.all([
      this.db
        .select({ count: count() })
        .from(walletTransactions)
        .where(eq(walletTransactions.userId, userId)),
      this.db
        .select()
        .from(walletTransactions)
        .where(eq(walletTransactions.userId, userId))
        .orderBy(desc(walletTransactions.createdAt))
        .limit(pageSize)
        .offset((page - 1) * pageSize),
    ]);

    return {
      items: items.map((row) => ({
        id: row.id,
        amount: String(row.amount),
        type: row.type as WalletTxType,
        remark: row.remark,
        createdAt: row.createdAt.toISOString(),
      })),
      total: Number(countResult[0]?.count ?? 0),
      page,
      pageSize,
    };
  }
}
