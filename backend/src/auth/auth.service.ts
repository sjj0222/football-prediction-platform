import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '../database/database.module';
import { eq } from 'drizzle-orm';
import { users } from '@server/database/schema';
import { hashPassword, verifyPassword } from '@server/common/auth/password';
import type { UserInfo } from '@shared/api.interface';
import type { RegisterDto } from './dto/register.dto';
import type { LoginDto } from './dto/login.dto';

interface JwtPayload {
  sub: string;
  role: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
    private readonly jwtService: JwtService,
  ) {}

  // ========== 工具 ==========

  private toUserInfo(row: { id: string; phone: string; role: string }): UserInfo {
    return { id: row.id, phone: row.phone, role: row.role as UserInfo['role'] };
  }

  private isUserActive(status: string | null | undefined): boolean {
    return status === null || status === undefined || status === 'active';
  }

  // ========== 注册 ==========

  async register(dto: RegisterDto): Promise<UserInfo> {
    const phone = dto.phone.trim();
    const passwordHash = hashPassword(dto.password);

    try {
      const result = await this.db
        .insert(users)
        .values({
          phone,
          passwordHash,
          role: 'buyer',
          status: 'active',
        })
        .returning({ id: users.id, phone: users.phone, role: users.role });

      this.logger.log(`用户注册成功: ${phone}`);
      return this.toUserInfo(result[0]);
    } catch (error: unknown) {
      let code: string | undefined;
      let current: unknown = error;
      for (let depth = 0; depth < 4 && current && typeof current === 'object'; depth += 1) {
        const { code: c, cause } = current as { code?: unknown; cause?: unknown };
        if (typeof c === 'string') {
          code = c;
          break;
        }
        current = cause;
      }
      if (code === '23505') {
        throw new ConflictException('手机号已注册');
      }
      this.logger.error(`注册失败: ${JSON.stringify(error)}`);
      throw new BadRequestException('注册失败');
    }
  }

  // ========== 登录 ==========

  async login(dto: LoginDto): Promise<{ user: UserInfo; token: string }> {
    const phone = dto.phone.trim();

    // 1. 查找用户
    const rows = await this.db
      .select({
        id: users.id,
        phone: users.phone,
        passwordHash: users.passwordHash,
        role: users.role,
        status: users.status,
      })
      .from(users)
      .where(eq(users.phone, phone))
      .limit(1);

    if (rows.length === 0) {
      throw new UnauthorizedException('手机号或密码错误');
    }

    const user = rows[0];

    // 2. 校验账号状态（冻结用户禁止登录）
    if (!this.isUserActive(user.status)) {
      throw new UnauthorizedException('账号已被冻结，请联系管理员');
    }

    // 3. 校验密码
    const passwordOk = verifyPassword(dto.password, user.passwordHash);
    if (!passwordOk) {
      throw new UnauthorizedException('手机号或密码错误');
    }

    // 4. 签发 JWT
    const payload: JwtPayload = { sub: user.id, role: user.role };
    const token = await this.jwtService.signAsync(payload);

    this.logger.log(`用户登录成功: ${user.phone}`);
    return {
      user: this.toUserInfo(user),
      token,
    };
  }

  // ========== 用户信息 ==========

  async getUserById(userId: string): Promise<UserInfo | null> {
    const rows = await this.db
      .select({ id: users.id, phone: users.phone, role: users.role, status: users.status })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (rows.length === 0) {
      return null;
    }
    // 冻结用户：即使持有未过期 token 也视为未认证（即时失效）
    if (!this.isUserActive(rows[0].status)) {
      return null;
    }
    return this.toUserInfo(rows[0]);
  }

  // ========== Token 校验（供 Guard 使用） ==========

  async validateToken(token: string): Promise<UserInfo | null> {
    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(token);
    } catch {
      return null;
    }
    // 直接查库获取最新用户信息（角色变更、账号状态变化即时生效）
    return this.getUserById(payload.sub);
  }
}
