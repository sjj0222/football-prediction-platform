# football-prediction-platform（足球预测内容交易平台）

从妙搭平台移植出来的**自托管版本**，不依赖任何平台私有包。
前端 React + Vite，后端 NestJS，数据库 PostgreSQL（drizzle-orm）。

## 一、环境要求

- Node.js >= 20
- PostgreSQL >= 14

## 二、准备数据库

1. 建库：
   ```sql
   CREATE DATABASE football_platform;
   ```
2. 建表：
   ```bash
   psql postgres://postgres:你的密码@localhost:5432/football_platform -f scripts/init.sql
   ```

## 三、配置环境变量

```bash
cp .env.example .env
```
编辑 `.env`，填入你的 `DATABASE_URL`。

## 四、初始管理员账号

注册页只能注册买家。先在页面注册一个买家账号，然后在数据库把它改成管理员：

```sql
UPDATE users SET role = 'admin' WHERE username = '你的账号名';
```

## 五、开发模式运行

```bash
npm install
npm run dev
```
- 前端：http://localhost:5173
- 后端 API：http://localhost:3000/api

## 六、生产构建与运行

```bash
npm run build
npm start
```
访问 http://localhost:3000。

## 七、说明

- 开发环境验证码输入 `dev123`
- 平台仅为内容托管展示，不对料的真实性负责；不提供投注功能

## 八、目录结构

```
server/          后端 NestJS（auth/products/orders/admin/view）
  database/      schema.ts + 自托管数据库模块
client/          前端 React
shared/          前后端共享类型
scripts/init.sql 建表脚本
```
