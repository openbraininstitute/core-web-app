import { describe, expect, it } from 'vitest';

import { getOrderByField, mergeOrderByWithOverride, normalizeOrderBy } from './types';

describe('normalizeOrderBy', () => {
  it('returns an empty array for nullish and non-string inputs', () => {
    expect(normalizeOrderBy(undefined)).toEqual([]);
    expect(normalizeOrderBy(null)).toEqual([]);
    expect(normalizeOrderBy(0)).toEqual([]);
    expect(normalizeOrderBy(false)).toEqual([]);
    expect(normalizeOrderBy({})).toEqual([]);
  });

  it('returns an empty array for an empty string', () => {
    expect(normalizeOrderBy('')).toEqual([]);
  });

  it('wraps a non-empty string in a singleton array', () => {
    expect(normalizeOrderBy('name')).toEqual(['name']);
    expect(normalizeOrderBy('-createdAt')).toEqual(['-createdAt']);
  });

  it('filters non-string and empty-string array entries while preserving order', () => {
    expect(normalizeOrderBy(['a', 1, null, '', 'b', undefined, 'c'])).toEqual(['a', 'b', 'c']);
  });

  it('returns an empty array for an empty array input', () => {
    expect(normalizeOrderBy([])).toEqual([]);
  });
});

describe('getOrderByField', () => {
  it('strips a leading "+"', () => {
    expect(getOrderByField('+name')).toBe('name');
  });

  it('strips a leading "-"', () => {
    expect(getOrderByField('-name')).toBe('name');
  });

  it('returns the input unchanged when there is no prefix', () => {
    expect(getOrderByField('name')).toBe('name');
  });

  it('only strips a single leading prefix character', () => {
    expect(getOrderByField('--name')).toBe('-name');
    expect(getOrderByField('++name')).toBe('+name');
  });
});

describe('mergeOrderByWithOverride', () => {
  it('returns base verbatim when the user ordering is empty', () => {
    expect(mergeOrderByWithOverride(['name', '-createdAt'], undefined)).toEqual([
      'name',
      '-createdAt',
    ]);
    expect(mergeOrderByWithOverride(['name'], [])).toEqual(['name']);
  });

  it('returns user verbatim when the base ordering is empty', () => {
    expect(mergeOrderByWithOverride(undefined, ['name', '-createdAt'])).toEqual([
      'name',
      '-createdAt',
    ]);
  });

  it('replaces a base entry in place when the user targets the same field', () => {
    expect(mergeOrderByWithOverride(['name', 'createdAt'], ['-name'])).toEqual([
      '-name',
      'createdAt',
    ]);
  });

  it('appends user fields that do not appear in base', () => {
    expect(mergeOrderByWithOverride(['name'], ['-createdAt'])).toEqual(['name', '-createdAt']);
  });

  it('collapses +field and -field for the same field to a single user entry', () => {
    expect(mergeOrderByWithOverride(['+name'], ['-name'])).toEqual(['-name']);
  });

  it('preserves base position when user overrides one field and appends another', () => {
    expect(mergeOrderByWithOverride(['name', 'createdAt'], ['-createdAt', 'updatedAt'])).toEqual([
      'name',
      '-createdAt',
      'updatedAt',
    ]);
  });

  it('normalizes non-string/non-array inputs to empty before merging', () => {
    expect(mergeOrderByWithOverride(null, 'name')).toEqual(['name']);
    expect(mergeOrderByWithOverride('name', null)).toEqual(['name']);
    expect(mergeOrderByWithOverride(null, null)).toEqual([]);
  });
});
