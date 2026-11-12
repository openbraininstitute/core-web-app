import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useTableTicks } from '@/features/circuit-nodes/hooks/use-table-ticks';

import type { FilterModel } from '@/features/circuit-nodes/types';

const L5: FilterModel = { mtype: { filterType: 'set', values: ['L5_TPC'] } };

function ticks(rows: () => Uint32Array) {
  const getFilteredIndices = vi.fn(async () => rows());
  return renderHook(() =>
    useTableTicks({ scope: 'session', ready: true, rowCount: 5, getFilteredIndices })
  );
}

describe('useTableTicks', () => {
  it('keeps the rows on show when a filter comes back unchanged', async () => {
    const { result } = ticks(() => Uint32Array.from([1, 3]));
    await waitFor(() => expect(result.current.shown).toEqual(Uint32Array.from([1, 3])));
    const first = result.current.shown;

    // the table handing its filter back, as a new object with the same rows
    act(() => result.current.setFilterModel({ ...L5 }));
    await waitFor(() => expect(result.current.filterModel).toEqual(L5));
    await waitFor(() => expect(result.current.shown).toBeDefined());

    expect(result.current.shown).toBe(first);
  });

  it('hands over other rows as they come', async () => {
    let rows = Uint32Array.from([1, 3]);
    const { result } = ticks(() => rows);
    await waitFor(() => expect(result.current.shown).toEqual(Uint32Array.from([1, 3])));

    rows = Uint32Array.from([2]);
    act(() => result.current.setFilterModel(L5));

    await waitFor(() => expect(result.current.shown).toEqual(Uint32Array.from([2])));
  });
});
