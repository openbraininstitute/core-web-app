import { describe, expect, it } from 'vitest';

import { accumulateSeenRows } from './bulk-actions';

type Row = { id: string; name: string };

const getRowId = (r: Row) => r.id;
const row = (id: string): Row => ({ id, name: `row-${id}` });

describe('accumulateSeenRows — cross-page selection cache (legacy use-row-selection parity)', () => {
  it('caches the current page rows', () => {
    const cache = accumulateSeenRows(new Map(), [row('a'), row('b')], [], getRowId);
    expect([...cache.keys()]).toEqual(['a', 'b']);
  });

  it('keeps rows selected on a previous page after paginating away', () => {
    const page1 = accumulateSeenRows(new Map(), [row('a'), row('b')], [], getRowId);
    // user selects `a`, then navigates to page 2
    const page2 = accumulateSeenRows(page1, [row('c'), row('d')], ['a'], getRowId);
    expect(page2.get('a')?.name).toBe('row-a');
    expect([...page2.keys()].sort()).toEqual(['a', 'c', 'd']);
  });

  it('prunes rows that are neither selected nor on the current page (bounded memory)', () => {
    const page1 = accumulateSeenRows(new Map(), [row('a'), row('b')], [], getRowId);
    const page2 = accumulateSeenRows(page1, [row('c')], [], getRowId);
    expect([...page2.keys()]).toEqual(['c']);
  });

  it('refreshes a cached row with the latest data when it reappears on a page', () => {
    const stale = new Map([['a', { id: 'a', name: 'stale' }]]);
    const cache = accumulateSeenRows(stale, [row('a')], ['a'], getRowId);
    expect(cache.get('a')?.name).toBe('row-a');
  });
});
