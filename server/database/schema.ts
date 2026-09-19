import {
  pgTable,
  uuid,
  varchar,
  text,
  numeric,
  timestamp,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';

// 业务表（去平台化后的独立版本）：
// users / products / orders / auth_tokens
// 不再使用平台特有的 user_profile、file_attachment 等自定义类型。

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  username: varchar('username', { length: 50 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  role: varchar('role', { length: 20 }).notNull().default('buyer'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const products = pgTable('products', {
  id: uuid('id').primaryKey().defaultRandom(),
  anchorName: varchar('anchor_name', { length: 100 }).notNull(),
  matchTime: timestamp('match_time', { withTimezone: true }).notNull(),
  homeTeam: varchar('home_team', { length: 100 }).notNull(),
  awayTeam: varchar('away_team', { length: 100 }).notNull(),
  content: text('content').notNull(),
  price: numeric('price').notNull().default('0'),
  status: varchar('status', { length: 20 }).notNull().default('off_sale'),
  result: varchar('result', { length: 20 }).notNull().default('pending'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('idx_products_anchor_name').on(table.anchorName),
  index('idx_products_home_team').on(table.homeTeam),
  index('idx_products_away_team').on(table.awayTeam),
  index('idx_products_status').on(table.status),
  index('idx_products_match_time').on(table.matchTime),
]);

export const orders = pgTable('orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  productId: uuid('product_id').notNull(),
  price: numeric('price').notNull().default('0'),
  status: varchar('status', { length: 20 }).notNull().default('paid'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex('idx_orders_user_product').on(table.userId, table.productId),
  index('idx_orders_user_id').on(table.userId),
  index('idx_orders_product_id').on(table.productId),
]);

export const authTokens = pgTable('auth_tokens', {
  token: varchar('token', { length: 64 }).primaryKey(),
  userId: uuid('user_id').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
}, (table) => [
  index('idx_auth_tokens_user_id').on(table.userId),
  index('idx_auth_tokens_expires_at').on(table.expiresAt),
]);

// table aliases
export const authTokensTable = authTokens;
export const ordersTable = orders;
export const productsTable = products;
export const usersTable = users;
