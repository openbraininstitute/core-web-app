'use client';

import { Spin } from 'antd';
import { useMemo } from 'react';
import { createPortal } from 'react-dom';

import { KeptNodesGridPlaceholder } from '@/features/circuit-nodes/components/kept-nodes-grid';
import { ReportNodesTable } from '@/features/sonata-viewer/components/report-nodes-table';
import {
  PlotsOverTable,
  pinnedStatisticColumns,
  StatisticsPlots,
} from '@/features/spike-viewer/spike-statistics/statistics-plots';

import type { ComponentProps, ReactNode } from 'react';
import type { ColumnMeta, ColumnValues } from '@/features/circuit-nodes/types';
import type { CellStatistic } from '@/features/spike-viewer/spike-statistics/statistics';
import type {
  StatisticValues,
  TimeCourse,
} from '@/features/spike-viewer/spike-statistics/statistics-plots';

type TableProps = Omit<ComponentProps<typeof ReportNodesTable>, 'pinnedColumns' | 'pinnedVersion'>;

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
  /** Only the table, where the campaign's statistics have the plots' place, or they are out of view. */
  tableOnly?: boolean;
  /**
   * Where the plots go when the host lays them out apart from the table, as
   * the results layout's panel does; only the table renders in place then.
   */
  plotsTarget?: HTMLElement | null;
  /** The plot over time shown at first: the cells' mean. */
  timeCourse?: TimeCourse;
};

/**
 * A report's statistics: their distributions, and the table of its recorded
 * cells with each cell's statistics pinned to its right, the plots over the
 * table or wherever the host puts them.
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
  plotsTarget,
  timeCourse,
}: Props) {
  const pinnedColumns = useMemo(() => pinnedStatisticColumns(statistics), [statistics]);

  const plots = (
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
      // The cells' voltages by property first; their mean over time is a pick away.
      initialPlot="violins"
      summary={values && summary}
      hidden={tableOnly}
      timeCourse={timeCourse}
    />
  );
  const tableView = (
    <div className="flex h-full min-h-0 flex-col">
      {values ? (
        <ReportNodesTable {...table} pinnedColumns={pinnedColumns} pinnedVersion={values} />
      ) : (
        // The table kept from the view before, over the same cells, until the statistics are in.
        <KeptNodesGridPlaceholder
          session={sessionKey}
          fallback={
            <div className="flex h-full min-h-0 items-center justify-center">
              <Spin tip="Computing statistics…">
                <div className="size-12" />
              </Spin>
            </div>
          }
        />
      )}
    </div>
  );
  if (plotsTarget !== undefined) {
    return (
      <>
        {tableView}
        {plotsTarget && createPortal(plots, plotsTarget)}
      </>
    );
  }
  return <PlotsOverTable tableOnly={tableOnly} plots={plots} table={tableView} />;
}
