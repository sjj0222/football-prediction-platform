import { describe, it, expect } from 'vitest';
import { parseValidPrice } from './price.util';

describe('parseValidPrice 商品价格校验', () => {
  it('合法价格（>=10）通过并规范化', () => {
    expect(parseValidPrice('88')).toBe(88);
    expect(parseValidPrice(88)).toBe(88);
    expect(parseValidPrice('10')).toBe(10);
    expect(parseValidPrice('10.5')).toBe(10.5);
    expect(parseValidPrice('1e3')).toBe(1000);
  });

  it('低于最低价 10 元被拒绝', () => {
    expect(parseValidPrice('0')).toBeNull();
    expect(parseValidPrice('9.9')).toBeNull();
    expect(parseValidPrice(5)).toBeNull();
  });

  it('NaN 与非数字字符串被拒绝', () => {
    expect(parseValidPrice('abc')).toBeNull();
    expect(parseValidPrice('NaN')).toBeNull();
    expect(parseValidPrice('Infinity')).toBeNull();
  });

  it('负数被拒绝', () => {
    expect(parseValidPrice('-1')).toBeNull();
  });

  it('空值与缺失被拒绝', () => {
    expect(parseValidPrice(undefined)).toBeNull();
    expect(parseValidPrice(null)).toBeNull();
    expect(parseValidPrice('')).toBeNull();
  });
});
