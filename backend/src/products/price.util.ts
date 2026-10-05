/**
 * 商品价格校验：必须为有限非负数字。
 * - 拦截 NaN（Number('abc')=NaN）、Infinity、负数、空值
 * - 返回规范化后的 number，非法返回 null
 */
export function parseValidPrice(raw: unknown): number | null {
  if (raw === undefined || raw === null || raw === '') {
    return null;
  }
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) {
    return null;
  }
  return n;
}
