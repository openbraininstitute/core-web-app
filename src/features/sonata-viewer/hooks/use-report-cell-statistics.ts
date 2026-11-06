import { useEffect, useState } from 'react';

import { SPIKE_THRESHOLD_MV } from '@/features/sonata-viewer/report-statistics';

import type { Remote } from 'comlink';
import type { DerivedColumn } from '@/features/circuit-nodes/types';
import type { TimeRange } from '@/features/sonata-viewer/hooks/use-plot-listeners';
import type { SonataWorkerImpl } from '@/features/sonata-viewer/worker/sonata-worker';
import type { CellStatistic } from '@/features/spike-viewer/spike-statistics/statistics';
import type { StatisticValues } from '@/features/spike-viewer/spike-statistics/statistics-plots';

/**
 * Each recorded cell's statistics over the traces' time window, worked out on
 * the worker once `enabled` and kept as columns of the nodes session, so the
 * table sorts and filters by them: null until the first are in, and a new
 * window's worked out while the last stand.
 */
export function useReportCellStatistics({
  enabled,
  worker,
  populationName,
  ready,
  rowCount,
  timeWindow,
  voltage,
  statistics,
  setDerivedColumns,
}: {
  enabled: boolean;
  worker: Remote<SonataWorkerImpl>;
  populationName: string | undefined;
  /** The nodes session is open, so its columns can be added to. */
  ready: boolean;
  rowCount: number;
  timeWindow: TimeRange | null;
  /** A voltage report, whose cells' spikes are counted too. */
  voltage: boolean;
  statistics: readonly CellStatistic[];
  setDerivedColumns: (owner: string, columns: DerivedColumn[]) => Promise<void>;
}): StatisticValues | null {
  const [cellStatistics, setCellStatistics] = useState<{
    population: string;
    rows: number;
    window: TimeRange | null;
    values: StatisticValues;
  }>();
  const statisticsKnown =
    cellStatistics?.population === populationName &&
    cellStatistics?.rows === rowCount &&
    cellStatistics?.window === timeWindow;
  useEffect(() => {
    if (!enabled || !populationName || !ready || statisticsKnown) return;
    let cancelled = false;
    worker
      .getCellStatistics(populationName, voltage ? SPIKE_THRESHOLD_MV : null, timeWindow)
      .then((found) => {
        if (cancelled) return;
        // A value per node index, as the session's columns hold them; none where nothing was recorded.
        const perNode = (cellValues: Float64Array) => {
          const values = new Float64Array(rowCount).fill(Number.NaN);
          found.nodeIds.forEach((nodeId, i) => {
            if (nodeId < rowCount) values[nodeId] = cellValues[i];
          });
          return values;
        };
        const values: Record<string, Float64Array> = {
          mean: perNode(found.mean),
          sd: perNode(found.sd),
          min: perNode(found.min),
          max: perNode(found.max),
        };
        if (found.spikes) values.spikes = perNode(found.spikes);
        setCellStatistics({
          population: populationName,
          rows: rowCount,
          window: timeWindow,
          values,
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [enabled, populationName, ready, statisticsKnown, worker, voltage, rowCount, timeWindow]);
  const [registeredStatistics, setRegisteredStatistics] = useState<{
    population: string;
    rows: number;
    values: StatisticValues;
  } | null>(null);
  useEffect(() => {
    if (!statisticsKnown || !cellStatistics || !ready) return;
    const { population: shown, rows, values } = cellStatistics;
    let cancelled = false;
    setDerivedColumns(
      'report-statistics',
      statistics.flatMap((s) => {
        const column = values[s.key];
        return column ? [{ name: s.column, values: column.slice() }] : [];
      })
    )
      .then(() => {
        if (!cancelled) setRegisteredStatistics({ population: shown, rows, values });
      })
      // The session closed underneath; its next ready state sets them again.
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [statisticsKnown, cellStatistics, ready, statistics, setDerivedColumns]);
  // The ones the session holds as columns: a new window's are worked out while the last stand.
  if (!registeredStatistics) return null;
  const { population, rows, values } = registeredStatistics;
  return population === populationName && rows === rowCount ? values : null;
}

/**
 * Each column's statistics over the traces' time window, as {@link useReportCellStatistics}
 * works out each cell's from its first: in a compartment report, each compartment's, by
 * trace. Null until the first are in; a new window's are worked out while the last stand.
 */
export function useReportTraceStatistics({
  enabled,
  worker,
  populationName,
  timeWindow,
  voltage,
}: {
  enabled: boolean;
  worker: Remote<SonataWorkerImpl>;
  populationName: string | undefined;
  timeWindow: TimeRange | null;
  /** A voltage report, whose compartments' spikes are counted too. */
  voltage: boolean;
}): StatisticValues | null {
  const [found, setFound] = useState<{
    population: string;
    window: TimeRange | null;
    values: StatisticValues;
  }>();
  const known = found?.population === populationName && found?.window === timeWindow;
  useEffect(() => {
    if (!enabled || !populationName || known) return;
    let cancelled = false;
    worker
      .getTraceStatistics(populationName, voltage ? SPIKE_THRESHOLD_MV : null, timeWindow)
      .then(({ mean, sd, min, max, spikes }) => {
        if (cancelled) return;
        const values: Record<string, Float64Array> = { mean, sd, min, max };
        if (spikes) values.spikes = spikes;
        setFound({ population: populationName, window: timeWindow, values });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [enabled, populationName, known, worker, voltage, timeWindow]);
  return enabled && found && found.population === populationName ? found.values : null;
}
