import { Inject, Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '../../database/database.module';
import { eq, gt, lt, and } from 'drizzle-orm';
import { authTokens } from '@server/database/schema';

const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const TOKEN_CLEANUP_INTERVAL_MS = 60 * 60 * 1000; // 每小时清理一次

@Injectable()
export class TokenStore implements OnModuleInit {
  private readonly logger = new Logger(TokenStore.name);

  constructor(@Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase) {}

  onModuleInit(): void {
    // 启动定期清理过期 token
    setInterval(() => {
      this.cleanupExpired().catch((err) => {
        this.logger.error(`清理过期 token 失败: ${err}`);
      });
    }, TOKEN_CLEANUP_INTERVAL_MS);
  }

  private async cleanupExpired(): Promise<void> {
    const result = await this.db
      .delete(authTokens)
      .where(lt(authTokens.expiresAt, new Date()))
      .returning({ token: authTokens.token });
    if (result.length > 0) {
      this.logger.log(`已清理 ${result.length} 个过期 token`);
    }
  }

  async set(token: string, userId: string): Promise<void> {
    const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);
    await this.db.insert(authTokens).values({ token, userId, expiresAt });
  }

  async get(token: string): Promise<string | undefined> {
    const rows = await this.db
      .select({ userId: authTokens.userId })
      .from(authTokens)
      .where(and(eq(authTokens.token, token), gt(authTokens.expiresAt, new Date())))
      .limit(1);
    return rows[0]?.userId;
  }

  async delete(token: string): Promise<boolean> {
    const deleted = await this.db
      .delete(authTokens)
      .where(eq(authTokens.token, token))
      .returning({ token: authTokens.token });
    return deleted.length > 0;
  }
}
