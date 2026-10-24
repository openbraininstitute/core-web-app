'use client';

import { Empty, Spin } from 'antd';
import { atom, useAtom } from 'jotai';
import dynamic from 'next/dynamic';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

import { defaultVisibleColumnSet, NodesGrid } from '@/features/circuit-nodes/components/nodes-grid';
import { nodesSessionKey, useNodesWorker } from '@/features/circuit-nodes/hooks/use-nodes-worker';
import { PaneResizeHandle } from '@/features/circuit-viewer/pane-resize-handle';
import { useNeuronSetColumns } from '@/features/spike-viewer/neuron-set-columns';
import {
  densityFigure,
  sankeyFigure,
  scatterFigure,
  violinFigure,
} from '@/features/spike-viewer/spike-statistics/figures';
import {
  computeSpikeStatistics,
  groupValues,
  SPIKE_STATISTICS,
  statisticLabel,
} from '@/features/spike-viewer/spike-statistics/statistics';
import { PillSelect } from '@/ui/molecules/select/pill-select';
import { cn } from '@/utils/css-class';

import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import type { PinnedColumn, QuickFilter } from '@/features/circuit-nodes/components/nodes-grid';
import type {
  ColumnMeta,
  ColumnValues,
  FilterModel,
  ParsedCircuitConfig,
} from '@/features/circuit-nodes/types';
import type { AxisValues, Figure } from '@/features/spike-viewer/spike-statistics/figures';
import type {
  SpikeStatisticKey,
  SpikeStatistics,
} from '@/features/spike-viewer/spike-statistics/statistics';
import type { SpikePopulation } from '@/features/spike-viewer/spike-trace';

// Plotly is megabytes; it loads the first time the panel opens, not with the raster.
const StatisticsPlot = dynamic(
  () => import('@/features/spike-viewer/spike-statistics/statistics-plot'),
  {
    ssr: false,
    loading: () => (
      <Centered>
        <Spin />
      </Centered>
    ),
  }
);

type PlotKind = 'violins' | 'densities' | 'scatter2d' | 'scatter3d' | 'sankey';

const PLOT_KINDS: { value: PlotKind; label: string }[] = [
  { value: 'violins', label: 'Violins' },
  { value: 'densities', label: 'Densities' },
  { value: 'scatter2d', label: '2D scatter' },
  { value: 'scatter3d', label: '3D scatter' },
  { value: 'sankey', label: 'Sankey' },
];

/** A scatter axis naming a statistic rather than a node property. */
const STAT_AXIS = 'stat:';
const AXIS_NAMES = ['X', 'Y', 'Z'];
/** The axes a scatter starts on, where the node file has them: the cells' positions. */
const PREFERRED_AXES = ['x', 'y', 'z'];

const NO_GROUPING = '__none__';

/** Past this many values a property is closer to an id than a group. */
const MAX_GROUPS = 80;

/** The properties a circuit is usually read by, most telling first. */
const PREFERRED_GROUPING = ['mtype', 'layer', 'synapse_class', 'etype', 'region'];

/** Share of the table the statistics take, against its right edge, until their edge is dragged. */
const PINNED_SHARE = 0.5;
/** Room a statistic's column needs for its full label; with less it goes by its short one. */
const PINNED_LABEL_WIDTH = 128;
/**
 * Narrowest a statistic's column goes, short label and all: little enough that
 * their edge drags well over to the right, giving the file's columns the room,
 * at the cost of values cut short there.
 */
const PINNED_MIN_WIDTH = 36;
/** Under this a statistic's values drop to three significant digits, so more of them fit. */
const COMPACT_VALUES_WIDTH = 52;

