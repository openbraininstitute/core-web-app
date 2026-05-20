import { describe, expect, it } from 'vitest';

import { ensureArray, valuesToEnumTuple } from './array';

describe('ensureArray', () => {
  it('returns [] for undefined input', () => {
    expect(ensureArray({ input: undefined })).toEqual([]);
  });

  it('returns [] for null input', () => {
    expect(ensureArray({ input: null })).toEqual([]);
  });

  it('wraps a single non-array value in an array', () => {
    expect(ensureArray({ input: 'x' })).toEqual(['x']);
  });

  it('passes an existing array through unchanged', () => {
    expect(ensureArray({ input: ['a', 'b'] })).toEqual(['a', 'b']);
  });

  it('returns false when checkNotEmpty is true and resulting array is empty', () => {
    expect(ensureArray({ input: [], checkNotEmpty: true })).toBe(false);
  });

  it('returns true when checkNotEmpty is true and resulting array is non-empty', () => {
    expect(ensureArray({ input: ['a'], checkNotEmpty: true })).toBe(true);
  });

  it('throws when checkNotEmpty + throwIfEmpty are true and result is empty', () => {
    expect(() => ensureArray({ input: [], checkNotEmpty: true, throwIfEmpty: true })).toThrow(
      'Resulting array must not be empty when throwIfEmpty is true.'
    );
  });
});

describe('valuesToEnumTuple', () => {
  it('throws for an empty dictionary', () => {
    expect(() => valuesToEnumTuple({})).toThrow('Enum dictionary cannot be empty');
  });

  it('returns the values as a tuple', () => {
    expect(valuesToEnumTuple({ a: 'A', b: 'B' })).toEqual(['A', 'B']);
  });
});
