import { describe, expect, it } from 'vitest';

import { formatBytes, formatCompactNumber, formatCurrency, formatNumber } from './format';

describe('formatCurrency', () => {
  it('formats USD by default', () => {
    expect(formatCurrency(1234.5)).toBe('$1,234.50');
  });

  it('uppercases the currency code internally and formats EUR', () => {
    expect(formatCurrency(1234, 'eur')).toBe('€1,234.00');
  });

  it('formats zero', () => {
    expect(formatCurrency(0)).toBe('$0.00');
  });
});

describe('formatNumber', () => {
  it('adds en-US thousands separators', () => {
    expect(formatNumber(1234567)).toBe('1,234,567');
  });

  it('formats zero', () => {
    expect(formatNumber(0)).toBe('0');
  });

  it('formats negative numbers', () => {
    expect(formatNumber(-42)).toBe('-42');
  });
});

describe('formatBytes', () => {
  it('returns "0 Bytes" for zero', () => {
    expect(formatBytes(0)).toBe('0 Bytes');
  });

  it('formats exact KB with parseFloat stripping trailing zeros', () => {
    expect(formatBytes(1024)).toBe('1 KB');
  });

  it('formats exact MB', () => {
    expect(formatBytes(1024 * 1024)).toBe('1 MB');
  });

  it('formats non-exact KB with default 2 decimals', () => {
    expect(formatBytes(1500)).toBe('1.46 KB');
  });

  it('respects the decimals argument', () => {
    expect(formatBytes(2048, 0)).toBe('2 KB');
  });

  it('clamps negative decimals to 0', () => {
    expect(formatBytes(2048, -1)).toBe('2 KB');
  });
});

describe('formatCompactNumber', () => {
  it('formats thousands compactly', () => {
    expect(formatCompactNumber(1500)).toBe('1.5K');
  });

  it('formats millions compactly', () => {
    expect(formatCompactNumber(1_500_000)).toBe('1.5M');
  });

  it('formats zero', () => {
    expect(formatCompactNumber(0)).toBe('0');
  });

  it('uses the supplied locale (fr-FR differs from en-US)', () => {
    const en = formatCompactNumber(1500);
    const fr = formatCompactNumber(1500, 'fr-FR');
    expect(fr).not.toBe(en);
  });
});
