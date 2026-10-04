-- 卖料平台 V0.2 数据库初始化脚本（在 PostgreSQL 上执行一次）
-- 结构变更说明：users 由 username 改为 phone；删除 auth_tokens（改用 JWT）；
-- 新增 matches / product_additions / wallet_transactions / favorites / admin_logs。

BEGIN;

-- 清空旧表（V0.1 结构，按依赖顺序）
DROP TABLE IF EXISTS auth_tokens CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- users（buyer / seller / admin）
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone VARCHAR(20) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'buyer',
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- matches（比赛独立保存，多个商品可绑定同一比赛）
CREATE TABLE matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league VARCHAR(100) NOT NULL DEFAULT '',
  home_team VARCHAR(100) NOT NULL,
  away_team VARCHAR(100) NOT NULL,
  match_time TIMESTAMPTZ NOT NULL
);
CREATE INDEX idx_matches_home_team ON matches(home_team);
CREATE INDEX idx_matches_away_team ON matches(away_team);
CREATE INDEX idx_matches_match_time ON matches(match_time);

-- products（draft → pending_review → online → offline → deleted）
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES users(id),
  match_id UUID NOT NULL REFERENCES matches(id),
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  price NUMERIC NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
CREATE INDEX idx_products_seller_id ON products(seller_id);
CREATE INDEX idx_products_match_id ON products(match_id);
CREATE INDEX idx_products_status ON products(status);

-- product_additions（发布后补充内容，原内容禁止修改）
CREATE TABLE product_additions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_product_additions_product_id ON product_additions(product_id);

-- orders（paid / refunded；禁止删除订单）
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id UUID NOT NULL REFERENCES users(id),
  product_id UUID NOT NULL REFERENCES products(id),
  price NUMERIC NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'paid',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_orders_buyer_product UNIQUE (buyer_id, product_id)
);
CREATE INDEX idx_orders_buyer_id ON orders(buyer_id);
CREATE INDEX idx_orders_product_id ON orders(product_id);

-- wallet_transactions（账本模式：admin_add / refund 增加，purchase 减少）
CREATE TABLE wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL DEFAULT 0,
  type VARCHAR(20) NOT NULL,
  remark VARCHAR(255) NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_wallet_transactions_user_id ON wallet_transactions(user_id);

-- favorites（买家收藏）
CREATE TABLE favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_favorites_user_product UNIQUE (user_id, product_id)
);
CREATE INDEX idx_favorites_user_id ON favorites(user_id);

-- admin_logs（所有管理员操作必须记录）
CREATE TABLE admin_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES users(id),
  action VARCHAR(50) NOT NULL,
  target_type VARCHAR(50) NOT NULL DEFAULT '',
  target_id VARCHAR(50) NOT NULL DEFAULT '',
  reason VARCHAR(500) NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_admin_logs_admin_id ON admin_logs(admin_id);
CREATE INDEX idx_admin_logs_target_type ON admin_logs(target_type);
CREATE INDEX idx_admin_logs_created_at ON admin_logs(created_at);

COMMIT;
