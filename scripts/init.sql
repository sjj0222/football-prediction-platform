-- 初始化数据库表（在你自己的 PostgreSQL 上执行一次）
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(50) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'buyer',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  anchor_name VARCHAR(100) NOT NULL,
  match_time TIMESTAMPTZ NOT NULL,
  home_team VARCHAR(100) NOT NULL,
  away_team VARCHAR(100) NOT NULL,
  content TEXT NOT NULL,
  price NUMERIC NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'off_sale',
  result VARCHAR(20) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_products_anchor_name ON products(anchor_name);
CREATE INDEX IF NOT EXISTS idx_products_home_team ON products(home_team);
CREATE INDEX IF NOT EXISTS idx_products_away_team ON products(away_team);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_products_match_time ON products(match_time);

CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  product_id UUID NOT NULL REFERENCES products(id),
  price NUMERIC NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'paid',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, product_id)
);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_product_id ON orders(product_id);

CREATE TABLE IF NOT EXISTS auth_tokens (
  token VARCHAR(64) PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_auth_tokens_user_id ON auth_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_tokens_expires_at ON auth_tokens(expires_at);

-- 可选：初始管理员账号（密码 admin123 的 PBKDF2 哈希，与代码一致）
-- 若不需要可注释掉。注册页只能注册买家，管理员需手动插入。
-- INSERT INTO users (username, password_hash, role) VALUES
-- ('admin', 'pbkdf2_sha512$10000$<salt>$<hash>', 'admin');
