import { Global, Module } from '@nestjs/common';
import { drizzle } from 'drizzle-orm/postgres-js';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

// 自托管的数据库提供者：用 postgres-js + drizzle 直连你自己的 PostgreSQL。
// 通过环境变量 DATABASE_URL 连接，例如：
// postgres://user:password@localhost:5432/football_platform

export const DRIZZLE_DATABASE = Symbol('DRIZZLE_DATABASE');

// 重新导出类型，业务 service 统一从这里取，不再依赖平台包。
export type { PostgresJsDatabase };

@Global()
@Module({
  providers: [
    {
      provide: DRIZZLE_DATABASE,
      useFactory: (): PostgresJsDatabase => {
        const url = process.env.DATABASE_URL;
        if (!url) {
          throw new Error('缺少环境变量 DATABASE_URL，请配置 PostgreSQL 连接串');
        }
        const client = postgres(url, { max: 10 });
        return drizzle(client);
      },
    },
  ],
  exports: [DRIZZLE_DATABASE],
})
export class DatabaseModule {}
