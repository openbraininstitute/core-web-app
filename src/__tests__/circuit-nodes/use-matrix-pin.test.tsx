import { act, renderHook } from '@testing-library/react';
import { createStore, Provider } from 'jotai';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { useMatrixPin } from '@/features/circuit-nodes/connectivity/use-matrix-pin';

import type { ReactNode } from 'react';
import type { PinnedPathway } from '@/features/circuit-nodes/connectivity/use-matrix-pin';
import type { FilterModel } from '@/features/circuit-nodes/types';

const COLUMN = 'matrix:pathway';
const L5: FilterModel = { mtype: { filterType: 'set', values: ['L5_TPC'] } };
const PINNED: PinnedPathway = {
  pre: Uint32Array.from([0, 1]),
  post: Uint32Array.from([1, 4]),
  square: { matrix: 'm', pre: { start: 0, end: 1 }, post: { start: 1, end: 2 } },
  name: 'A → B',
  matrixCells: null,
};

function pinned(initial: { ready: boolean; scope: string } = { ready: true, scope: 's' }) {
  const setDerivedColumns = vi.fn(async () => {});
  const clearTicks = vi.fn();
  const store = createStore();
  const view = renderHook(
    ({ ready, scope }) => {
      const [filterModel, setFilterModel] = useState<FilterModel>(L5);
      return {
        filterModel,
        setFilterModel,
        pin: useMatrixPin({
          scope,
          ready,
          rowCount: 5,
          filterModel,
          setFilterModel,
          clearTicks,
          setDerivedColumns,
        }),
      };
    },
    {
      initialProps: initial,
      wrapper: ({ children }: { children: ReactNode }) => (
        <Provider store={store}>{children}</Provider>
      ),
    }
  );
  return { ...view, setDerivedColumns, clearTicks };
}

describe('useMatrixPin', () => {
  it('tells each neuron’s part as a column of the session, and filters on it', async () => {
    const { result, setDerivedColumns, clearTicks } = pinned();

    await act(async () => result.current.pin.onPick(PINNED));

    const [owner, [column]] = setDerivedColumns.mock.lastCall as unknown as [
      string,
      { name: string; library: string[]; indices: Uint32Array }[],
    ];
    expect(owner).toBe('matrix-pathway');
    expect(column.name).toBe(COLUMN);
    expect([...column.indices].map((code) => column.library[code])).toEqual([
      'Presynaptic',
      'Both',
      'Outside',
      'Outside',
      'Postsynaptic',
    ]);
    expect(result.current.filterModel).toEqual({
      ...L5,
      [COLUMN]: { filterType: 'set', values: ['Presynaptic', 'Postsynaptic', 'Both'] },
    });
    expect(clearTicks).toHaveBeenCalled();
    expect(result.current.pin.pinned).toBe(PINNED);
    expect(result.current.pin.columns.map((c) => c.name)).toEqual([COLUMN]);
    expect(result.current.pin.key).toBe('m/0-1/1-2');
  });

  it('lets go of the pathway alone, the other filters staying', async () => {
    const { result, setDerivedColumns } = pinned();
    await act(async () => result.current.pin.onPick(PINNED));

    await act(async () => result.current.pin.onPick(null));

    expect(setDerivedColumns).toHaveBeenLastCalledWith('matrix-pathway', []);
    expect(result.current.filterModel).toEqual(L5);
    expect(result.current.pin.pinned).toBeNull();
    expect(result.current.pin.columns).toEqual([]);
    expect(result.current.pin.key).toBe('');
  });

  it('lets go as the filter comes off, by the table’s reset say', async () => {
    const { result, setDerivedColumns } = pinned();
    await act(async () => result.current.pin.onPick(PINNED));

    act(() => result.current.setFilterModel({}));

    expect(setDerivedColumns).toHaveBeenLastCalledWith('matrix-pathway', []);
    expect(result.current.pin.pinned).toBeNull();
    expect(result.current.pin.columns).toEqual([]);
  });

  it('leaves the filter as it was when the session will not take the column', async () => {
    const { result, setDerivedColumns, clearTicks } = pinned();
    setDerivedColumns.mockRejectedValueOnce(new Error('session gone'));

    await act(async () => result.current.pin.onPick(PINNED));

    expect(result.current.filterModel).toBe(L5);
    expect(clearTicks).not.toHaveBeenCalled();
    expect(result.current.pin.pinned).toBeNull();
  });

  it('keeps a filter set while the session was taking the column', async () => {
    const { result, setDerivedColumns } = pinned();
    let taken = () => {};
    setDerivedColumns.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          taken = resolve;
        })
    );
    const L6: FilterModel = { mtype: { filterType: 'set', values: ['L6_BPC'] } };

    act(() => result.current.pin.onPick(PINNED));
    act(() => result.current.setFilterModel(L6));
    await act(async () => taken());

    expect(result.current.filterModel).toEqual({
      ...L6,
      [COLUMN]: { filterType: 'set', values: ['Presynaptic', 'Postsynaptic', 'Both'] },
    });
  });

  it('tells a session opened anew over the same cells, and asks for the rows over it', async () => {
    const { result, rerender, setDerivedColumns } = pinned();
    await act(async () => result.current.pin.onPick(PINNED));
    setDerivedColumns.mockClear();
    const { filterModel } = result.current;

    rerender({ ready: false, scope: 's' });
    await act(async () => rerender({ ready: true, scope: 's' }));

    expect(setDerivedColumns).toHaveBeenCalledTimes(1);
    expect(result.current.filterModel).toEqual(filterModel);
    expect(result.current.filterModel).not.toBe(filterModel);
  });

  it('is not held past its filter: the same filter set by hand brings back no pathway', async () => {
    const { result } = pinned();
    await act(async () => result.current.pin.onPick(PINNED));
    const withPathway = result.current.filterModel;
    act(() => result.current.setFilterModel(L5));

    act(() => result.current.setFilterModel(withPathway));

    expect(result.current.pin.pinned).toBeNull();
    expect(result.current.filterModel).toEqual(L5);
  });

  it('takes its filter off where another table of the same scope lets the pathway go', async () => {
    const setDerivedColumns = vi.fn(async () => {});
    const store = createStore();
    const table = () =>
      renderHook(
        () => {
          const [filterModel, setFilterModel] = useState<FilterModel>(L5);
          const pin = useMatrixPin({
            scope: 's',
            ready: true,
            rowCount: 5,
            filterModel,
            setFilterModel,
            setDerivedColumns,
          });
          return { filterModel, pin };
        },
        {
          wrapper: ({ children }: { children: ReactNode }) => (
            <Provider store={store}>{children}</Provider>
          ),
        }
      ).result;
    const one = table();
    const other = table();
    await act(async () => one.current.pin.onPick(PINNED));
    await act(async () => other.current.pin.onPick(PINNED));

    await act(async () => other.current.pin.onPick(null));

    expect(one.current.pin.pinned).toBeNull();
    expect(one.current.filterModel).toEqual(L5);
  });

  it('is kept with its scope', async () => {
    const { result, rerender } = pinned();
    await act(async () => result.current.pin.onPick(PINNED));

    rerender({ ready: true, scope: 'another' });

    expect(result.current.pin.pinned).toBeNull();
  });
});
