import { pbkdf2Sync, randomBytes, createHash } from 'crypto';

const PBKDF2_ITERATIONS = 10000;
const PBKDF2_SALT_BYTES = 16;
const PBKDF2_HASH_BYTES = 64;
const PBKDF2_ALGORITHM = 'pbkdf2_sha512';

export function hashPassword(password: string): string {
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

export function verifyPassword(password: string, storedHash: string): boolean {
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
