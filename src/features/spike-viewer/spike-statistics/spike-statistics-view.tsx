'use client';

import { Empty, Spin } from 'antd';
import { atom, useAtom, useAtomValue } from 'jotai';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

import {
  KeptNodesGrid,
  KeptNodesGridPlaceholder,
} from '@/features/circuit-nodes/components/kept-nodes-grid';
import { nodesSessionKey, useNodesWorker } from '@/features/circuit-nodes/hooks/use-nodes-worker';
import { useNeuronSetColumns } from '@/features/spike-viewer/neuron-set-columns';
import { cachedSpikePca } from '@/features/spike-viewer/spike-statistics/pca';
import { pcaFigure } from '@/features/spike-viewer/spike-statistics/pca-figure';
import {
  PcaControls,
  PcaPointsControl,
  PcaSpreadControl,
  PsthControls,
  pcaBinAtom,
  pcaPointsAtom,
  pcaSpreadAtom,
  psthOptionsAtom,
} from '@/features/spike-viewer/spike-statistics/plot-controls';
import {
  computeSpikeStatistics,
  SPIKE_STATISTICS,
} from '@/features/spike-viewer/spike-statistics/statistics';
import {
  PlotsOverTable,
  pinnedStatisticColumns,
  StatisticsPlots,
} from '@/features/spike-viewer/spike-statistics/statistics-plots';
import { psthFigure } from '@/features/spike-viewer/spike-statistics/time-course-figures';
import { WindowChip } from '@/features/spike-viewer/spike-statistics/window-chip';
import { spikesBetween } from '@/features/spike-viewer/spike-trace';

import type { IDatasource } from 'ag-grid-community';
import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import type { QuickFilter } from '@/features/circuit-nodes/components/nodes-grid';
import type { FilterModel, ParsedCircuitConfig, SortItem } from '@/features/circuit-nodes/types';
import type { TimeCursor } from '@/features/sonata-viewer/time-cursor';
import type { TimelineEvent } from '@/features/spike-viewer/config-timeline';
import type { SpikeStatistics } from '@/features/spike-viewer/spike-statistics/statistics';
import type {
  CellPlot,
  TimeCourse,
} from '@/features/spike-viewer/spike-statistics/statistics-plots';
import type { SpikePopulation } from '@/features/spike-viewer/spike-trace';

const EMPTY_FILTER: FilterModel = {};

type Props = {
  circuit: ICircuit;
  circuitConfig: ParsedCircuitConfig | undefined;
  populationName: string | undefined;
  /** The population's spikes; undefined when it recorded none. */
  recorded: SpikePopulation | undefined;
  /** The run's span, in ms, which the rates are over. */
  timeRange: { min: number; max: number };
  color: string;
  /** Only the table, where something else - the campaign's statistics - has the plots' place, or they are out of view. */
  tableOnly?: boolean;
  /**
   * Where the plots go when the host lays them out apart from the table, as
   * the results layout's panel does; only the table renders in place then.
   */
  plotsTarget?: HTMLElement | null;
  /**
   * The cells a raster and replay beside the table should show, by node index,
   * once worked out: the ticked rows, else those the filter keeps; null for all.
   */
  onShownCellsChange?: (cells: Uint32Array | null) => void;
  /** Told the node index of the table row under the pointer, and null when it leaves. */
  onHoveredCellChange?: (cell: number | null) => void;
  /** A cell to bring into view in the table, such as one clicked in the scene; a new key asks again. */
  focusedCell?: { nodeId: number; key: number };
  /** The cell clicked in the scene or the raster, whose row stays marked until it is let go. */
  heldCell?: number | null;
  /** The span of time the raster is zoomed to, which the statistics are then over; null for the run. */
  windowTime?: [number, number] | null;
  /** The cells of the rows the raster is zoomed to, a flag per node index, which the table keeps. */
  windowCells?: Uint8Array | null;
  /** Zooms the raster back out, for the table's own way back to everything. */
  onClearWindow?: () => void;
  /** A reset asked for from outside the table, such as the 3D view's: a new number each time. */
  resetRequest?: number;
  /** The config's timings and the player's time, marked over the PSTHs as over the raster. */
  events?: readonly TimelineEvent[];
  timeCursor?: TimeCursor;
};

