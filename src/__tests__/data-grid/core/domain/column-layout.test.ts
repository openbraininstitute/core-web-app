import { describe, expect, it } from 'vitest';

import { reconcileColumnOrder } from '@/features/data-grid/core/domain/column-layout';

/**
 * Pins how a persisted `columnOrder` reconciles with an id it never mentions: the
 * declaration wins.
 */
describe('reconcileColumnOrder', () => {
  it('keeps the declared order when nothing is stored', () => {
    expect(reconcileColumnOrder(['a', 'b', 'c'], undefined)).toEqual(['a', 'b', 'c']);
    expect(reconcileColumnOrder(['a', 'b', 'c'], null)).toEqual(['a', 'b', 'c']);
    expect(reconcileColumnOrder(['a', 'b', 'c'], [])).toEqual(['a', 'b', 'c']);
  });

  it('lets a complete stored order win (the user drag is authoritative)', () => {
    expect(reconcileColumnOrder(['a', 'b', 'c'], ['c', 'a', 'b'])).toEqual(['c', 'a', 'b']);
  });

  // with an index-lookup sort the missing id gets a sentinel and lands last
  it('slots a declared id MISSING from the stored order at its declared position', () => {
    expect(reconcileColumnOrder(['a', 'b', 'c', 'd'], ['a', 'c', 'd'])).toEqual([
      'a',
      'b',
      'c',
      'd',
    ]);
  });

  it('slots a missing LEADING id before its declared right neighbour', () => {
    expect(reconcileColumnOrder(['a', 'b', 'c'], ['b', 'c'])).toEqual(['a', 'b', 'c']);
  });

  it('keeps consecutive missing ids in declaration order', () => {
    expect(reconcileColumnOrder(['a', 'b1', 'b2', 'c'], ['a', 'c'])).toEqual([
      'a',
      'b1',
      'b2',
      'c',
    ]);
  });

  it('anchors a missing id to its neighbour, not to its declared index', () => {
    expect(reconcileColumnOrder(['a', 'b', 'c'], ['c', 'a'])).toEqual(['c', 'a', 'b']);
  });

  it('ignores stored ids that are no longer declared', () => {
    expect(reconcileColumnOrder(['a', 'b'], ['b', 'gone', 'a'])).toEqual(['b', 'a']);
    expect(reconcileColumnOrder([], ['gone'])).toEqual([]);
    expect(reconcileColumnOrder(['a'], ['gone-1', 'gone-2'])).toEqual(['a']);
  });

  it('tolerates duplicates in the stored order', () => {
    expect(reconcileColumnOrder(['a', 'b'], ['b', 'b', 'a'])).toEqual(['b', 'a']);
  });

  it('never invents or drops a declared id', () => {
    const declared = ['a', 'b', 'c', 'd', 'e'];
    const out = reconcileColumnOrder(declared, ['e', 'zzz', 'b']);
    expect([...out].sort()).toEqual([...declared].sort());
  });
});
