/**
 * 商品价格校验：必须为有限数字且不低于最低价 10 元。
 * - 拦截 NaN（Number('abc')=NaN）、Infinity、负数、低于 10、空值
 * - 返回规范化后的 number，非法返回 null
 */
export const MIN_PRICE = 10;

export function parseValidPrice(raw: unknown): number | null {
  if (raw === undefined || raw === null || raw === '') {
    return null;
  }
  const n = Number(raw);
  if (!Number.isFinite(n) || n < MIN_PRICE) {
    return null;
  }
  return n;
}
