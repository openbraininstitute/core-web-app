import { describe, expect, it } from 'vitest';

import { compactRecord } from './dictionary';

describe('compactRecord', () => {
  it('returns {} for undefined input', () => {
    expect(compactRecord(undefined)).toEqual({});
  });

  it('returns {} for an empty object', () => {
    expect(compactRecord({})).toEqual({});
  });

  it('strips null, undefined, empty and whitespace-only strings', () => {
    expect(compactRecord({ a: null, b: undefined, c: '', d: '   ', keep: 'value' })).toEqual({
      keep: 'value',
    });
  });

  it('preserves falsy-but-meaningful values like 0 and false', () => {
    expect(compactRecord({ zero: 0, flag: false })).toEqual({ zero: 0, flag: false });
  });

  it('preserves non-empty strings, objects and arrays', () => {
    const nested = { nested: 1 };
    const arr = [1, 2, 3];
    expect(compactRecord({ s: 'value', o: nested, a: arr })).toEqual({
      s: 'value',
      o: nested,
      a: arr,
    });
  });
});
