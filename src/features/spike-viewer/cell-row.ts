'use client';

import capitalize from 'es-toolkit/compat/capitalize';
import { useEffect, useState } from 'react';

import { nodesWorkerRegistry } from '@/features/circuit-nodes/hooks/nodes-worker-manager';

import type { ColumnMeta } from '@/features/circuit-nodes/types';
import type { CellStatistic } from '@/features/spike-viewer/spike-statistics/statistics';

/** The node file's columns a cell's card names it by, in the table's order. */
const IDENTITY_COLUMNS = ['region', 'layer', 'mtype', 'etype', 'morph_class', 'synapse_class'];
const POSITION_COLUMNS = ['x', 'y', 'z'];

/**
 * Where a cell's card reads its row of the nodes table: the session the table
 * pages, its columns, and the statistics the table pins, which are columns of
 * the session once the table has set them.
 */
export type CellRowSource = {
  session: string;
  columns: readonly ColumnMeta[] | null | undefined;
  statistics?: readonly CellStatistic[];
};

export type CellRow = { label: string; value: string }[];

/**
 * A cell's row of the nodes table, by node id, as a card's rows: what it is,
 * where it is and its statistics. Null while it is read, and for no cell.
 */
export function useCellRow(source: CellRowSource | undefined, nodeId: number | null): CellRow | null {
  const key = source?.session && nodeId !== null ? `${source.session}\n${nodeId}` : '';
  const [read, setRead] = useState<{ key: string; row: CellRow }>();
  useEffect(() => {
    if (!source || !key || nodeId === null) return;
    const names = new Set((source.columns ?? []).map((c) => c.name));
    const identity = IDENTITY_COLUMNS.filter((name) => names.has(name));
    const position = POSITION_COLUMNS.every((name) => names.has(name)) ? POSITION_COLUMNS : [];
    const statistics = source.statistics ?? [];
    let cancelled = false;
    nodesWorkerRegistry
      .getRows(source.session, {
        start: nodeId,
        end: nodeId + 1,
        columns: [...identity, ...position, ...statistics.map((s) => s.column)],
      })
      .then(({ rows: [values] }) => {
        if (cancelled || !values) return;
        const row: CellRow = [];
        for (const name of identity) {
          if (values[name] !== '') {
            row.push({ label: capitalize(name.replace(/_/g, ' ')), value: String(values[name]) });
          }
        }
        if (position.length > 0) {
          row.push({
            label: 'Position (µm)',
            value: position.map((name) => Math.round(Number(values[name]))).join(', '),
          });
        }
        // Statistics the table has not set read as blanks; a cell with none has NaN.
        for (const s of statistics) {
          const value = values[s.column];
          if (typeof value !== 'number' || Number.isNaN(value)) continue;
          row.push({ label: s.label, value: `${s.format(value)}${s.unit ? ` ${s.unit}` : ''}` });
        }
        setRead({ key, row });
      })
      // The session closed underneath; the next hover reads again.
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [source, key, nodeId]);
  return read?.key === key ? read.row : null;
}