/** The raster window's cells, as a column of the session's, filtered on out of sight. */
const WINDOW_COLUMN = 'raster:window';
const IN_WINDOW: FilterModel = {
  [WINDOW_COLUMN]: { filterType: 'number', type: 'equals', filter: '1' },
};

const NO_TICKS: ReadonlySet<number> = new Set();

/** The statistics, held against the table's right edge. */
const PINNED_COLUMNS = pinnedStatisticColumns(SPIKE_STATISTICS);

/** One click to the cells that fired at all. */
const SPIKING_FILTER: readonly QuickFilter[] = [
  {
    label: 'Spiking',
    title: 'Only the cells with at least one spike',
    model: {
      [SPIKE_STATISTICS.find((s) => s.key === 'count')?.column ?? 'spikes:count']: {
        filterType: 'number',
        type: 'greaterThan',
        filter: '0',
      },
    },
  },
];

/**
 * The ticks and the filter outlive the view, tagged with their session: picking
 * another simulation of the campaign mounts it anew over the same cells.
 */
const ticksAtom = atom<{ session: string; cells: ReadonlySet<number> } | undefined>(undefined);
const filterAtom = atom<{ session: string; model: FilterModel } | undefined>(undefined);

/**
 * A population's spiking, cell by cell: distributions grouped by a node
 * property, and the nodes table with each cell's statistics pinned to its
 * right half.
 *
 * The statistics go into the nodes session as columns of its own, so they sort,
 * filter and page like the file's, and the plot reads the same filters: narrow
 * the table to one layer and the violins are that layer's.
 */