/** The table's share of the view until its grab bar is dragged. */
const DEFAULT_TABLE_SHARE = 0.6;
const MIN_TABLE_HEIGHT = 160;
/** What the plot keeps above the table: its own floor and the controls over it. */
const MIN_PLOT_HEIGHT = 220;

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
  /** Only the table, where something else - the campaign's statistics - has the plots' place. */
  tableOnly?: boolean;
  /**
   * The cells a raster and replay beside the table should show, by node index,
   * once worked out: the ticked rows, else those the filter keeps; null for all.
   */
  onShownCellsChange?: (cells: Uint32Array | null) => void;
  /** Told the node index of the table row under the pointer, and null when it leaves. */
  onHoveredCellChange?: (cell: number | null) => void;
  /** A cell to bring into view in the table, such as one clicked in the scene; a new key asks again. */
  focusedCell?: { nodeId: number; key: number };
};

const NO_TICKS: ReadonlySet<number> = new Set();

/** One click to the cells that fired at all. */
const SPIKING_FILTER: readonly QuickFilter[] = [
  {
    label: 'Spiking neurons',
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
  onShownCellsChange,
  onHoveredCellChange,
  focusedCell,
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

  const statistics = useMemo(
    () => (ready ? computeSpikeStatistics(recorded, rowCount, timeRange) : null),
    [ready, recorded, rowCount, timeRange]
  );

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

  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(new Set());
  useEffect(() => {
    if (tableColumns) setVisibleColumns(defaultVisibleColumnSet(tableColumns));
  }, [tableColumns]);

  const [statisticKey, setStatisticKey] = useState<SpikeStatisticKey>('rate');
  const statistic = SPIKE_STATISTICS.find((s) => s.key === statisticKey) ?? SPIKE_STATISTICS[0];

  const groupOptions = useMemo(() => groupingColumns(tableColumns), [tableColumns]);
  const [chosenGroupBy, setChosenGroupBy] = useState<string>();
  const groupBy =
    chosenGroupBy === NO_GROUPING || groupOptions.some((c) => c.name === chosenGroupBy)
      ? (chosenGroupBy as string)
      : defaultGrouping(groupOptions);

  const [groupColumn, setGroupColumn] = useState<{
    session: string;
    name: string;
    values: ColumnValues;
  }>();
  useEffect(() => {
    if (!ready || groupBy === NO_GROUPING) return;
    let cancelled = false;
    getColumn(groupBy)
      .then((values) => {
        if (!cancelled) setGroupColumn({ session: sessionKey, name: groupBy, values });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [ready, groupBy, getColumn, sessionKey]);

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
  const tableRows = currentRows?.indices;
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

  // The plots are over the same cells as the raster and replay: the ticked
  // ones, else those the filter keeps.
  const groups = useMemo(() => {
    if (!statsReady || !registered || cellsOnShow === undefined) return null;
    const values = registered[statistic.key];
    if (groupBy === NO_GROUPING) return groupValues(values, null, cellsOnShow);
    if (groupColumn?.session !== sessionKey || groupColumn.name !== groupBy) return null;
    return groupValues(values, groupColumn.values, cellsOnShow);
  }, [statsReady, registered, cellsOnShow, groupBy, groupColumn, statistic, sessionKey]);

  // Which figure: the statistic by group, or the cells themselves placed by
  // chosen columns - any statistic or numeric node property - and coloured by it.
  const [plotKind, setPlotKind] = useState<PlotKind>('violins');
  const scatter = plotKind === 'scatter2d' || plotKind === 'scatter3d';
  const axisOptions = useMemo(() => scatterAxisOptions(columns), [columns]);
  const [chosenAxes, setChosenAxes] = useState<string[]>([]);
  const axes = AXIS_NAMES.slice(0, plotKind === 'scatter3d' ? 3 : 2).map((_, i) =>
    axisOptions.some((o) => o.value === chosenAxes[i]) ? chosenAxes[i] : defaultAxis(axisOptions, i)
  );

  // The node properties on the axes, read from the session as they are chosen.
  const [axisColumns, setAxisColumns] = useState<{
    session: string;
    values: Map<string, ArrayLike<number>>;
  }>();
  const knownAxes = axisColumns?.session === sessionKey ? axisColumns.values : undefined;
  const axisKey = scatter ? axes.join('\n') : '';
  useEffect(() => {
    if (!ready || !axisKey) return;
    const missing = axisKey
      .split('\n')
      .filter((axis) => !axis.startsWith(STAT_AXIS) && !knownAxes?.has(axis));
    if (missing.length === 0) return;
    let cancelled = false;
    Promise.all(missing.map((name) => getColumn(name).then((values) => [name, values] as const)))
      .then((loaded) => {
        if (cancelled) return;
        setAxisColumns((previous) => {
          const values = new Map(previous?.session === sessionKey ? previous.values : undefined);
          // Kept even when it is not a number, so it is not asked for again.
          for (const [name, column] of loaded) {
            values.set(name, column.kind === 'numeric' ? column.values : new Float64Array(0));
          }
          return { session: sessionKey, values };
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [ready, axisKey, knownAxes, getColumn, sessionKey]);

  const binStep = statistic.step?.(timeRange.max - timeRange.min);
  const empty = !scatter && groups?.length === 0;
  const figure = useMemo<Figure | null>(() => {
    if (!statsReady || !registered || cellsOnShow === undefined) return null;
    const valueLabel = statisticLabel(statistic);
    if (scatter) {
      const resolved = axisKey.split('\n').map((axis) => resolveAxis(axis, registered, knownAxes));
      if (resolved.some((axis) => axis === null)) return null;
      return scatterFigure(
        resolved as AxisValues[],
        { label: valueLabel, values: registered[statistic.key] },
        cellsOnShow ?? null,
        `${plotKind}:${axisKey}`
      );
    }
    if (!groups || groups.length === 0) return null;
    // A column a host added, such as a neuron set's, goes by its label.
    const groupLabel =
      groupBy === NO_GROUPING
        ? undefined
        : (groupOptions.find((c) => c.name === groupBy)?.label ?? groupBy);
    if (plotKind === 'densities') {
      return densityFigure(groups, groupLabel, valueLabel, color, binStep, statistic.unit);
    }
    if (plotKind === 'sankey')
      return sankeyFigure(groups, valueLabel, statistic.format, statistic.unit);
    return violinFigure(groups, groupLabel, valueLabel, color, binStep);
  }, [
    statsReady,
    registered,
    cellsOnShow,
    statistic,
    scatter,
    axisKey,
    knownAxes,
    plotKind,
    groups,
    groupBy,
    groupOptions,
    color,
    binStep,
  ]);

  // The statistics share the table's right half between them. Observed once
  // there is a table to measure, which the early return below can hold off.
  const hasNodes = nodePopulation !== undefined;
  const tableRef = useRef<HTMLDivElement>(null);
  const [tableWidth, setTableWidth] = useState(0);
  useLayoutEffect(() => {
    const el = tableRef.current;
    if (!hasNodes || !el) return;
    setTableWidth(el.getBoundingClientRect().width);
    const observer = new ResizeObserver(([entry]) => setTableWidth(entry.contentRect.width));
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNodes]);
  // The plot and the table either side of a grab bar, the table's height measured
  // from the bottom as the raster's is under the replay.
  const rootRef = useRef<HTMLDivElement>(null);
  const [rootHeight, setRootHeight] = useState(0);
  useLayoutEffect(() => {
    const el = rootRef.current;
    if (!hasNodes || !el) return;
    setRootHeight(el.getBoundingClientRect().height);
    const observer = new ResizeObserver(([entry]) => setRootHeight(entry.contentRect.height));
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNodes]);
  const [chosenTableHeight, setChosenTableHeight] = useState<number | null>(null);
  const tableHeight = clampTableHeight(chosenTableHeight, rootHeight);

  const [chosenShare, setChosenShare] = useState<number | null>(null);
  const pinnedShare = chosenShare ?? PINNED_SHARE;
  const pinnedColumns = useMemo<PinnedColumn[]>(() => {
    const share = Math.floor((tableWidth * pinnedShare) / SPIKE_STATISTICS.length);
    const width = Math.max(PINNED_MIN_WIDTH, share);
    const narrow = share < PINNED_LABEL_WIDTH;
    return SPIKE_STATISTICS.map((s) => ({
      name: s.column,
      headerName: narrow ? s.short : statisticLabel(s),
      headerTooltip: narrow ? statisticLabel(s) : undefined,
      width,
      format: width < COMPACT_VALUES_WIDTH ? compactNumber : s.format,
      compact: narrow,
    }));
  }, [tableWidth, pinnedShare]);

  if (!nodePopulation) {
    return (
      <Centered>
        <Empty
          description={
            circuitConfig
              ? `This circuit has no nodes for “${populationName}”, so there are no cells to list.`
              : 'Reading the circuit’s node populations…'
          }
        />
      </Centered>
    );
  }

  const shownCells = cellsOnShow ? cellsOnShow.length : rowCount;

  const controls = (
    <div className="flex shrink-0 flex-wrap items-center gap-2 px-3 pt-3 pb-1">
      <PillSelect
        label="Plot"
        value={plotKind}
        options={PLOT_KINDS}
        onChange={(v) => setPlotKind(v as PlotKind)}
      />
      {scatter &&
        axes.map((axis, i) => (
          <PillSelect
            key={AXIS_NAMES[i]}
            label={AXIS_NAMES[i]}
            value={axis}
            options={axisOptions}
            onChange={(v) => setChosenAxes(axes.map((a, j) => (j === i ? v : a)))}
          />
        ))}
      <PillSelect
        label={scatter ? 'Colour' : 'Statistic'}
        value={statistic.key}
        options={SPIKE_STATISTICS.map((s) => ({ value: s.key, label: statisticLabel(s) }))}
        onChange={(v) => setStatisticKey(v as SpikeStatisticKey)}
      />
      {!scatter && (
        <PillSelect
          label="Group by"
          value={groupBy}
          options={[
            ...groupOptions.map((c) => ({ value: c.name, label: c.label ?? c.name })),
            { value: NO_GROUPING, label: 'None' },
          ]}
          onChange={setChosenGroupBy}
        />
      )}
      {statsReady && (
        <span className="whitespace-nowrap text-xs text-neutral-400">
          {shownCells.toLocaleString()} {shownCells === 1 ? 'cell' : 'cells'}
          {ticked.size > 0 ? ' ticked' : currentRows?.indices ? ' in the table’s filter' : ''}
        </span>
      )}
    </div>
  );

  const plot = (
    <div className="relative min-h-0 flex-1 px-3 pb-3">
      {empty ? (
        <Centered>
          <Empty description={`No cell here has a ${statistic.label.toLowerCase()}`} />
        </Centered>
      ) : figure === null ? (
        <Centered>
          <Spin />
        </Centered>
      ) : (
        <StatisticsPlot figure={figure} />
      )}
    </div>
  );

  const table = (
    <div ref={tableRef} className="flex h-full min-h-0 flex-col pb-3">
      {error ? (
        <Centered>
          <Empty description={`The nodes could not be read: ${error.message}`} />
        </Centered>
      ) : !statsReady || !columns || !datasource ? (
        <Centered>
          <Spin tip={ready ? 'Computing statistics…' : 'Loading nodes…'}>
            <div className="size-12" />
          </Spin>
        </Centered>
      ) : (
        <NodesGrid
          columns={tableColumns ?? columns}
          rowCount={rowCount}
          filteredCount={filteredCount}
          datasource={datasource}
          visibleColumns={visibleColumns}
          onVisibleColumnsChange={setVisibleColumns}
          pinnedColumns={pinnedColumns}
          pinnedVersion={registered}
          onFilterModelChange={(model) => setFilter({ session: sessionKey, model })}
          initialFilterModel={filterModel}
          onPinnedResize={(width) => {
            if (tableWidth > 0) setChosenShare(width / tableWidth);
          }}
          onRowClick={toggleTick}
          selectedNodeIds={ticked}
          pickColumn
          pickAll={{ state: tickAllState, onToggle: toggleTickAll }}
          reset={{ picked: ticked.size > 0, onReset: () => setTicks(undefined) }}
          onRowHover={onHoveredCellChange}
          quickFilters={SPIKING_FILTER}
          focusRow={focusedCell}
          rowIndexOf={getRowIndex}
        />
      )}
    </div>
  );

  // One tree either way, the plots only left out: rebuilt elsewhere, the table
  // would lose its filters and its measured width.
  return (
    <div ref={rootRef} className="flex h-full min-h-0 flex-col">
      {!tableOnly && controls}
      {!tableOnly && plot}
      {/* A margin, so the rule stops short of the sides, as the replay's does. */}
      <div
        className={cn(
          'border-neutral-2 relative mx-3 pt-3',
          tableOnly ? 'min-h-0 flex-1' : 'shrink-0 border-t'
        )}
        style={tableOnly ? undefined : { height: tableHeight }}
      >
        {!tableOnly && (
          <PaneResizeHandle containerRef={rootRef} minHeight={0} onResize={setChosenTableHeight} />
        )}
        {table}
      </div>
    </div>
  );
}

/**
 * Keep the plot and the table usable however far the grab bar is dragged; in a
 * view too short for both floors the bounds cross, and the bar stays live.
 */
function clampTableHeight(chosen: number | null, rootHeight: number): number {
  const preferred = chosen ?? Math.round(rootHeight * DEFAULT_TABLE_SHARE);
  const lo = Math.max(0, Math.min(MIN_TABLE_HEIGHT, rootHeight - MIN_PLOT_HEIGHT));
  const hi = Math.min(rootHeight, Math.max(MIN_TABLE_HEIGHT, rootHeight - MIN_PLOT_HEIGHT));
  return Math.round(Math.min(hi, Math.max(lo, preferred)));
}

/** The node properties worth grouping by: categorical, with a manageable number of values. */
function groupingColumns(columns: ColumnMeta[] | undefined): ColumnMeta[] {
  return (columns ?? []).filter(
    (c) =>
      c.kind === 'categorical' &&
      (c.library?.length ?? 0) > 1 &&
      (c.library?.length ?? 0) <= MAX_GROUPS
  );
}

/** Three significant digits, without the zeros that would pad them: 11, 291, 0.87. */
function compactNumber(value: number): string {
  return Number.isInteger(value) ? value.toLocaleString() : String(Number(value.toPrecision(3)));
}

/** What a scatter can be drawn against: every statistic, then every numeric node property. */
function scatterAxisOptions(columns: ColumnMeta[] | undefined): { value: string; label: string }[] {
  return [
    ...SPIKE_STATISTICS.map((s) => ({ value: `${STAT_AXIS}${s.key}`, label: statisticLabel(s) })),
    ...(columns ?? [])
      .filter((c) => c.kind === 'numeric' && c.name !== 'node_id')
      .map((c) => ({ value: c.name, label: c.name })),
  ];
}

/** The cells' positions where the node file has them; else the options in order. */
function defaultAxis(options: { value: string }[], index: number): string {
  const preferred = PREFERRED_AXES[index];
  if (options.some((o) => o.value === preferred)) return preferred;
  return options[index]?.value ?? options[0]?.value ?? '';
}

function resolveAxis(
  axis: string,
  statistics: SpikeStatistics,
  nodeColumns: Map<string, ArrayLike<number>> | undefined
): AxisValues | null {
  if (axis.startsWith(STAT_AXIS)) {
    const statistic = SPIKE_STATISTICS.find((s) => `${STAT_AXIS}${s.key}` === axis);
    return statistic
      ? { label: statisticLabel(statistic), values: statistics[statistic.key] }
      : null;
  }
  const values = nodeColumns?.get(axis);
  return values ? { label: axis, values } : null;
}

function defaultGrouping(options: ColumnMeta[]): string {
  const names = new Set(options.map((c) => c.name));
  return PREFERRED_GROUPING.find((n) => names.has(n)) ?? options[0]?.name ?? NO_GROUPING;
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="flex h-full min-h-0 items-center justify-center">{children}</div>;
}
