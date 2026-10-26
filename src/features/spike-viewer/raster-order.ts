'use client';

import { atom, useAtom } from 'jotai';
import { useEffect, useMemo, useState } from 'react';

import { useNodesWorker } from '@/features/circuit-nodes/hooks/use-nodes-worker';
import { NEURON_HEADING } from '@/features/circuit-nodes/types';
import {
  compareGroupNames,
  computeSpikeStatistics,
  SPIKE_STATISTICS,
  statisticLabel,
} from '@/features/spike-viewer/spike-statistics/statistics';

import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import type { ColumnValues, ParsedCircuitConfig } from '@/features/circuit-nodes/types';
import type { RowOrder } from '@/features/spike-viewer/renderer/raster-renderer';
import type { SpikePopulation } from '@/features/spike-viewer/spike-trace';

const NODE_ID_ORDER = '__node_id__';
const STATISTIC_ORDER = 'spikes:';
/** Past this many values a property is a scatter of labels, not groups of rows. */
const MAX_GROUPS = 80;

/** Kept outside the viewer, which another simulation of the campaign mounts anew. */
const rasterOrderAtom = atom<string>(NODE_ID_ORDER);

type Args = {
  circuit: ICircuit | undefined;
  circuitConfig: ParsedCircuitConfig | undefined;
  populationName: string | undefined;
  cellCount: number | undefined;
  /** The population's spikes, for ordering by a statistic of them. */
  recorded: SpikePopulation | undefined;
  timeRange: { min: number; max: number };
};

/**
 * What the raster's rows can be ordered by, and the order picked: node id, a
 * spike statistic, or a property of the node file - grouped where it is
 * categorical, ranked where it is numeric. The file's columns come from the
 * shared nodes session, which colour-by and the table already have open.
 */
export function useRasterOrder({
  circuit,
  circuitConfig,
  populationName,
  cellCount,
  recorded,
  timeRange,
}: Args) {
  const nodePopulation = circuitConfig?.nodes.find((n) => n.name === populationName);
  const { status, columns, getColumn } = useNodesWorker({
    enabled: circuit !== undefined && nodePopulation !== undefined,
    circuitId: circuit?.id ?? '',
    circuitAssetId: circuitConfig?.circuitAssetId ?? '',
    population: nodePopulation,
  });

  // The spikes' statistics under their heading, then the cells' own properties under theirs.
  const options = useMemo(
    () => [
      ...SPIKE_STATISTICS.map((s) => ({
        value: `${STATISTIC_ORDER}${s.key}`,
        label: statisticLabel(s),
        heading: s.heading,
      })),
      { value: NODE_ID_ORDER, label: 'Node id', heading: NEURON_HEADING },
      ...(columns ?? [])
        .filter(
          (c) =>
            (c.kind === 'categorical' &&
              (c.library?.length ?? 0) > 1 &&
              (c.library?.length ?? 0) <= MAX_GROUPS) ||
            (c.kind === 'numeric' && c.name !== 'node_id')
        )
        .map((c) => ({ value: c.name, label: c.label ?? c.name, heading: NEURON_HEADING })),
    ],
    [columns]
  );

  const [chosen, setChosen] = useAtom(rasterOrderAtom);
  // A property this population's file lacks reads as node id, and comes back with one that has it.
  const value = options.some((o) => o.value === chosen) ? chosen : NODE_ID_ORDER;

  const [order, setOrder] = useState<{ key: string; order: RowOrder }>();
  const key = `${populationName}\n${cellCount}\n${value}`;
  useEffect(() => {
    if (value === NODE_ID_ORDER || cellCount === undefined) return;
    const label = options.find((o) => o.value === value)?.label ?? value;
    let cancelled = false;
    (async () => {
      let next: RowOrder | null = null;
      if (value.startsWith(STATISTIC_ORDER)) {
        const statistic = SPIKE_STATISTICS.find((s) => `${STATISTIC_ORDER}${s.key}` === value);
        if (!statistic) return;
        const values = computeSpikeStatistics(recorded, cellCount, timeRange)[statistic.key];
        next = rankedOrder(values, label, statistic.format);
      } else if (status === 'ready') {
        next = orderOf(await getColumn(value), label);
      }
      if (next && !cancelled) setOrder({ key, order: next });
    })().catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [value, cellCount, options, recorded, timeRange, status, getColumn, key]);

  return {
    options,
    value,
    onChange: setChosen,
    order: value !== NODE_ID_ORDER && order?.key === key ? order.order : undefined,
  };
}

function orderOf(column: ColumnValues, label: string): RowOrder | null {
  if (column.kind === 'categorical') return groupedOrder(column.library, column.indices, label);
  if (column.kind === 'numeric') return rankedOrder(column.values, label, formatValue);
  return null;
}

/** Cells in runs by their value's group, in `compareGroupNames` order, by node id within each. */
function groupedOrder(library: string[], indices: Uint32Array, title: string): RowOrder {
  const byName = library.map((_, i) => i).sort((a, b) => compareGroupNames(library[a], library[b]));
  const place = new Uint32Array(library.length);
  byName.forEach((entry, at) => {
    place[entry] = at;
  });
  const counts = new Uint32Array(library.length);
  for (const entry of indices) counts[place[entry]] += 1;
  const starts = new Uint32Array(library.length);
  for (let at = 1; at < library.length; at++) starts[at] = starts[at - 1] + counts[at - 1];

  const rows = new Float32Array(indices.length);
  const next = starts.slice();
  for (let cell = 0; cell < indices.length; cell++) rows[cell] = next[place[indices[cell]]]++;
  const groups = byName
    .map((entry, at) => ({
      label: library[entry],
      start: starts[at],
      end: starts[at] + counts[at],
    }))
    .filter((g) => g.end > g.start);
  return { rows, axis: { title, groups } };
}

/**
 * Cells from the highest value at the top down, as a y axis reads, those
 * without one below them all, node id breaking ties. Rows run down from the
 * top, so the highest value takes the first.
 */
export function rankedOrder(
  values: ArrayLike<number>,
  title: string,
  format: (value: number) => string
): RowOrder {
  const n = values.length;
  const byRow = Uint32Array.from({ length: n }, (_, i) => i).sort((a, b) => {
    const x = values[a];
    const y = values[b];
    const xMissing = Number.isNaN(x);
    const yMissing = Number.isNaN(y);
    if (xMissing || yMissing) return xMissing === yMissing ? a - b : xMissing ? 1 : -1;
    return y - x || a - b;
  });
  const rows = new Float32Array(n);
  byRow.forEach((cell, row) => {
    rows[cell] = row;
  });
  const valueAt = (row: number) => {
    const cell = byRow[Math.min(n - 1, Math.max(0, Math.round(row)))];
    const value = cell === undefined ? Number.NaN : values[cell];
    return Number.isNaN(value) ? '–' : format(value);
  };
  return { rows, axis: { title, valueAt } };
}

function formatValue(value: number): string {
  return Number.isInteger(value) ? value.toLocaleString() : String(Number(value.toPrecision(3)));
}
