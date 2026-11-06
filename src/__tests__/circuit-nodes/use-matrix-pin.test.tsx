import { act, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { createStore, Provider } from 'jotai';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { describe, expect, it, vi } from 'vitest';

import {
  letGoOnBlankClick,
  useMatrixPin,
} from '@/features/circuit-nodes/connectivity/use-matrix-pin';

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
    const { result } = pinned();
    await act(async () => result.current.pin.onPick(PINNED));

    await act(async () => result.current.pin.onPick(null));

    expect(result.current.filterModel).toEqual(L5);
    expect(result.current.pin.pinned).toBeNull();
    expect(result.current.pin.columns).toEqual([]);
    expect(result.current.pin.key).toBe('');
  });

  it('lets go as the filter comes off, by the table’s reset say', async () => {
    const { result } = pinned();
    await act(async () => result.current.pin.onPick(PINNED));

    act(() => result.current.setFilterModel({}));

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

  it('is kept with its scope', async () => {
    const { result, rerender } = pinned();
    await act(async () => result.current.pin.onPick(PINNED));

    rerender({ ready: true, scope: 'another' });

    expect(result.current.pin.pinned).toBeNull();
  });
});

describe('letGoOnBlankClick', () => {
  function pane(pinnedNow: PinnedPathway | null = PINNED) {
    const onPick = vi.fn();
    render(
      // biome-ignore lint/a11y/noStaticElementInteractions: as the panes it is for
      // biome-ignore lint/a11y/useKeyWithClickEvents: as the panes it is for
      <div
        data-testid="pane"
        onClick={(event) => letGoOnBlankClick({ pinned: pinnedNow, onPick }, event)}
      >
        <span>Each row is 40 values</span>
        <button type="button">Group by</button>
        <div role="combobox" aria-controls="menu" aria-expanded="false" tabIndex={0}>
          menu
        </div>
        <div className="modebar">
          <span>zoom in</span>
        </div>
        <svg role="img" aria-label="matrix">
          <rect data-testid="square" className="nsewdrag" />
          <rect data-testid="axis" className="xdrag" />
        </svg>
        {createPortal(<div>an option</div>, document.body)}
      </div>
    );
    return onPick;
  }

  it.each([
    ['the pane', () => screen.getByTestId('pane')],
    ['a note', () => screen.getByText('Each row is 40 values')],
    ['an axis', () => screen.getByTestId('axis')],
  ])('lets go on a click on %s', (_, target) => {
    const onPick = pane();
    fireEvent.click(target());
    expect(onPick).toHaveBeenCalledExactlyOnceWith(null);
  });

  it.each([
    ['a button', () => screen.getByRole('button')],
    ['a menu', () => screen.getByRole('combobox')],
    ['the plot’s buttons', () => screen.getByText('zoom in')],
    ['a square, whose click pins', () => screen.getByTestId('square')],
    ['a menu’s option, out of the pane', () => screen.getByText('an option')],
  ])('keeps it on a click on %s', (_, target) => {
    const onPick = pane();
    fireEvent.click(target());
    expect(onPick).not.toHaveBeenCalled();
  });

  it('keeps text just selected, as a pathway’s name to copy', () => {
    const onPick = pane();
    const note = screen.getByText('Each row is 40 values');
    window.getSelection()?.selectAllChildren(note);
    fireEvent.click(note);
    window.getSelection()?.removeAllRanges();
    expect(onPick).not.toHaveBeenCalled();
  });

  it('does nothing with no pathway pinned', () => {
    const onPick = pane(null);
    fireEvent.click(screen.getByTestId('pane'));
    expect(onPick).not.toHaveBeenCalled();
  });
});