export function SpikeStatisticsView({
  circuit,
  circuitConfig,
  populationName,
  recorded,
  timeRange,
  color,
  tableOnly = false,
  plotsTarget,
  onShownCellsChange,
  onHoveredCellChange,
  focusedCell,
  heldCell = null,
  windowTime = null,
  windowCells = null,
  onClearWindow,
  resetRequest,
  events,
  timeCursor,
}: Props) {
  const nodePopulation = circuitConfig?.nodes.find((n) => n.name === populationName);
  // What everything read from the session is tagged with, so nothing a previous
  // population left behind - a column, a filter, its rows - is read against this one.
  const sessionKey = nodePopulation
    ? nodesSessionKey(circuit.id, circuitConfig?.circuitAssetId ?? '', nodePopulation.name)
    : '';
  const {
    status,
    rowCount,
    filteredCount,
    columns,
    datasource,
    error,
    getColumn,
    setDerivedColumns,
    getFilteredIndices,
    getRowIndex,
  } = useNodesWorker({
    enabled: nodePopulation !== undefined,
    circuitId: circuit.id,
    circuitAssetId: circuitConfig?.circuitAssetId ?? '',
    population: nodePopulation,
  });
  const ready = status === 'ready';

  // Over the raster's span of time where it is zoomed to one, else the run's.
  const statistics = useMemo(() => {
    if (!ready) return null;
    if (!windowTime) return computeSpikeStatistics(recorded, rowCount, timeRange);
    const [from, to] = windowTime;
    const inWindow = recorded && spikesBetween(recorded, from, to);
    return computeSpikeStatistics(inWindow, rowCount, { min: from, max: to });
  }, [ready, recorded, rowCount, timeRange, windowTime]);

  // The window's cells in the session, so the table can page only them.
  const [windowRegistered, setWindowRegistered] = useState<Uint8Array | null>(null);
  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    const derived = windowCells
      ? [
          {
            name: WINDOW_COLUMN,
            values: Float64Array.from(windowCells, (inside) => (inside ? 1 : Number.NaN)),
          },
        ]
      : [];
    setDerivedColumns('raster-window', derived)
      .then(() => {
        if (!cancelled) setWindowRegistered(windowCells);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [ready, windowCells, setDerivedColumns]);
  const windowReady = windowCells !== null && windowRegistered === windowCells;
  const windowCount = useMemo(
    () => (windowCells ? windowCells.reduce((n, inside) => n + inside, 0) : 0),
    [windowCells]
  );
  // Where a cell falls among the rows the window leaves the table, not among them all.
  const rowInWindow = useCallback(
    (nodeId: number, sort: SortItem[], filter: FilterModel) =>
      getRowIndex(nodeId, sort, { ...filter, ...IN_WINDOW }),
    [getRowIndex]
  );
  const tableSource = useMemo<IDatasource | null>(() => {
    if (!datasource || !windowReady) return datasource;
    return {
      rowCount: windowCount,
      getRows: (params) =>
        datasource.getRows({
          ...params,
          filterModel: { ...(params.filterModel ?? {}), ...IN_WINDOW },
        }),
    };
  }, [datasource, windowReady, windowCount]);

  // Handed over as copies: the transfer detaches them, and the plot reads these.
  const [registered, setRegistered] = useState<SpikeStatistics | null>(null);
  useEffect(() => {
    if (!statistics) return;
    let cancelled = false;
    setDerivedColumns(
      'spike-statistics',
      SPIKE_STATISTICS.map((s) => ({ name: s.column, values: statistics[s.key].slice() }))
    )
      .then(() => {
        if (!cancelled) setRegistered(statistics);
      })
      // The session closed underneath; its next ready state sets them again.
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [statistics, setDerivedColumns]);
  const statsReady = statistics !== null && registered === statistics;

  // The table moves to a new raster window in one step, its rows and their
  // statistics together. The two are registered apart, and a table showing
  // the window's rows with the run's statistics, or the table from before
  // while they were worked out, read as its values flicking back. Until both
  // are in, the last settled table stands; only a session's first load waits
  // on the table kept from the view before.
  const settled =
    statsReady && registered !== null && tableSource !== null && (!windowCells || windowReady);
  const [shownTable, setShownTable] = useState<{
    session: string;
    source: IDatasource;
    rowCount: number;
    version: SpikeStatistics;
    windowed: boolean;
  }>();
  useEffect(() => {
    if (!settled || !registered || !tableSource) return;
    setShownTable({
      session: sessionKey,
      source: tableSource,
      rowCount: windowReady ? windowCount : rowCount,
      version: registered,
      windowed: windowReady,
    });
  }, [settled, registered, tableSource, sessionKey, windowReady, windowCount, rowCount]);
  const tableShown = shownTable?.session === sessionKey ? shownTable : null;

  // The config's neuron sets as columns of their own, ahead of the file's, so
  // they list right after its preferred ones, and offered to group by.
  const neuronSetColumns = useNeuronSetColumns({
    ready,
    sessionKey,
    population: nodePopulation?.name,
    rowCount,
    columns,
    getFilteredIndices,
    setDerivedColumns,
  });
  const tableColumns = useMemo(
    () => (columns && neuronSetColumns.length > 0 ? [...neuronSetColumns, ...columns] : columns),
    [columns, neuronSetColumns]
  );

  // A new population gets a new grid, whose filters start empty; so does this.
  // The same cells again, in another simulation, get theirs back.
  const [filter, setFilter] = useAtom(filterAtom);
  const filterModel = filter?.session === sessionKey ? filter.model : EMPTY_FILTER;
  const [rows, setRows] = useState<{
    session: string;
    filter: FilterModel;
    indices: Uint32Array | null;
  }>();
  useEffect(() => {
    if (!statsReady) return;
    let cancelled = false;
    getFilteredIndices(filterModel)
      .then((indices) => {
        if (!cancelled) setRows({ session: sessionKey, filter: filterModel, indices });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [statsReady, filterModel, getFilteredIndices, sessionKey]);
  const currentRows = rows?.session === sessionKey && rows.filter === filterModel ? rows : null;

  // Ticked rows, as in the voltage viewer's table: a click ticks a row or
  // unticks it, and the tick atop the column takes every row the filter keeps.
  const [ticks, setTicks] = useAtom(ticksAtom);
  const ticked = ticks?.session === sessionKey ? ticks.cells : NO_TICKS;
  const toggleTick = useCallback(
    (nodeId: number) => {
      setTicks((previous) => {
        const cells = new Set(previous?.session === sessionKey ? previous.cells : NO_TICKS);
        if (cells.has(nodeId)) cells.delete(nodeId);
        else cells.add(nodeId);
        return { session: sessionKey, cells };
      });
    },
    [sessionKey, setTicks]
  );
  // The rows the table shows: the filter's, within the raster window's cells.
  const tableRows = useMemo(() => {
    if (!currentRows) return undefined;
    if (!windowCells) return currentRows.indices;
    const source = currentRows.indices ?? Uint32Array.from({ length: rowCount }, (_, i) => i);
    return source.filter((cell) => windowCells[cell] === 1);
  }, [currentRows, windowCells, rowCount]);
  let tickedInTable = 0;
  if (tableRows) for (const row of tableRows) tickedInTable += ticked.has(row) ? 1 : 0;
  else for (const cell of ticked) tickedInTable += cell < rowCount ? 1 : 0;
  const rowsInTable = tableRows ? tableRows.length : rowCount;
  const tickAllState =
    tickedInTable === 0 ? 'none' : tickedInTable === rowsInTable ? 'all' : 'some';
  const toggleTickAll = () => {
    setTicks((previous) => {
      const cells = new Set(previous?.session === sessionKey ? previous.cells : NO_TICKS);
      const every = tableRows ?? Array.from({ length: rowCount }, (_, i) => i);
      if (tickAllState === 'all') for (const row of every) cells.delete(row);
      else for (const row of every) cells.add(row);
      return { session: sessionKey, cells };
    });
  };

  // What a raster and replay beside the table show: the ticked cells, else the
  // filter's. Only settled rows: between a filter and its rows, the last stands.
  const cellsOnShow = useMemo(() => {
    if (ticked.size > 0) return Uint32Array.from([...ticked].sort((a, b) => a - b));
    return currentRows ? currentRows.indices : undefined;
  }, [ticked, currentRows]);
  useEffect(() => {
    if (cellsOnShow !== undefined) onShownCellsChange?.(cellsOnShow);
  }, [cellsOnShow, onShownCellsChange]);

  // The plots are over the same cells as the raster and replay - the ticked
  // ones, else those the filter keeps - within the raster window's.
  const plotCells = useMemo(() => {
    if (cellsOnShow === undefined || !windowCells) return cellsOnShow;
    const source = cellsOnShow ?? Uint32Array.from({ length: rowCount }, (_, i) => i);
    return source.filter((cell) => windowCells[cell] === 1);
  }, [cellsOnShow, windowCells, rowCount]);

  // Shown at first: each group's firing over time, over the raster's window where there is one.
  const psth = useAtomValue(psthOptionsAtom);
  const timeCourse = useMemo<TimeCourse>(
    () => ({
      label: 'PSTHs',
      figure: (groups, groupLabel) =>
        psthFigure(
          groups,
          recorded,
          windowTime ?? [timeRange.min, timeRange.max],
          rowCount,
          groupLabel,
          color,
          psth
        ),
      controls: <PsthControls />,
      events,
      timeCursor,
    }),
    [recorded, windowTime, timeRange, rowCount, color, psth, events, timeCursor]
  );

  // The cells' firing over time as points, placed by its principal components:
  // one analysis over every cell on show, coloured and grouped without changing it.
  const pcaBin = useAtomValue(pcaBinAtom);
  const pcaSpread = useAtomValue(pcaSpreadAtom);
  const pcaPoints = useAtomValue(pcaPointsAtom);
  const cellPlots = useMemo<CellPlot[]>(() => {
    const span: [number, number] = windowTime ?? [timeRange.min, timeRange.max];
    const pca = (components: 2 | 3): CellPlot => ({
      value: `pca${components}d`,
      label: `${components}D PCA`,
      figure: ({ cells, ...split }) => {
        const found = cachedSpikePca(recorded, cells, rowCount, span, pcaBin, components);
        const options = { ...split, spread: pcaSpread, points: pcaPoints };
        return found && pcaFigure(found, rowCount, options, color);
      },
      colourBy: true,
      // Grouped, the colours are the cells', so they go with them.
      coloursWhenGrouped: pcaPoints,
      controls: <PcaControls />,
      groupControls: (
        <>
          <PcaSpreadControl threeD={components === 3} />
          <PcaPointsControl />
        </>
      ),
      empty: `Too few cells or bins with spikes for ${components} components`,
    });
    return [pca(2), pca(3)];
  }, [recorded, windowTime, timeRange, rowCount, color, pcaBin, pcaSpread, pcaPoints]);

  if (!circuitConfig) {
    return (
      <KeptNodesGridPlaceholder
        fallback={
          <Centered>
            <Empty description="Reading the circuit’s node populations…" />
          </Centered>
        }
      />
    );
  }
  if (!nodePopulation) {
    return (
      <Centered>
        <Empty
          description={`This circuit has no nodes for “${populationName}”, so there are no cells to list.`}
        />
      </Centered>
    );
  }

  const shownCells = plotCells ? plotCells.length : rowCount;
  const windowOn = windowTime !== null || windowCells !== null;

  const summary = statsReady && (
    <span className="whitespace-nowrap text-xs text-neutral-400">
      {shownCells.toLocaleString()} {shownCells === 1 ? 'cell' : 'cells'}
      {ticked.size > 0
        ? ' ticked'
        : currentRows?.indices
          ? ' in the table’s filter'
          : windowCells
            ? ' in the raster window'
            : ''}
    </span>
  );

  const table = (
    <div className="flex h-full min-h-0 flex-col">
      {error ? (
        <Centered>
          <Empty description={`The nodes could not be read: ${error.message}`} />
        </Centered>
      ) : !tableShown || !columns ? (
        // The table kept from the view before, over the same cells, until this one's is ready.
        <KeptNodesGridPlaceholder
          session={sessionKey}
          fallback={
            <Centered>
              <Spin tip={ready ? 'Computing statistics…' : 'Loading nodes…'}>
                <div className="size-12" />
              </Spin>
            </Centered>
          }
        />
      ) : (
        <KeptNodesGrid
          session={sessionKey}
          filterScope="spikes"
          columns={tableColumns ?? columns}
          rowCount={tableShown.rowCount}
          filteredCount={Object.keys(filterModel).length > 0 ? filteredCount : null}
          datasource={tableShown.source}
          pinnedColumns={PINNED_COLUMNS}
          pinnedVersion={tableShown.version}
          onFilterModelChange={(model) => setFilter({ session: sessionKey, model })}
          initialFilterModel={filterModel}
          onRowClick={toggleTick}
          selectedNodeIds={ticked}
          pickColumn
          pickAll={{ state: tickAllState, onToggle: toggleTickAll }}
          reset={{
            picked: ticked.size > 0 || windowOn,
            onReset: () => {
              setTicks(undefined);
              if (windowOn) onClearWindow?.();
            },
          }}
          headerExtra={
            windowOn && (
              <WindowChip
                name="Raster window"
                title="The raster's zoom, which the table and statistics follow: click to see everything again"
                time={windowTime}
                cells={windowCells ? windowCount : null}
                onClear={onClearWindow}
              />
            )
          }
          onRowHover={onHoveredCellChange}
          quickFilters={SPIKING_FILTER}
          focusRow={focusedCell}
          rowIndexOf={tableShown.windowed ? rowInWindow : getRowIndex}
          markedNodeId={heldCell}
          resetRequest={resetRequest}
        />
      )}
    </div>
  );

  const plots = (
    <StatisticsPlots
      statistics={SPIKE_STATISTICS}
      values={statsReady ? registered : null}
      cells={plotCells}
      columns={tableColumns}
      ready={ready}
      sessionKey={sessionKey}
      getColumn={getColumn}
      color={color}
      spanMs={windowTime ? windowTime[1] - windowTime[0] : timeRange.max - timeRange.min}
      initialStatistic="rate"
      summary={summary}
      hidden={tableOnly}
      timeCourse={timeCourse}
      cellPlots={cellPlots}
    />
  );
  if (plotsTarget !== undefined) {
    return (
      <>
        {table}
        {plotsTarget && createPortal(plots, plotsTarget)}
      </>
    );
  }
  // One tree either way, the plots only left out: rebuilt elsewhere, the table
  // would lose its filters and its measured width.
  return <PlotsOverTable tableOnly={tableOnly} table={table} plots={plots} />;
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="flex h-full min-h-0 items-center justify-center">{children}</div>;
}
