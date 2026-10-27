'use client';

import { Empty, Spin } from 'antd';
import dynamic from 'next/dynamic';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

import { NEURON_HEADING } from '@/features/circuit-nodes/types';
import { PaneResizeHandle } from '@/features/circuit-viewer/pane-resize-handle';
import { BOX_CLASS } from '@/features/scan-config/components/shared/box-class';
import {
  barFigure,
  densityFigure,
  histogramFigure,
  sankeyFigure,
  scatterFigure,
  violinFigure,
} from '@/features/spike-viewer/spike-statistics/figures';
import {
  groupCells,
  groupValues,
  statisticLabel,
} from '@/features/spike-viewer/spike-statistics/statistics';
import { PillSelect } from '@/ui/molecules/select/pill-select';
import { cn } from '@/utils/css-class';

import type { ReactNode } from 'react';
import type { PinnedColumn } from '@/features/circuit-nodes/components/nodes-grid';
import type { ColumnMeta, ColumnValues } from '@/features/circuit-nodes/types';
import type { TimeCursor } from '@/features/sonata-viewer/time-cursor';
import type { TimelineEvent } from '@/features/spike-viewer/config-timeline';
import type { AxisValues, Figure } from '@/features/spike-viewer/spike-statistics/figures';
import type { CellGroup, CellStatistic } from '@/features/spike-viewer/spike-statistics/statistics';
import type { PillSelectOption } from '@/ui/molecules/select/pill-select';

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

/** The statistics' own plots, or one a host draws (`CellPlot.value`). */
type PlotKind =
  | 'timeCourse'
  | 'violins'
  | 'bars'
  | 'histograms'
  | 'densities'
  | 'scatter2d'
  | 'scatter3d'
  | 'sankey'
  | (string & {});

/**
 * A plot over time the host can draw from what it holds - the spikes' PSTHs, a
 * report's mean - offered first, and shown at first unless the host picks
 * another: a figure for the cells on show split as Group by splits them, or
 * null while it is not ready.
 */
export type TimeCourse = {
  label: string;
  figure: (groups: CellGroup[], groupLabel: string | undefined) => Figure | null;
  /** Shown after the plot's select while the course is up: what shapes it, such as a PSTH's bins. */
  controls?: ReactNode;
  /** The config's timings, marked over the course as over the raster. */
  events?: readonly TimelineEvent[];
  /** The player's time, a red rule over the course. */
  timeCursor?: TimeCursor;
};

/**
 * The cells on show as a host's plot is handed them: all of them, split by
 * Group by, and split again by the plot's own Colour by where it has one.
 */
export type CellSplit = {
  /** Every cell on show, by node index. */
  cells: Uint32Array;
  /** One group, "All", when nothing groups them. */
  groups: CellGroup[];
  groupLabel: string | undefined;
  /** Without a Colour by of the plot's own, the groups again. */
  colours: CellGroup[];
  colourLabel: string | undefined;
};

/**
 * A plot of the cells a host draws itself, offered after the statistics' own:
 * handed the cells on show split by the grouping, as a time course is.
 */
export type CellPlot = {
  value: string;
  label: string;
  /** Null when there is nothing to draw, such as too few cells. */
  figure: (split: CellSplit) => Figure | null;
  /** A Colour by of its own beside Group by, so its cells can be coloured by one property and grouped by another. */
  colourBy?: boolean;
  /** False when nothing it draws once grouped takes the colouring, which leaves Colour by out then. */
  coloursWhenGrouped?: boolean;
  /** Shown after the plot's select while it is up: what shapes it, such as its bins. */
  controls?: ReactNode;
  /** Shown after Group by while the cells are grouped: how the groups are drawn. */
  groupControls?: ReactNode;
  /** Shown last of all: an option apart from the rest, such as whether a partial end bin counts. */
  trailingControls?: ReactNode;
  /** Said in the plot's place when there is nothing to draw. */
  empty: string;
};

