# football-prediction-platform（足球预测内容交易平台 V0.2）

本地自托管全栈项目：**React + Vite + TypeScript + Ant Design**（前端）/ **NestJS + TypeScript + JWT + Drizzle ORM**（后端）/ **PostgreSQL**（数据库）。

平台定位：足球相关内容观点交易展示平台。负责用户管理、商品展示、内容交易、权限管理、交易记录；**不负责**比赛预测、内容真伪判断、投注推荐、保证盈利。

## 一、环境要求

- Node.js >= 20
- PostgreSQL >= 14

## 二、准备数据库

1. 建库：
   ```sql
   CREATE DATABASE football_platform;
   ```
2. 启动项目前会自动建表（`backend` 启动时按 `schema.ts` 同步），也可以手动执行：
   ```bash
   psql postgres://postgres:你的密码@localhost:5432/football_platform -f scripts/init.sql
   ```

## 三、配置环境变量

```bash
cp .env.example .env
```
编辑 `.env`，填入 `DATABASE_URL` 与 `JWT_SECRET`。

## 四、初始化管理员

注册页只能注册买家（手机号 + 密码，密码 PBKDF2 哈希存储）。注册一个买家账号后，在数据库把它设为管理员：

```sql
UPDATE users SET role = 'admin' WHERE phone = '你的手机号';
```

## 五、开发模式运行（一条命令）

```bash
npm install
npm run dev
```

- 前端：http://localhost:5173
- 后端 API：http://localhost:3000/api/v1

分进程运行（更稳定）：
```bash
npm run dev:server   # 后端 :3000
npm run dev:client   # 前端 :5173
```

## 六、测试与构建

```bash
npm test       # 后端单元/冒烟测试（vitest）
npm run build  # 前后端生产构建
npm start      # 生产运行（后端 :3000，托管前端产物）
```

## 七、角色与权限

| 角色 | 来源 | 权限 |
| --- | --- | --- |
| buyer | 注册默认 | 浏览商品、购买、查看购买内容、余额、收藏 |
| seller | 管理员指定（不能自行注册） | 创建商品、提交审核、销售记录；同时拥有 buyer 权限 |
| admin | 管理员账号 | 用户管理、指定卖家、商品审核/删除、退款、修改余额、查看日志 |

## 八、V0.2 核心业务规则

- **商品生命周期**：draft → pending_review → online → offline → deleted
- **价格**：创建后固定，不可修改
- **内容**：发布后不可改原内容，可追加补充内容（product_additions）
- **商品删除**：管理员确认 → 软删 → 该商品全部已支付订单自动退款 → 记日志
- **钱包**：账本模式，流水类型 admin_add / refund（增）、purchase（减）
- **订单**：paid / refunded，禁止删除；同一用户同一商品仅可购买一次
- **所有管理操作写入 admin_logs**

## 九、测试账号（本地开发环境示例数据）

| 手机号 | 密码 | 角色 | 备注 |
| --- | --- | --- | --- |
| 13800000001 | abc123 | admin | 管理员（主） |
| 13911112222 | abc12345 | seller | 卖家（密码已被重置） |
| 13933334444 | abc123 | buyer | 买家（余额 100） |
| 13755550001 | abc123 | buyer | 买家（验收时注册） |

> 数据库如被清空，按第四节手动指定一个 admin 即可重新使用。

## 十、API 一览（统一前缀 /api/v1）

```
POST /auth/register            注册（手机号唯一，409 冲突）
POST /auth/login               JWT 登录（7 天有效）
GET  /users/me                 当前用户
GET  /products                 商品列表（仅 online 未删除）
GET  /products/:id             商品详情（购买后才含 content + additions）
GET  /matches                  比赛列表
POST /matches                  创建比赛（幂等）
POST /seller/products          卖家创建商品
POST /seller/products/:id/submit   提交审核
POST /seller/products/:id/additions 追加补充内容
POST /seller/products/:id/offline  卖家下架
GET  /seller/products          卖家商品列表
GET  /seller/orders            卖家销售记录
POST /orders                   购买（余额扣款）
GET  /orders/me                我的订单
GET  /wallet/balance           余额
GET  /wallet/transactions      钱包流水
POST /wallet/admin/adjust      管理员调整余额（admin）
GET  /admin/users              用户列表（admin）
POST /admin/users/:id/freeze|unfreeze|reset-password|set-role  （admin）
GET  /admin/products           商品管理（admin）
POST /admin/products/:id/approve|reject|offline|delete        （admin）
GET  /admin/orders             订单管理（admin）
POST /admin/orders/:id/refund  订单退款（admin）
GET  /admin/logs               操作日志（admin）
```

## 十一、目录结构

```
frontend/       前端 React（pages/components/api/context/hooks/router/utils）
backend/        后端 NestJS（auth/users/matches/products/orders/wallet/seller/admin/logs）
  database/     schema.ts（V0.2 全表：users/matches/products/product_additions/orders/wallet_transactions/favorites/admin_logs）
shared/         前后端共享类型（api.interface.ts）
scripts/init.sql 建表脚本（与 schema.ts 对齐）
```

## 十二、说明

- 平台仅为内容托管展示，不对料的真实性负责；不提供投注功能
- V0.2 明确未实现：AI 预测、自动推荐、胜率统计、评分系统、社区、评论、会员、真实支付
