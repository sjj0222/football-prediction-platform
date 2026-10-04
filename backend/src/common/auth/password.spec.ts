import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from './password';

describe('密码哈希工具', () => {
  it('哈希格式为 pbkdf2_sha512$迭代次数$盐$哈希', () => {
    const h = hashPassword('abc123');
    const parts = h.split('$');
    expect(parts).toHaveLength(4);
    expect(parts[0]).toBe('pbkdf2_sha512');
  });

  it('相同密码两次哈希结果不同（随机盐）', () => {
    const a = hashPassword('abc123');
    const b = hashPassword('abc123');
    expect(a).not.toBe(b);
  });

  it('正确密码验证通过', () => {
    const h = hashPassword('abc123');
    expect(verifyPassword('abc123', h)).toBe(true);
  });

  it('错误密码验证失败', () => {
    const h = hashPassword('abc123');
    expect(verifyPassword('wrong1', h)).toBe(false);
  });

  it('非法格式的存储哈希返回 false', () => {
    expect(verifyPassword('abc123', 'not-a-valid-hash')).toBe(false);
    expect(verifyPassword('abc123', '')).toBe(false);
  });
});
