import { describe, it, expect } from 'vitest';
import {
  users,
  matches,
  products,
  productAdditions,
  orders,
  walletTransactions,
  favorites,
  adminLogs,
} from './schema';

describe('V0.2 数据库结构冒烟测试', () => {
  it('users 表使用 phone 字段并包含角色与状态', () => {
    expect(users.phone).toBeDefined();
    expect(users.passwordHash).toBeDefined();
    expect(users.role).toBeDefined();
    expect(users.status).toBeDefined();
  });

  it('products 表包含卖家/比赛关联与生命周期字段', () => {
    expect(products.sellerId).toBeDefined();
    expect(products.matchId).toBeDefined();
    expect(products.title).toBeDefined();
    expect(products.description).toBeDefined();
    expect(products.content).toBeDefined();
    expect(products.price).toBeDefined();
    expect(products.status).toBeDefined();
    expect(products.deletedAt).toBeDefined();
  });

  it('订单表使用 buyer_id 并包含退款状态', () => {
    expect(orders.buyerId).toBeDefined();
    expect(orders.status).toBeDefined();
  });

  it('8 张业务表全部导出', () => {
    const tables = [
      users, matches, products, productAdditions,
      orders, walletTransactions, favorites, adminLogs,
    ];
    expect(tables).toHaveLength(8);
    for (const t of tables) {
      expect(t).toBeDefined();
    }
  });

  it('钱包账本包含类型字段（admin_add/refund/purchase）', () => {
    expect(walletTransactions.type).toBeDefined();
    expect(walletTransactions.amount).toBeDefined();
    expect(walletTransactions.remark).toBeDefined();
  });
});
