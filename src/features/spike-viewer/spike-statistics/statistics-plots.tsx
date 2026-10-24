'use client';

import { Empty, Spin } from 'antd';
import dynamic from 'next/dynamic';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

import { PaneResizeHandle } from '@/features/circuit-viewer/pane-resize-handle';
import {
  densityFigure,
  sankeyFigure,
  scatterFigure,
  violinFigure,
} from '@/features/spike-viewer/spike-statistics/figures';
import { groupValues, statisticLabel } from '@/features/spike-viewer/spike-statistics/statistics';
import { PillSelect } from '@/ui/molecules/select/pill-select';
import { cn } from '@/utils/css-class';

import type { ReactNode } from 'react';
import type { PinnedColumn } from '@/features/circuit-nodes/components/nodes-grid';
import type { ColumnMeta, ColumnValues } from '@/features/circuit-nodes/types';
import type { AxisValues, Figure } from '@/features/spike-viewer/spike-statistics/figures';
import type { CellStatistic } from '@/features/spike-viewer/spike-statistics/statistics';

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
  /** Said after the controls, such as how many cells the plot is over. */
  summary?: ReactNode;
  /** Kept but not drawn, so the choices made over the plot outlast a spell out of view. */
  hidden?: boolean;
};

/**
 * Per-cell statistics as distributions: by a node property, as violins,
 * densities or a Sankey, or the cells themselves placed by any statistic or
 * numeric property and coloured by one.
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
  summary,
  hidden = false,
}: PlotsProps) {
  const [statisticKey, setStatisticKey] = useState(initialStatistic);
  const statistic = statistics.find((s) => s.key === statisticKey) ?? statistics[0];

  const groupOptions = useMemo(() => groupingColumns(columns), [columns]);
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
      .then((column) => {
        if (!cancelled) setGroupColumn({ session: sessionKey, name: groupBy, values: column });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [ready, groupBy, getColumn, sessionKey]);

  const groups = useMemo(() => {
    const shown = values?.[statistic.key];
    if (!shown || cells === undefined) return null;
    if (groupBy === NO_GROUPING) return groupValues(shown, null, cells);
    if (groupColumn?.session !== sessionKey || groupColumn.name !== groupBy) return null;
    return groupValues(shown, groupColumn.values, cells);
  }, [values, cells, groupBy, groupColumn, statistic, sessionKey]);

  // Which figure: the statistic by group, or the cells themselves placed by
  // chosen columns - any statistic or numeric node property - and coloured by it.
  const [plotKind, setPlotKind] = useState<PlotKind>('violins');
  const scatter = plotKind === 'scatter2d' || plotKind === 'scatter3d';
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
  const empty = !scatter && groups?.length === 0;
  const figure = useMemo<Figure | null>(() => {
    const shown = values?.[statistic.key];
    if (!values || !shown || cells === undefined) return null;
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
    values,
    cells,
    statistic,
    statistics,
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

  if (hidden) return null;

  return (
    <>
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
          options={statistics.map((s) => ({ value: s.key, label: statisticLabel(s) }))}
          onChange={setStatisticKey}
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
        {summary}
      </div>
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
    </>
  );
}

/**
 * A box of the statistics view, one per quadrant: the Data page's white card, rounded,
 * with its faint navy ring and soft navy drop under a white top highlight.
 */
export const BOX_CLASS =
  'rounded-3xl bg-white ring-1 ring-primary-9/5 shadow-[inset_0_1px_0_rgb(255_255_255/0.9),0_4px_12px_-6px_rgb(0_39_102/0.08),0_1px_2px_rgb(0_39_102/0.04)]';

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

/** Share of the table the statistics take, against its right edge, until their edge is dragged. */
export const PINNED_SHARE = 0.5;
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

/** The statistics as the table's pinned columns, sharing `share` of its width between them. */
export function pinnedStatisticColumns(
  statistics: readonly CellStatistic[],
  tableWidth: number,
  share: number
): PinnedColumn[] {
  const each = Math.floor((tableWidth * share) / statistics.length);
  const width = Math.max(PINNED_MIN_WIDTH, each);
  const narrow = each < PINNED_LABEL_WIDTH;
  return statistics.map((s) => ({
    name: s.column,
    headerName: narrow ? s.short : statisticLabel(s),
    headerTooltip: narrow ? statisticLabel(s) : undefined,
    // The full label says it in brackets; a short one carries it after.
    headerUnit: narrow ? s.unit : undefined,
    width,
    format: width < COMPACT_VALUES_WIDTH ? compactNumber : s.format,
    compact: narrow,
  }));
}

/** An element's width, kept as it resizes: hand the callback to the element as its ref. */
export function useElementWidth<T extends HTMLElement>(): [(el: T | null) => void, number] {
  const [el, setEl] = useState<T | null>(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    if (!el) return;
    setWidth(el.getBoundingClientRect().width);
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(el);
    return () => observer.disconnect();
  }, [el]);
  return [setEl, width];
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
): { value: string; label: string }[] {
  return [
    ...statistics.map((s) => ({ value: `${STAT_AXIS}${s.key}`, label: statisticLabel(s) })),
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

function defaultGrouping(options: ColumnMeta[]): string {
  const names = new Set(options.map((c) => c.name));
  return PREFERRED_GROUPING.find((n) => names.has(n)) ?? options[0]?.name ?? NO_GROUPING;
}

function Centered({ children }: { children: ReactNode }) {
  return <div className="flex h-full min-h-0 items-center justify-center">{children}</div>;
}
