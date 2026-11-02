import { useCallback, useEffect, useMemo, useState } from 'react';

import { logError } from '@/utils/logger';

import type { Dispatch, SetStateAction } from 'react';
import type { PickAllState, PickedRows } from '@/features/circuit-nodes/components/nodes-grid';
import type { FilterModel } from '@/features/circuit-nodes/types';

/**
 * A table's ticks, kept with the scope they were made in: every row but those
 * in `flipped` where `all`, else just those. Every row ticked at once is the
 * flag, not a set of every index, however large the population.
 */
export type ScopedTicks = { scope: string; all: boolean; flipped: ReadonlySet<number> };
/** A table's filter, kept with the scope it was made in. */
export type ScopedFilter = { scope: string; model: FilterModel };

type Stored<T> = [T | undefined, Dispatch<SetStateAction<T | undefined>>];

const NO_FLIPS: ReadonlySet<number> = new Set();
const EMPTY_FILTER: FilterModel = {};

/**
 * Ticks and a filter over a table's rows, kept per scope - a circuit's
 * population, a simulation's session - and the rows they leave on show beside
 * the table: the ticked ones, else those the filter keeps.
 */
export function useTableTicks({
  scope,
  ready,
  rowCount,
  getFilteredIndices,
  within = null,
  ticksState,
  filterState,
}: {
  /** Whose ticks and filter these are: another scope starts afresh, and gets its own back. */
  scope: string;
  /** Whether the session can be asked for the filter's rows yet. */
  ready: boolean;
  rowCount: number;
  getFilteredIndices: (filter: FilterModel) => Promise<Uint32Array | null>;
  /** The rows the table lists within the filter's, a flag per row: the raster's window, say. */
  within?: Uint8Array | null;
  /** Where the ticks and the filter are kept, for a host that keeps them past its own life. */
  ticksState?: Stored<ScopedTicks>;
  filterState?: Stored<ScopedFilter>;
}) {
  const ownTicks = useState<ScopedTicks>();
  const ownFilter = useState<ScopedFilter>();
  const [storedTicks, setTicks] = ticksState ?? ownTicks;
  const [storedFilter, setFilter] = filterState ?? ownFilter;

  const filterModel = storedFilter?.scope === scope ? storedFilter.model : EMPTY_FILTER;
  const setFilterModel = useCallback(
    (model: FilterModel) => setFilter({ scope, model }),
    [scope, setFilter]
  );

  // The rows the filter keeps, kept with the filter they answer.
  const [rows, setRows] = useState<{
    scope: string;
    filter: FilterModel;
    indices: Uint32Array | null;
    error: Error | null;
  }>();
  useEffect(() => {
    if (!ready || !scope) return;
    let cancelled = false;
    getFilteredIndices(filterModel).then(
      (indices) => {
        if (!cancelled) setRows({ scope, filter: filterModel, indices, error: null });
      },
      (error: unknown) => {
        if (cancelled) return;
        logError('The table’s filter could not be applied beside it:', error);
        // Every row then, and said so, rather than the last filter's rows left standing.
        setRows({
          scope,
          filter: filterModel,
          indices: null,
          error: error instanceof Error ? error : new Error(String(error)),
        });
      }
    );
    return () => {
      cancelled = true;
    };
  }, [ready, scope, filterModel, getFilteredIndices]);
  const settled = rows?.scope === scope && rows.filter === filterModel ? rows : null;
  /** The filter's rows: null for every row, undefined until they are known. */
  const filterRows = settled ? settled.indices : undefined;

  const ticks = storedTicks?.scope === scope ? storedTicks : null;
  const all = ticks?.all ?? false;
  const flipped = ticks?.flipped ?? NO_FLIPS;
  const ticked = useMemo<PickedRows>(() => {
    let flippedRows = 0;
    for (const row of flipped) if (row < rowCount) flippedRows += 1;
    return {
      has: (row: number) => row < rowCount && all !== flipped.has(row),
      size: all ? rowCount - flippedRows : flippedRows,
    };
  }, [all, flipped, rowCount]);

  const toggleTick = useCallback(
    (row: number) =>
      setTicks((previous) => {
        const current = previous?.scope === scope ? previous : null;
        const next = new Set(current?.flipped ?? NO_FLIPS);
        if (next.has(row)) next.delete(row);
        else next.add(row);
        return { scope, all: current?.all ?? false, flipped: next };
      }),
    [scope, setTicks]
  );

  // The rows the table lists: the filter's, within `within`'s; null for every row.
  const listed = useMemo(() => {
    if (filterRows === undefined || !within) return filterRows;
    if (filterRows) return filterRows.filter((row) => within[row] === 1);
    let count = 0;
    for (let row = 0; row < rowCount; row++) count += within[row] === 1 ? 1 : 0;
    const out = new Uint32Array(count);
    for (let row = 0, k = 0; row < rowCount; row++) if (within[row] === 1) out[k++] = row;
    return out;
  }, [filterRows, within, rowCount]);

  // Whether the tick atop the column holds: walked once per change, not per render.
  const pickAllState = useMemo<PickAllState>(() => {
    if (listed === undefined) return ticked.size === 0 ? 'none' : 'some';
    let count = ticked.size;
    if (listed !== null) {
      count = 0;
      for (const row of listed) count += ticked.has(row) ? 1 : 0;
    }
    const total = listed === null ? rowCount : listed.length;
    return count === 0 ? 'none' : count === total ? 'all' : 'some';
  }, [listed, ticked, rowCount]);
  const toggleTickAll = useCallback(() => {
    if (listed === undefined) return;
    const tick = pickAllState !== 'all';
    setTicks((previous) => {
      // Every row at once is a flag, whatever was ticked before.
      if (listed === null) return { scope, all: tick, flipped: NO_FLIPS };
      const current = previous?.scope === scope ? previous : null;
      const wasAll = current?.all ?? false;
      const next = new Set(current?.flipped ?? NO_FLIPS);
      // A row is ticked where it is flipped from `all`'s.
      for (const row of listed) {
        if (tick !== wasAll) next.add(row);
        else next.delete(row);
      }
      return { scope, all: wasAll, flipped: next };
    });
  }, [listed, pickAllState, scope, setTicks]);
  const clearTicks = useCallback(() => setTicks(undefined), [setTicks]);

  // What a view beside the table shows: the ticked rows, else the filter's;
  // null for every row, undefined until the filter's rows are known.
  const shown = useMemo(() => {
    if (ticked.size === 0) return filterRows;
    if (all && flipped.size === 0) return null;
    return tickedIndices(all, flipped, rowCount);
  }, [ticked, all, flipped, filterRows, rowCount]);

  return {
    filterModel,
    setFilterModel,
    filterRows,
    /** Why the filter's rows could not be found, which leaves every row on show beside the table. */
    filterError: settled?.error ?? null,
    ticked,
    toggleTick,
    pickAll: { state: pickAllState, onToggle: toggleTickAll },
    clearTicks,
    shown,
  };
}

/** The ticked rows in order, without a set of every index where `all`. */
function tickedIndices(all: boolean, flipped: ReadonlySet<number>, rowCount: number) {
  if (!all)
    return Uint32Array.from(flipped)
      .filter((row) => row < rowCount)
      .sort();
  const out = new Uint32Array(rowCount);
  let count = 0;
  for (let row = 0; row < rowCount; row++) if (!flipped.has(row)) out[count++] = row;
  return out.slice(0, count);
}