const PLOT_KINDS: { value: PlotKind; label: string }[] = [
  { value: 'violins', label: 'Violins' },
  { value: 'bars', label: 'Bars' },
  { value: 'histograms', label: 'Histograms' },
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
const NO_EVENTS: readonly TimelineEvent[] = [];

/** Past this many values a property is closer to an id than a group. */
const MAX_GROUPS = 80;

/** The properties a circuit is usually read by, most telling first. */
const PREFERRED_GROUPING = ['mtype', 'layer', 'synapse_class', 'etype', 'region'];

/** Each statistic's values, one per node index, by the statistic's key. */
export type StatisticValues = Readonly<Record<string, Float64Array>>;

type PlotsProps = {
  statistics: readonly CellStatistic[];
  /** The statistics' values once the session holds them as columns; null until then. */
  values: StatisticValues | null;
  /** The cells to plot, by node index: null for all, undefined until settled. */
  cells: Uint32Array | null | undefined;
  /** The session's columns, any a host added among them: what groups and places the cells. */
  columns: ColumnMeta[] | undefined;
  ready: boolean;
  /** What columns read from the session are tagged with, so another population's are never used. */
  sessionKey: string;
  getColumn: (name: string) => Promise<ColumnValues>;
  color: string;
  /** The span the statistics are over, in ms: the steps some of their values come in. */
  spanMs: number;
  /** The statistic shown at first. */
  initialStatistic: string;
  /** The plot shown at first: the time course, where there is one, unless the host says otherwise. */
  initialPlot?: PlotKind;
  /** Said after the controls, such as how many cells the plot is over. */
  summary?: ReactNode;
  /** Kept but not drawn, so the choices made over the plot outlast a spell out of view. */
  hidden?: boolean;
  timeCourse?: TimeCourse;
  cellPlots?: readonly CellPlot[];
};

/**
 * Per-cell statistics as distributions: by a node property, as violins, bars,
 * histograms, densities or a Sankey, or the cells themselves placed by any
 * statistic or numeric property and coloured by one.
 */
export function StatisticsPlots({
  statistics,
  values,
  cells,
  columns,
  ready,
  sessionKey,
  getColumn,
  color,
  spanMs,
  initialStatistic,
  initialPlot,
  summary,
  hidden = false,
  timeCourse,
  cellPlots,
}: PlotsProps) {
  const [statisticKey, setStatisticKey] = useState(initialStatistic);
  const statistic = statistics.find((s) => s.key === statisticKey) ?? statistics[0];

  // Which figure: the statistic by group, or the cells themselves placed by
  // chosen columns - any statistic or numeric node property - and coloured by it.
  const [plotKind, setPlotKind] = useState<PlotKind>(
    initialPlot ?? (timeCourse ? 'timeCourse' : 'violins')
  );
  const overTime = plotKind === 'timeCourse' && timeCourse !== undefined;

  // Until a grouping is chosen, the cells over time go ungrouped and their
  // statistics' distributions by the property a circuit is usually read by.
  const groupOptions = useMemo(() => groupingColumns(columns), [columns]);
  const [chosenGroupBy, setChosenGroupBy] = useState<string>();
  const groupBy =
    chosenGroupBy === NO_GROUPING || groupOptions.some((c) => c.name === chosenGroupBy)
      ? (chosenGroupBy as string)
      : overTime
        ? NO_GROUPING
        : defaultGrouping(groupOptions);

  const groupColumn = useGroupingColumn(groupBy, ready, getColumn, sessionKey);

  const groups = useMemo(() => {
    const shown = values?.[statistic.key];
    if (!shown || cells === undefined || groupColumn === undefined) return null;
    return groupValues(shown, groupColumn, cells);
  }, [values, cells, groupColumn, statistic]);

  const scatter = plotKind === 'scatter2d' || plotKind === 'scatter3d';
  const hostPlot = cellPlots?.find((p) => p.value === plotKind);
  // Over time, or in a host's plot, the cells themselves are split, not a statistic's values.
  const overCells = overTime || hostPlot !== undefined;
  const plotKinds = useMemo(
    () => [
      ...(timeCourse ? [{ value: 'timeCourse' as PlotKind, label: timeCourse.label }] : []),
      ...PLOT_KINDS,
      ...(cellPlots ?? []).map((p) => ({ value: p.value, label: p.label })),
    ],
    [timeCourse, cellPlots]
  );
  const rowCount = values ? (Object.values(values)[0]?.length ?? 0) : 0;
  const cellGroups = useMemo(() => {
    if (!overCells || !values || cells === undefined || groupColumn === undefined) return null;
    return groupCells(groupColumn, cells, rowCount);
  }, [overCells, values, cells, rowCount, groupColumn]);
  const shownCells = useMemo(
    () => (cells === null ? Uint32Array.from({ length: rowCount }, (_, i) => i) : cells),
    [cells, rowCount]
  );

  // A host's plot with a Colour by of its own colours its cells as they are
  // grouped until a colouring is chosen apart.
  const colouring = hostPlot?.colourBy === true;
  const [chosenColourBy, setChosenColourBy] = useState<string>();
  const colourBy =
    chosenColourBy === NO_GROUPING || groupOptions.some((c) => c.name === chosenColourBy)
      ? (chosenColourBy as string)
      : groupBy;
  const ownColourColumn = useGroupingColumn(
    colouring && colourBy !== groupBy ? colourBy : NO_GROUPING,
    ready,
    getColumn,
    sessionKey
  );
  const colourColumn = colourBy === groupBy ? groupColumn : ownColourColumn;
  const colourGroups = useMemo(() => {
    if (!colouring || !values || cells === undefined || colourColumn === undefined) return null;
    return groupCells(colourColumn, cells, rowCount);
  }, [colouring, values, cells, rowCount, colourColumn]);
  // A column a host added, such as a neuron set's, goes by its label.
  const groupLabel = groupingLabel(groupOptions, groupBy);
  const colourLabel = colouring ? groupingLabel(groupOptions, colourBy) : groupLabel;
  const groupingOptions = [
    { value: NO_GROUPING, label: 'None' },
    ...groupOptions.map((c) => ({
      value: c.name,
      label: c.label ?? c.name,
      heading: NEURON_HEADING,
    })),
  ];
  const axisOptions = useMemo(() => scatterAxisOptions(statistics, columns), [statistics, columns]);
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
    Promise.all(missing.map((name) => getColumn(name).then((column) => [name, column] as const)))
      .then((loaded) => {
        if (cancelled) return;
        setAxisColumns((previous) => {
          const known = new Map(previous?.session === sessionKey ? previous.values : undefined);
          // Kept even when it is not a number, so it is not asked for again.
          for (const [name, column] of loaded) {
            known.set(name, column.kind === 'numeric' ? column.values : new Float64Array(0));
          }
          return { session: sessionKey, values: known };
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [ready, axisKey, knownAxes, getColumn, sessionKey]);

  const binStep = statistic.step?.(spanMs);
  const empty = overCells ? cellGroups?.length === 0 : !scatter && groups?.length === 0;
  const figure = useMemo<Figure | null>(() => {
    const shown = values?.[statistic.key];
    // Nothing is drawn out of view, so nothing is worked out for it.
    if (hidden || !values || !shown || cells === undefined) return null;
    if (hostPlot) {
      const colours = colouring ? colourGroups : cellGroups;
      if (!cellGroups || !colours || !shownCells) return null;
      return hostPlot.figure({
        cells: shownCells,
        groups: cellGroups,
        groupLabel,
        colours,
        colourLabel,
      });
    }
    if (overTime)
      return timeCourse && cellGroups ? timeCourse.figure(cellGroups, groupLabel) : null;
    const valueLabel = statisticLabel(statistic);
    if (scatter) {
      const resolved = axisKey
        .split('\n')
        .map((axis) => resolveAxis(axis, statistics, values, knownAxes));
      if (resolved.some((axis) => axis === null)) return null;
      return scatterFigure(
        resolved as AxisValues[],
        { label: valueLabel, values: shown },
        cells ?? null,
        `${plotKind}:${axisKey}`
      );
    }
    if (!groups || groups.length === 0) return null;
    if (plotKind === 'densities') {
      return densityFigure(groups, groupLabel, valueLabel, color, binStep, statistic.unit);
    }
    if (plotKind === 'histograms') {
      return histogramFigure(groups, groupLabel, valueLabel, color, binStep, statistic.unit);
    }
    if (plotKind === 'bars') return barFigure(groups, groupLabel, valueLabel, color);
    if (plotKind === 'sankey')
      return sankeyFigure(groups, valueLabel, statistic.format, statistic.unit);
    return violinFigure(groups, groupLabel, valueLabel, color);
  }, [
    values,
    cells,
    statistic,
    statistics,
    scatter,
    axisKey,
    knownAxes,
    plotKind,
    groups,
    color,
    binStep,
    overTime,
    cellGroups,
    timeCourse,
    hostPlot,
    hidden,
    groupLabel,
    colourLabel,
    colouring,
    colourGroups,
    shownCells,
  ]);
  // A host's plot that had the cells and still drew nothing has said why.
  const hostReady = cellGroups !== null && (!colouring || colourGroups !== null);
  const hostEmpty = hostPlot !== undefined && hostReady && !empty && figure === null;

  if (hidden) return null;

  return (
    <>
      <div className="flex shrink-0 flex-wrap items-center gap-2 px-3 pt-3 pb-1">
        <PillSelect
          label="Plot"
          value={plotKind}
          options={plotKinds}
          onChange={(v) => setPlotKind(v as PlotKind)}
        />
        {overTime && timeCourse.controls}
        {hostPlot?.controls}
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
        {!overCells && (
          <PillSelect
            label={scatter ? 'Colour' : 'Statistic'}
            value={statistic.key}
            options={statistics.map((s) => ({
              value: s.key,
              label: statisticLabel(s),
              heading: s.heading,
            }))}
            onChange={setStatisticKey}
          />
        )}
        {colouring && (groupBy === NO_GROUPING || hostPlot.coloursWhenGrouped !== false) && (
          <PillSelect
            label="Colour by"
            value={colourBy}
            options={groupingOptions}
            onChange={setChosenColourBy}
          />
        )}
        {!scatter && (
          <PillSelect
            label="Group by"
            value={groupBy}
            options={groupingOptions}
            onChange={setChosenGroupBy}
          />
        )}
        {groupBy !== NO_GROUPING && hostPlot?.groupControls}
        {hostPlot?.trailingControls}
        {summary}
      </div>
      <div className="relative min-h-0 flex-1 px-3 pb-3">
        {empty || hostEmpty ? (
          <Centered>
            <Empty
              description={
                hostEmpty ? hostPlot.empty : `No cell here has a ${statistic.label.toLowerCase()}`
              }
            />
          </Centered>
        ) : figure === null ? (
          <Centered>
            <Spin />
          </Centered>
        ) : (
          <StatisticsPlot
            figure={figure}
            timeline={
              overTime && (timeCourse.events || timeCourse.timeCursor)
                ? { events: timeCourse.events ?? NO_EVENTS, timeCursor: timeCourse.timeCursor }
                : undefined
            }
          />
        )}
      </div>
    </>
  );
}

/** The box a table sits in, with room inside so the table clears its corners. */
export const TABLE_BOX_CLASS = `${BOX_CLASS} px-3 pt-1 pb-2`;

/** The table's share of the view until its grab bar is dragged. */
const DEFAULT_TABLE_SHARE = 0.6;
const MIN_TABLE_HEIGHT = 160;
/** What the plot keeps above the table: its own floor and the controls over it. */
const MIN_PLOT_HEIGHT = 220;

/**
 * The plots over the table, either side of a grab bar, the table's height
 * measured from the bottom as the raster's is under the replay. With
 * `tableOnly` the table takes the whole height and there is no bar.
 */
export function PlotsOverTable({
  plots,
  table,
  tableOnly = false,
}: {
  plots: ReactNode;
  table: ReactNode;
  tableOnly?: boolean;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [rootHeight, setRootHeight] = useState(0);
  useLayoutEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    setRootHeight(el.getBoundingClientRect().height);
    const observer = new ResizeObserver(([entry]) => setRootHeight(entry.contentRect.height));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const [chosenTableHeight, setChosenTableHeight] = useState<number | null>(null);
  const tableHeight = clampTableHeight(chosenTableHeight, rootHeight);

  return (
    <div ref={rootRef} className="flex h-full min-h-0 flex-col">
      {/* Kept while the table has the view to itself, so the plots' choices outlast it. */}
      <div
        className={cn(
          BOX_CLASS,
          'mx-3 mt-3 mb-[12px] flex min-h-0 flex-1 flex-col',
          tableOnly && 'hidden'
        )}
      >
        {plots}
      </div>
      {/* The table in its box, the grab bar in the space over it, as between the scene and the raster. */}
      <div
        className={cn('relative mx-3 pt-[12px] pb-3', tableOnly ? 'min-h-0 flex-1' : 'shrink-0')}
        style={tableOnly ? undefined : { height: tableHeight }}
      >
        {!tableOnly && (
          <PaneResizeHandle containerRef={rootRef} minHeight={0} onResize={setChosenTableHeight} />
        )}
        <div className={cn(TABLE_BOX_CLASS, 'h-full min-h-0')}>{table}</div>
      </div>
    </div>
  );
}

/** The statistics as the table's pinned columns, which the table sizes. */
export function pinnedStatisticColumns(statistics: readonly CellStatistic[]): PinnedColumn[] {
  return statistics.map((s) => ({
    name: s.column,
    headerName: statisticLabel(s),
    // The full label says it in brackets; a short one carries it after.
    short: { headerName: s.short, unit: s.unit },
    format: s.format,
    // Three significant digits in a narrow column, so more of them fit.
    compactFormat: compactNumber,
  }));
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
function scatterAxisOptions(
  statistics: readonly CellStatistic[],
  columns: ColumnMeta[] | undefined
): PillSelectOption[] {
  return [
    ...statistics.map((s) => ({
      value: `${STAT_AXIS}${s.key}`,
      label: statisticLabel(s),
      heading: s.heading,
    })),
    ...(columns ?? [])
      .filter((c) => c.kind === 'numeric' && c.name !== 'node_id')
      .map((c) => ({ value: c.name, label: c.name, heading: NEURON_HEADING })),
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
  statistics: readonly CellStatistic[],
  values: StatisticValues,
  nodeColumns: Map<string, ArrayLike<number>> | undefined
): AxisValues | null {
  if (axis.startsWith(STAT_AXIS)) {
    const statistic = statistics.find((s) => `${STAT_AXIS}${s.key}` === axis);
    const shown = statistic && values[statistic.key];
    return statistic && shown ? { label: statisticLabel(statistic), values: shown } : null;
  }
  const column = nodeColumns?.get(axis);
  return column ? { label: axis, values: column } : null;
}

/** What a grouping goes by: a column a host added, such as a neuron set's, by its label. */
function groupingLabel(options: ColumnMeta[], name: string): string | undefined {
  return name === NO_GROUPING ? undefined : (options.find((c) => c.name === name)?.label ?? name);
}

/**
 * A grouping property's values, read from the session once it is chosen: null
 * for none, undefined until they come.
 */
function useGroupingColumn(
  name: string,
  ready: boolean,
  getColumn: (name: string) => Promise<ColumnValues>,
  sessionKey: string
): ColumnValues | null | undefined {
  const [read, setRead] = useState<{ session: string; name: string; values: ColumnValues }>();
  useEffect(() => {
    if (!ready || name === NO_GROUPING) return;
    let cancelled = false;
    getColumn(name)
      .then((values) => {
        if (!cancelled) setRead({ session: sessionKey, name, values });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [ready, name, getColumn, sessionKey]);
  if (name === NO_GROUPING) return null;
  return read?.session === sessionKey && read.name === name ? read.values : undefined;
}

function defaultGrouping(options: ColumnMeta[]): string {
  const names = new Set(options.map((c) => c.name));
  return PREFERRED_GROUPING.find((n) => names.has(n)) ?? options[0]?.name ?? NO_GROUPING;
}

function Centered({ children }: { children: ReactNode }) {
  return <div className="flex h-full min-h-0 items-center justify-center">{children}</div>;
}
