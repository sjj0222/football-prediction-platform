import {
  pgTable,
  uuid,
  varchar,
  text,
  numeric,
  timestamp,
  uniqueIndex,
  index,
  foreignKey,
} from 'drizzle-orm/pg-core';

// ===== 卖料平台 V0.2 数据库结构 =====
// users / matches / products / product_additions / orders
// wallet_transactions / favorites / admin_logs
// 认证使用 JWT，不再需要 auth_tokens 表。

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  phone: varchar('phone', { length: 20 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  role: varchar('role', { length: 20 }).notNull().default('buyer'),
  status: varchar('status', { length: 20 }).notNull().default('active'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const matches = pgTable('matches', {
  id: uuid('id').primaryKey().defaultRandom(),
  league: varchar('league', { length: 100 }).notNull().default(''),
  homeTeam: varchar('home_team', { length: 100 }).notNull(),
  awayTeam: varchar('away_team', { length: 100 }).notNull(),
  matchTime: timestamp('match_time', { withTimezone: true }).notNull(),
}, (table) => [
  index('idx_matches_home_team').on(table.homeTeam),
  index('idx_matches_away_team').on(table.awayTeam),
  index('idx_matches_match_time').on(table.matchTime),
]);

export const products = pgTable('products', {
  id: uuid('id').primaryKey().defaultRandom(),
  sellerId: uuid('seller_id').notNull(),
  matchId: uuid('match_id').notNull(),
  title: varchar('title', { length: 200 }).notNull(),
  description: text('description').notNull().default(''),
  content: text('content').notNull().default(''),
  price: numeric('price').notNull().default('0'),
  status: varchar('status', { length: 20 }).notNull().default('draft'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (table) => [
  index('idx_products_seller_id').on(table.sellerId),
  index('idx_products_match_id').on(table.matchId),
  index('idx_products_status').on(table.status),
  foreignKey({
    columns: [table.sellerId],
    foreignColumns: [users.id],
    name: 'products_seller_id_fkey',
  }),
  foreignKey({
    columns: [table.matchId],
    foreignColumns: [matches.id],
    name: 'products_match_id_fkey',
  }),
]);

export const productAdditions = pgTable('product_additions', {
  id: uuid('id').primaryKey().defaultRandom(),
  productId: uuid('product_id').notNull(),
  content: text('content').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('idx_product_additions_product_id').on(table.productId),
  foreignKey({
    columns: [table.productId],
    foreignColumns: [products.id],
    name: 'product_additions_product_id_fkey',
  }).onDelete('cascade'),
]);

export const orders = pgTable('orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  buyerId: uuid('buyer_id').notNull(),
  productId: uuid('product_id').notNull(),
  price: numeric('price').notNull().default('0'),
  status: varchar('status', { length: 20 }).notNull().default('paid'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex('idx_orders_buyer_product').on(table.buyerId, table.productId),
  index('idx_orders_buyer_id').on(table.buyerId),
  index('idx_orders_product_id').on(table.productId),
  foreignKey({
    columns: [table.buyerId],
    foreignColumns: [users.id],
    name: 'orders_buyer_id_fkey',
  }),
  foreignKey({
    columns: [table.productId],
    foreignColumns: [products.id],
    name: 'orders_product_id_fkey',
  }),
]);

export const walletTransactions = pgTable('wallet_transactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  amount: numeric('amount').notNull().default('0'),
  type: varchar('type', { length: 20 }).notNull(),
  remark: varchar('remark', { length: 255 }).notNull().default(''),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('idx_wallet_transactions_user_id').on(table.userId),
  foreignKey({
    columns: [table.userId],
    foreignColumns: [users.id],
    name: 'wallet_transactions_user_id_fkey',
  }).onDelete('cascade'),
]);

export const favorites = pgTable('favorites', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  productId: uuid('product_id').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex('idx_favorites_user_product').on(table.userId, table.productId),
  index('idx_favorites_user_id').on(table.userId),
  foreignKey({
    columns: [table.userId],
    foreignColumns: [users.id],
    name: 'favorites_user_id_fkey',
  }).onDelete('cascade'),
  foreignKey({
    columns: [table.productId],
    foreignColumns: [products.id],
    name: 'favorites_product_id_fkey',
  }).onDelete('cascade'),
]);

export const adminLogs = pgTable('admin_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  adminId: uuid('admin_id').notNull(),
  action: varchar('action', { length: 50 }).notNull(),
  targetType: varchar('target_type', { length: 50 }).notNull().default(''),
  targetId: varchar('target_id', { length: 50 }).notNull().default(''),
  reason: varchar('reason', { length: 500 }).notNull().default(''),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('idx_admin_logs_admin_id').on(table.adminId),
  index('idx_admin_logs_target_type').on(table.targetType),
  index('idx_admin_logs_created_at').on(table.createdAt),
  foreignKey({
    columns: [table.adminId],
    foreignColumns: [users.id],
    name: 'admin_logs_admin_id_fkey',
  }),
]);

// table aliases（兼容现有代码引用）
export const usersTable = users;
export const matchesTable = matches;
export const productsTable = products;
export const productAdditionsTable = productAdditions;
export const ordersTable = orders;
export const walletTransactionsTable = walletTransactions;
export const favoritesTable = favorites;
export const adminLogsTable = adminLogs;
