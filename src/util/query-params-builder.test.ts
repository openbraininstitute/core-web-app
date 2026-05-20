import { describe, expect, it } from 'vitest';

import buildQueryString from './query-params-builder';

describe('buildQueryString', () => {
  it('encodes a single string param', () => {
    expect(buildQueryString({ key: 'value' })).toBe('key=value');
  });

  it('coerces numbers and booleans to strings', () => {
    expect(buildQueryString({ n: 42, b: true })).toBe('n=42&b=true');
  });

  it('omits undefined values', () => {
    expect(buildQueryString({ a: '1', b: undefined })).toBe('a=1');
  });

  it('returns an empty string for an empty object', () => {
    expect(buildQueryString({})).toBe('');
  });

  it('joins multiple keys with &', () => {
    expect(buildQueryString({ a: '1', b: '2', c: '3' })).toBe('a=1&b=2&c=3');
  });

  // Behavioral lock-in: this function double-encodes values.
  // encodeURIComponent('a b') -> 'a%20b', then URLSearchParams.append
  // percent-encodes the '%' again -> 'a%2520b'. This test pins down the
  // current behavior; whether it is desired is a separate question.
  it('double-encodes space (current behavior, possibly a bug)', () => {
    expect(buildQueryString({ q: 'a b' })).toBe('q=a%2520b');
  });
});
