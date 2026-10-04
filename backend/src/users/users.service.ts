import { Injectable } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '../database/database.module';
import { eq } from 'drizzle-orm';
import { users } from '@server/database/schema';
import type { UserInfo } from '@shared/api.interface';

@Injectable()
export class UsersService {
  constructor(@Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase) {}

  async getById(userId: string): Promise<UserInfo | null> {
    const rows = await this.db
      .select({ id: users.id, phone: users.phone, role: users.role })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (rows.length === 0) {
      return null;
    }
    return {
      id: rows[0].id,
      phone: rows[0].phone,
      role: rows[0].role as UserInfo['role'],
    };
  }
}
