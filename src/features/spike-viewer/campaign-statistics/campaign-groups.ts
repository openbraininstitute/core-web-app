'use client';

import { useEffect, useMemo, useState } from 'react';

import { compareGroupNames } from '@/features/spike-viewer/spike-statistics/statistics';

import type { ColumnMeta, ColumnValues } from '@/features/circuit-nodes/types';

/** The cells one of the campaign's plots sums up, a flag per node index; null for all of them. */
export type CampaignGroup = { name: string; cells: Uint8Array | null };

/** Group by nothing: one plot, of the cells the table picks. */
export const NO_GROUPING = '__none__';
/** Past this many values a property is closer to an id than a group. */
const MAX_GROUPS = 80;

/** The node properties worth grouping the campaign's plots by: categorical, with a manageable number of values. */
export function campaignGroupingColumns(columns: readonly ColumnMeta[] | undefined): ColumnMeta[] {
  return (columns ?? []).filter(
    (c) =>
      c.kind === 'categorical' &&
      (c.library?.length ?? 0) > 1 &&
      (c.library?.length ?? 0) <= MAX_GROUPS
  );
}

/**
 * The cells the table picks split by a node property, a plot each, in the
 * order the statistics' groups go: one group of them all with no property, and
 * null while the property's values are on their way.
 */
export function useCampaignGroups({
  groupBy,
  getColumn,
  sessionKey,
  cells,
  rowCount,
}: {
  groupBy: string;
  getColumn: ((name: string) => Promise<ColumnValues>) | undefined;
  /** What the column read is tagged with, so a population's is not read against another's. */
  sessionKey: string;
  cells: Uint8Array | null;
  rowCount: number;
}): readonly CampaignGroup[] | null {
  const key = `${sessionKey}\n${groupBy}`;
  const [column, setColumn] = useState<{ key: string; values: ColumnValues }>();
  useEffect(() => {
    if (groupBy === NO_GROUPING || !getColumn) return;
    let cancelled = false;
    getColumn(groupBy)
      .then((values) => {
        if (!cancelled) setColumn({ key, values });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [groupBy, getColumn, key]);

  const values = column?.key === key ? column.values : null;
  return useMemo(() => {
    if (groupBy === NO_GROUPING) return [{ name: 'All', cells }];
    if (!values || values.kind !== 'categorical') return null;
    const flags = values.library.map(() => new Uint8Array(rowCount));
    const counts = values.library.map(() => 0);
    for (let node = 0; node < rowCount; node++) {
      if (cells && !cells[node]) continue;
      const group = values.indices[node];
      if (group === undefined || group >= flags.length) continue;
      flags[group][node] = 1;
      counts[group] += 1;
    }
    return values.library
      .map((name, group) => ({ name, cells: flags[group], count: counts[group] }))
      .filter((group) => group.count > 0)
      .sort((a, b) => compareGroupNames(a.name, b.name))
      .map(({ name, cells: members }) => ({ name, cells: members }));
  }, [groupBy, values, cells, rowCount]);
}
