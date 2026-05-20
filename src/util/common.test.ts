import { describe, expect, it } from 'vitest';

import { formatNumber, from64, isNumeric, isValidBase64, localCompareString, to64 } from './common';

describe('formatNumber', () => {
  it('rounds to 4 significant digits and adds en-US grouping', () => {
    expect(formatNumber(12345.678)).toBe('12,350');
  });

  it('preserves small numbers below the precision threshold', () => {
    expect(formatNumber(42)).toBe('42');
    expect(formatNumber(3.14)).toBe('3.14');
  });

  it('handles negative numbers', () => {
    expect(formatNumber(-12345.678)).toBe('-12,350');
  });

  it('formats thousands with US-locale commas', () => {
    expect(formatNumber(1000000)).toBe('1,000,000');
  });
});

describe('to64 / from64', () => {
  it('round-trips ASCII strings', () => {
    expect(from64(to64('hello world'))).toBe('hello world');
  });

  it('encodes known ASCII strings to known base64', () => {
    expect(to64('hi')).toBe('aGk=');
  });

  it('decodes known base64 to the original string', () => {
    expect(from64('aGk=')).toBe('hi');
  });
});

describe('isNumeric', () => {
  it('returns true for numeric strings', () => {
    expect(isNumeric('42')).toBe(true);
    expect(isNumeric('-3.14')).toBe(true);
    expect(isNumeric('1e5')).toBe(true);
  });

  it('returns false for empty / whitespace / non-numeric strings', () => {
    expect(isNumeric('')).toBe(false);
    expect(isNumeric('   ')).toBe(false);
    expect(isNumeric('abc')).toBe(false);
  });

  // Behavioral note: the comment in the source claims `Number.isNaN(str)`
  // performs type coercion to catch partially-numeric strings, but
  // Number.isNaN does NOT coerce — it only returns true for the actual NaN
  // value. As a result, `isNumeric('12abc')` returns true because
  // parseFloat('12abc') is 12. This test locks down current (likely buggy)
  // behavior so any fix is intentional.
  it('returns true for partially-numeric strings (current behavior — likely a bug)', () => {
    expect(isNumeric('12abc')).toBe(true);
  });

  it('returns false for non-string inputs (typeof guard)', () => {
    // @ts-expect-error - intentionally testing the typeof guard
    expect(isNumeric(42)).toBe(false);
    // @ts-expect-error - intentionally testing the typeof guard
    expect(isNumeric(null)).toBe(false);
    // @ts-expect-error - intentionally testing the typeof guard
    expect(isNumeric(undefined)).toBe(false);
  });
});

describe('isValidBase64', () => {
  it('returns true for a string produced by to64', () => {
    expect(isValidBase64(to64('hi'))).toBe(true);
  });

  it('returns false for clearly invalid input', () => {
    expect(isValidBase64('!!!')).toBe(false);
  });

  it('never throws', () => {
    expect(() => isValidBase64('not-base64-at-all')).not.toThrow();
  });
});

describe('localCompareString', () => {
  it('returns a negative value when a sorts before b', () => {
    expect(localCompareString('a', 'b')).toBeLessThan(0);
  });

  it('returns zero when strings are equal', () => {
    expect(localCompareString('a', 'a')).toBe(0);
  });

  it('returns a positive value when a sorts after b', () => {
    expect(localCompareString('b', 'a')).toBeGreaterThan(0);
  });
});
