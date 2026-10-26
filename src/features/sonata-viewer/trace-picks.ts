import { atom, useAtom } from 'jotai';
import { useCallback, useMemo } from 'react';

import { TRACE_COLORS } from '@/features/sonata-viewer/constants';
import { compareGroupNames } from '@/features/spike-viewer/spike-statistics/statistics';

import type { PickAllState } from '@/features/circuit-nodes/components/nodes-grid';
import type { ColumnValues } from '@/features/circuit-nodes/types';
import type { PickedTrace, PopulationMetadata } from '@/features/sonata-viewer/types';

/** A cell picked in the table to draw, and its colour slot. */
export type Pick = { nodeId: number; slot: number };

/** A group-by value's traces among those the table keeps, and how many cells they are. */
export type TraceGroup = { name: string; traces: number[]; cells: number };

const NO_PICKS: Pick[] = [];

/**
 * The picks, tagged with the session they are over, outliving the viewer: picking
 * another simulation of the campaign mounts it anew over the same cells.
 */
const picksAtom = atom<{ key: string; cells: Pick[] } | undefined>(undefined);

/** The picks with a cell ticked or unticked: a new pick takes the first slot free, so the others keep theirs. */
export function togglePickIn(cells: readonly Pick[], nodeId: number): Pick[] {
  if (cells.some((c) => c.nodeId === nodeId)) return cells.filter((c) => c.nodeId !== nodeId);
  const taken = new Set(cells.map((c) => c.slot));
  let slot = 0;
  while (taken.has(slot)) slot += 1;
  return [...cells, { nodeId, slot }];
}

/** Every cell of `table` ticked, in node order, each taking the next slot free; or, all ticked, unticked. */
export function togglePicksOf(
  cells: readonly Pick[],
  table: readonly number[],
  allTicked: boolean
): Pick[] {
  const inTable = new Set(table);
  if (allTicked) return cells.filter((c) => !inTable.has(c.nodeId));
  const next = [...cells];
  const have = new Set(next.map((c) => c.nodeId));
  const taken = new Set(next.map((c) => c.slot));
  let slot = 0;
  for (const nodeId of table) {
    if (have.has(nodeId)) continue;
    while (taken.has(slot)) slot += 1;
    taken.add(slot);
    next.push({ nodeId, slot });
  }
  return next;
}

/**
 * The traces the table keeps split by a categorical column, in the statistics'
 * order; null for a column of another kind.
 */
export function traceGroupsOf(
  population: PopulationMetadata,
  values: ColumnValues,
  visibleTraces: readonly number[] | null
): TraceGroup[] | null {
  if (values.kind !== 'categorical') return null;
  const kept = visibleTraces ? new Set(visibleTraces) : null;
  const byName = new Map<string, number[]>();
  population.traces.forEach((trace, traceIndex) => {
    if (kept && !kept.has(traceIndex)) return;
    const name = values.library[values.indices[trace.nodeId]] ?? '';
    const traces = byName.get(name);
    if (traces) traces.push(traceIndex);
    else byName.set(name, [traceIndex]);
  });
  return [...byName]
    .map(([name, traces]) => ({
      name,
      traces,
      cells: new Set(traces.map((t) => population.traces[t].nodeId)).size,
    }))
    .sort((a, b) => compareGroupNames(a.name, b.name));
}

/**
 * A group's picked traces for a plot of its own: a cell keeps its colour where
 * no cell before it in the group wears the same, and the rest take the colours
 * the group leaves free, so its lines differ as far as the colours go round.
 * `nodeOf` names a trace's cell, whose traces share one colour.
 */
export function colourGroupPicks(
  picked: readonly PickedTrace[],
  nodeOf: (trace: PickedTrace) => number
): PickedTrace[] {
  const worn = new Set<number>();
  const slotOf = new Map<number, number>();
  for (const p of picked) {
    const nodeId = nodeOf(p);
    const colour = p.slot % TRACE_COLORS.length;
    if (slotOf.has(nodeId) || worn.has(colour)) continue;
    worn.add(colour);
    slotOf.set(nodeId, p.slot);
  }
  let free = 0;
  return picked.map((p) => {
    const nodeId = nodeOf(p);
    if (!slotOf.has(nodeId)) {
      while (worn.has(free)) free += 1;
      const slot = free < TRACE_COLORS.length ? free : p.slot;
      worn.add(slot % TRACE_COLORS.length);
      slotOf.set(nodeId, slot);
    }
    return { ...p, slot: slotOf.get(nodeId) ?? p.slot };
  });
}

/**
 * The cells picked in the table to draw, for the session `pickKey` names: each
 * with its colour, its traces, the tick atop the tick column over the cells the
 * table keeps, and a way to set them outright, as a trace clicked alone does.
 */
export function useTracePicks({
  pickKey,
  population,
  visibleTraces,
}: {
  pickKey: string;
  population: PopulationMetadata | undefined;
  /** The traces the table's filter keeps; null for all of them. */
  visibleTraces: readonly number[] | null;
}) {
  const [picks, setPicks] = useAtom(picksAtom);
  const pickedCells = picks?.key === pickKey ? picks.cells : NO_PICKS;

  const togglePick = useCallback(
    (nodeId: number) => {
      if (!pickKey) return;
      setPicks((previous) => ({
        key: pickKey,
        cells: togglePickIn(previous?.key === pickKey ? previous.cells : NO_PICKS, nodeId),
      }));
    },
    [pickKey, setPicks]
  );
  const setPickedCells = useCallback(
    (cells: Pick[]) => setPicks({ key: pickKey, cells }),
    [pickKey, setPicks]
  );

  const pickedTraces = useMemo<PickedTrace[]>(() => {
    const traces: PickedTrace[] = [];
    for (const cell of pickedCells) {
      population?.traces.forEach((trace, traceIndex) => {
        if (trace.nodeId === cell.nodeId) traces.push({ traceIndex, slot: cell.slot });
      });
    }
    return traces;
  }, [population, pickedCells]);

  const selectedNodeIds = useMemo<ReadonlySet<number>>(
    () => new Set(pickedCells.map((c) => c.nodeId)),
    [pickedCells]
  );

  // The tick atop the tick column, over the cells the table's filter keeps:
  // ticks every one of them, in node order, or unticks them all.
  const tableCells = useMemo(() => {
    const ids = new Set<number>();
    if (!population) return [];
    if (visibleTraces) for (const t of visibleTraces) ids.add(population.traces[t].nodeId);
    else for (const trace of population.traces) ids.add(trace.nodeId);
    return [...ids].sort((a, b) => a - b);
  }, [population, visibleTraces]);
  const tickedInTable = tableCells.filter((id) => selectedNodeIds.has(id)).length;
  const pickAllState: PickAllState =
    tickedInTable === 0 ? 'none' : tickedInTable === tableCells.length ? 'all' : 'some';
  const togglePickAll = () => {
    if (!pickKey) return;
    setPicks((previous) => ({
      key: pickKey,
      cells: togglePicksOf(
        previous?.key === pickKey ? previous.cells : NO_PICKS,
        tableCells,
        pickAllState === 'all'
      ),
    }));
  };

  return {
    pickedCells,
    pickedTraces,
    selectedNodeIds,
    tableCells,
    togglePick,
    pickAllState,
    togglePickAll,
    setPickedCells,
  };
}
