'use client';

import { Spin } from 'antd';
import { useMemo, useState } from 'react';

import { ReportNodesTable } from '@/features/sonata-viewer/components/report-nodes-table';
import {
  PINNED_SHARE,
  PlotsOverTable,
  pinnedStatisticColumns,
  StatisticsPlots,
  useElementWidth,
} from '@/features/spike-viewer/spike-statistics/statistics-plots';

import type { ComponentProps, ReactNode } from 'react';
import type { QuickFilter } from '@/features/circuit-nodes/components/nodes-grid';
import type { ColumnMeta, ColumnValues } from '@/features/circuit-nodes/types';
import type { CellStatistic } from '@/features/spike-viewer/spike-statistics/statistics';
import type { StatisticValues } from '@/features/spike-viewer/spike-statistics/statistics-plots';

type TableProps = Omit<
  ComponentProps<typeof ReportNodesTable>,
  'pinnedColumns' | 'pinnedVersion' | 'onPinnedResize' | 'quickFilters'
>;

type Props = {
  statistics: readonly CellStatistic[];
  /** The statistics' values once the session holds them as columns; null until then. */
  values: StatisticValues | null;
  /** The cells to plot, by node index; null for every recorded one. */
  cells: Uint32Array | null;
  /** The session's columns, the neuron sets among them: what groups and places the cells. */
  columns: ColumnMeta[] | undefined;
  ready: boolean;
  sessionKey: string;
  getColumn: (name: string) => Promise<ColumnValues>;
  color: string;
  /** The report's span, in ms. */
  spanMs: number;
  /** Said after the plot's controls: how many cells it is over. */
  summary: ReactNode;
  /** The table of the recorded cells, as the viewer drives it. */
  table: TableProps;
  /** Only the table, where the campaign's statistics have the plots' place. */
  tableOnly?: boolean;
};

/**
 * A report's statistics in the results layout's side panel, beside its
 * traces: their distributions over the table of its recorded cells, each
 * cell's statistics pinned to the table's right.
 */
export function ReportStatisticsPanel({
  statistics,
  values,
  cells,
  columns,
  ready,
  sessionKey,
  getColumn,
  color,
  spanMs,
  summary,
  table,
  tableOnly = false,
}: Props) {
  const [tableElement, tableWidth] = useElementWidth<HTMLDivElement>();
  const [chosenShare, setChosenShare] = useState<number | null>(null);
  const pinnedColumns = useMemo(
    () => pinnedStatisticColumns(statistics, tableWidth, chosenShare ?? PINNED_SHARE),
    [statistics, tableWidth, chosenShare]
  );
  // One click to the cells whose voltage crossed the spike threshold at all.
  const quickFilters = useMemo<QuickFilter[] | undefined>(() => {
    const spikes = statistics.find((s) => s.key === 'spikes');
    return spikes
      ? [
          {
            label: 'Spiking neurons',
            title: 'Only the cells whose voltage crossed −20 mV',
            model: { [spikes.column]: { filterType: 'number', type: 'greaterThan', filter: '0' } },
          },
        ]
      : undefined;
  }, [statistics]);

  return (
    <PlotsOverTable
      tableOnly={tableOnly}
      plots={
        <StatisticsPlots
          statistics={statistics}
          values={values}
          cells={cells}
          columns={columns}
          ready={ready}
          sessionKey={sessionKey}
          getColumn={getColumn}
          color={color}
          spanMs={spanMs}
          initialStatistic="mean"
          summary={values && summary}
          hidden={tableOnly}
        />
      }
      table={
        <div ref={tableElement} className="flex h-full min-h-0 flex-col">
          {values ? (
            <ReportNodesTable
              {...table}
              pinnedColumns={pinnedColumns}
              pinnedVersion={values}
              onPinnedResize={(width) => {
                if (tableWidth > 0) setChosenShare(width / tableWidth);
              }}
              quickFilters={quickFilters}
            />
          ) : (
            <div className="flex h-full min-h-0 items-center justify-center">
              <Spin tip="Computing statistics…">
                <div className="size-12" />
              </Spin>
            </div>
          )}
        </div>
      }
    />
  );
}
