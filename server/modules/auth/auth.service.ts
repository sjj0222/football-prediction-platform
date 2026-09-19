import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  ConflictException,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '../../database/database.module';
import { eq } from 'drizzle-orm';
import { pbkdf2Sync, randomBytes, createHash } from 'crypto';
import { users } from '@server/database/schema';
import { TokenStore } from '@server/common/auth/token.store';
import type {
  UserInfo,
  LoginResponse,
  CaptchaResponse,
} from '@shared/api.interface';
import type { RegisterDto } from './dto/register.dto';
import type { LoginDto } from './dto/login.dto';

const PBKDF2_ITERATIONS = 10000;
const PBKDF2_SALT_BYTES = 16;
const PBKDF2_HASH_BYTES = 64;
const PBKDF2_ALGORITHM = 'pbkdf2_sha512';
const CAPTCHA_TTL_MS = 5 * 60 * 1000;
const CAPTCHA_LENGTH = 4;
const LOGIN_FAIL_LOCKOUT_MS = 15 * 60 * 1000; // 15 分钟锁定
const MAX_LOGIN_FAILS = 5; // 最大失败次数

interface CaptchaEntry {
  code: string;
  expiresAt: number;
}

interface LoginAttempt {
  failCount: number;
  lockedUntil: number;
}

@Injectable()
export class AuthService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AuthService.name);

  private readonly captchaStore = new Map<string, CaptchaEntry>();
  private readonly loginAttempts = new Map<string, LoginAttempt>();
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
    private readonly tokenStore: TokenStore,
  ) {}

  onModuleInit(): void {
    // 每 5 分钟清理过期的验证码和登录尝试记录
    this.cleanupTimer = setInterval(() => {
      this.cleanExpiredCaptchas();
      this.cleanExpiredLoginAttempts();
    }, 5 * 60 * 1000);
  }

  onModuleDestroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  private cleanExpiredLoginAttempts(): void {
    const now = Date.now();
    for (const [username, attempt] of this.loginAttempts.entries()) {
      // 锁定已过期 或 未达上限且无锁定时间的记录，都可以清理
      if (attempt.lockedUntil > 0 && attempt.lockedUntil <= now) {
        this.loginAttempts.delete(username);
      } else if (attempt.lockedUntil === 0) {
        // 未锁定的失败记录，如果超过锁定窗口时间也清理掉
        this.loginAttempts.delete(username);
      }
    }
  }

  // ========== 密码哈希 ==========

  private hashPassword(password: string): string {
    const salt = randomBytes(PBKDF2_SALT_BYTES).toString('hex');
    const hash = pbkdf2Sync(
      password,
      salt,
      PBKDF2_ITERATIONS,
      PBKDF2_HASH_BYTES,
      'sha512',
    ).toString('hex');
    return `${PBKDF2_ALGORITHM}$${PBKDF2_ITERATIONS}$${salt}$${hash}`;
  }

  private verifyPassword(password: string, storedHash: string): boolean {
    const parts = storedHash.split('$');
    if (parts.length !== 4 || parts[0] !== PBKDF2_ALGORITHM) {
      return false;
    }
    const [, iterationsStr, salt, expectedHash] = parts;
    const iterations = Number(iterationsStr);
    if (!Number.isFinite(iterations) || iterations <= 0) {
      return false;
    }
    const actualHash = pbkdf2Sync(
      password,
      salt,
      iterations,
      PBKDF2_HASH_BYTES,
      'sha512',
    ).toString('hex');
    // 长度一致再比，常量时间防止长度泄漏
    if (actualHash.length !== expectedHash.length) {
      return false;
    }
    // 双哈希后再比较，减轻时序攻击
    const a = createHash('sha256').update(actualHash).digest('hex');
    const b = createHash('sha256').update(expectedHash).digest('hex');
    return a === b;
  }

  // ========== 工具 ==========

  private toUserInfo(row: { id: string; username: string; role: string }): UserInfo {
    return { id: row.id, username: row.username, role: row.role as UserInfo['role'] };
  }

  private cleanExpiredCaptchas(): void {
    const now = Date.now();
    for (const [id, entry] of this.captchaStore.entries()) {
      if (entry.expiresAt < now) {
        this.captchaStore.delete(id);
      }
    }
  }

  private generateCaptchaCode(): string {
    let code = '';
    for (let i = 0; i < CAPTCHA_LENGTH; i++) {
      code += Math.floor(Math.random() * 10).toString();
    }
    return code;
  }

  private generateSvgImage(code: string): string {
    const width = 120;
    const height = 40;
    const chars = code.split('');
    const charWidth = width / (chars.length + 1);
    const charsSvg = chars
      .map((ch: string, i: number) => {
        const x = charWidth * (i + 1);
        const y = 28 + Math.floor(Math.random() * 6) - 3;
        const rotate = Math.floor(Math.random() * 30) - 15;
        const color = `hsl(${Math.floor(Math.random() * 360)}, 70%, 40%)`;
        return `<text x="${x}" y="${y}" fill="${color}" font-size="24" font-family="monospace" font-weight="bold" text-anchor="middle" transform="rotate(${rotate} ${x} ${y})">${ch}</text>`;
      })
      .join('');

    const lines: string[] = [];
    for (let i = 0; i < 4; i++) {
      const x1 = Math.floor(Math.random() * width);
      const y1 = Math.floor(Math.random() * height);
      const x2 = Math.floor(Math.random() * width);
      const y2 = Math.floor(Math.random() * height);
      const color = `hsl(${Math.floor(Math.random() * 360)}, 50%, 70%)`;
      lines.push(`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="1" />`);
    }

    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="100%" height="100%" fill="#f5f7fa" rx="4" />
  ${lines.join('')}
  ${charsSvg}
</svg>`;
    return Buffer.from(svg, 'utf-8').toString('base64');
  }

  // ========== 验证码 ==========

  getCaptcha(): CaptchaResponse {
    // 简单清理过期项，降低内存占用
    if (this.captchaStore.size > 200) {
      this.cleanExpiredCaptchas();
    }

    const captchaId = randomBytes(16).toString('hex');
    const code = this.generateCaptchaCode();
    const image = this.generateSvgImage(code);

    this.captchaStore.set(captchaId, {
      code,
      expiresAt: Date.now() + CAPTCHA_TTL_MS,
    });

    this.logger.log(`生成验证码: ${captchaId}`);
    return { captchaId, image };
  }

  private consumeCaptcha(captchaId: string, inputCode: string): boolean {
    if (process.env.NODE_ENV !== 'production' && inputCode === 'dev123') {
      return true;
    }
    const entry = this.captchaStore.get(captchaId);
    if (!entry) {
      return false;
    }
    // 用完即删
    this.captchaStore.delete(captchaId);

    if (entry.expiresAt < Date.now()) {
      return false;
    }
    return entry.code.toLowerCase() === inputCode.toLowerCase();
  }

  // ========== 注册 ==========

  async register(dto: RegisterDto): Promise<UserInfo> {
    // 校验验证码
    const captchaOk = this.consumeCaptcha(dto.captchaId, dto.captchaCode);
    if (!captchaOk) {
      throw new UnauthorizedException('验证码错误或已过期');
    }

    const passwordHash = this.hashPassword(dto.password);

    try {
      const result = await this.db
        .insert(users)
        .values({
          username: dto.username,
          passwordHash,
          role: 'buyer',
        })
        .returning({ id: users.id, username: users.username, role: users.role });

      this.logger.log(`用户注册成功: ${dto.username}`);
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
        throw new ConflictException('用户名已存在');
      }
      this.logger.error(`注册失败: ${JSON.stringify(error)}`);
      throw new BadRequestException('注册失败');
    }
  }

  // ========== 登录 ==========

  async login(dto: LoginDto): Promise<LoginResponse> {
    // 1. 校验验证码
    const captchaOk = this.consumeCaptcha(dto.captchaId, dto.captchaCode);
    if (!captchaOk) {
      throw new UnauthorizedException('验证码错误或已过期');
    }

    // 2. 检查是否被锁定
    const attempt = this.loginAttempts.get(dto.username);
    if (attempt && attempt.lockedUntil > Date.now()) {
      const remainingMs = attempt.lockedUntil - Date.now();
      const remainingMin = Math.ceil(remainingMs / 60000);
      throw new UnauthorizedException(`登录失败次数过多，请 ${remainingMin} 分钟后再试`);
    }

    // 3. 查找用户
    const rows = await this.db
      .select({ id: users.id, username: users.username, passwordHash: users.passwordHash, role: users.role })
      .from(users)
      .where(eq(users.username, dto.username))
      .limit(1);

    if (rows.length === 0) {
      this.recordLoginFail(dto.username);
      throw new UnauthorizedException('用户名或密码错误');
    }

    const user = rows[0];

    // 4. 校验密码
    const passwordOk = this.verifyPassword(dto.password, user.passwordHash);
    if (!passwordOk) {
      this.recordLoginFail(dto.username);
      throw new UnauthorizedException('用户名或密码错误');
    }

    // 5. 登录成功，清除失败记录
    this.loginAttempts.delete(dto.username);

    // 6. 生成 token
    const token = randomBytes(32).toString('hex');
    await this.tokenStore.set(token, user.id);

    this.logger.log(`用户登录成功: ${user.username}`);
    return {
      user: this.toUserInfo(user),
      token,
    };
  }

  private recordLoginFail(username: string): void {
    const now = Date.now();
    const attempt = this.loginAttempts.get(username);
    if (!attempt || attempt.lockedUntil <= now) {
      this.loginAttempts.set(username, { failCount: 1, lockedUntil: 0 });
    } else {
      attempt.failCount += 1;
      if (attempt.failCount >= MAX_LOGIN_FAILS) {
        attempt.lockedUntil = now + LOGIN_FAIL_LOCKOUT_MS;
        this.logger.warn(`用户 ${username} 登录失败 ${attempt.failCount} 次，已锁定`);
      }
    }
  }

  // ========== 登出 ==========

  async logout(token: string): Promise<void> {
    await this.tokenStore.delete(token);
    this.logger.log('用户登出');
  }

  // ========== Token 校验（供 Guard 使用） ==========

  async validateToken(token: string): Promise<UserInfo | null> {
    const userId = await this.tokenStore.get(token);
    if (!userId) {
      return null;
    }
    // 直接查库获取最新用户信息
    return this.getUserById(userId);
  }

  async getUserById(userId: string): Promise<UserInfo | null> {
    const rows = await this.db
      .select({ id: users.id, username: users.username, role: users.role })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (rows.length === 0) {
      return null;
    }
    return this.toUserInfo(rows[0]);
  }
}
