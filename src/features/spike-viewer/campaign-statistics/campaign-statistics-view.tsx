'use client';

import { Spin } from 'antd';
import { atom, useAtom, useAtomValue } from 'jotai';
import dynamic from 'next/dynamic';
import { useMemo } from 'react';

import { ActivityStatus } from '@/api/entitycore/types/shared/activity';
import {
  nearestSimulation,
  sweptParameters,
} from '@/features/scan-config/components/scan-coordinates';
import { scanParamValueText } from '@/features/scan-config/components/scan-params';
import {
  courseColor,
  coursesFigure,
  DASHES,
  heatmapFigure,
  linesFigure,
  SPIKE_CAMPAIGN_METRICS,
} from '@/features/spike-viewer/campaign-statistics/campaign-figures';
import {
  NO_GROUPING,
  useCampaignGroups,
} from '@/features/spike-viewer/campaign-statistics/campaign-groups';
import {
  CAMPAIGN_SPIKES_LIMIT_BYTES,
  useCampaignSummaries,
} from '@/features/spike-viewer/campaign-statistics/campaign-summaries';
import { executionStatusColorMap } from '@/features/task-runner/activity-execution/color-map';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { PillSelect } from '@/ui/molecules/select/pill-select';
import { cn } from '@/utils/css-class';

import type { ISimulation } from '@/api/entitycore/types/entities/simulation';
import type { ColumnMeta, ColumnValues } from '@/features/circuit-nodes/types';
import type {
  CampaignMetric,
  GridCell,
  ScanAxis,
} from '@/features/spike-viewer/campaign-statistics/campaign-figures';
import type {
  CampaignGroupSummaries,
  CampaignSummaries,
} from '@/features/spike-viewer/campaign-statistics/campaign-summaries';
import type { Figure } from '@/features/spike-viewer/spike-statistics/figures';
import type { SimulationRun } from '@/features/spike-viewer/time-window';

// Plotly is megabytes, as in the statistics beside it.
const StatisticsPlot = dynamic(
  () => import('@/features/spike-viewer/spike-statistics/statistics-plot'),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center">
        <Spin />
      </div>
    ),
  }
);

const NO_AXIS = '__none__';
const NO_NAMES = new Map<string, string>();

/** Each simulation over time on one plot, or a summary as heatmaps or lines across the scan. */
type PlotKind = 'course' | 'heatmaps' | 'lines';

/**
 * The plot, its axes and its grouping, outside the view: picking a simulation
 * swaps the file underneath and remounts the viewer it is shown from.
 */
const campaignPlotAtom = atom<{
  plotKind?: PlotKind;
  statistic?: string;
  x?: string;
  y?: string;
  groupBy?: string;
}>({});

/** The node property the campaign's plots are grouped by, among those on offer; none at first. */
export function useCampaignGroupBy(columns: readonly ColumnMeta[]): string {
  const { groupBy } = useAtomValue(campaignPlotAtom);
  return groupBy && columns.some((c) => c.name === groupBy) ? groupBy : NO_GROUPING;
}

/** The largest a heatmap's cell is drawn, in px, so a small scan does not fill the panel with a few blocks. */
const MAX_CELL = 88;
/** What a heatmap takes around its cells: the axes' titles and ticks, the title and the colour bar. */
const HEATMAP_ROOM = { width: 150, height: 110 };

/** Each simulation over time, as its own measure: its PSTH, or its mean. */
type CampaignCourse = { label: string; yLabel: string; steps: boolean };

type Props = {
  simulations: ISimulation[];
  statusMap: Map<string, ActivityStatus>;
  activeSimulationId: string;
  onSelect: (simulation: ISimulation) => void;
  /** The report on show, whose namesakes in the other simulations are compared. */
  reportPath: string | undefined;
  populationName: string | undefined;
  cellCount: number | undefined;
  run: SimulationRun | null;
  /** The cells the table picks, a flag per node index; null for all. */
  cells: Uint8Array | null;
  /** The span of the run the raster is zoomed to, in ms; null for all of it. */
  timeWindow: [number, number] | null;
  /** The node properties the plots can be grouped by, and how one's values are read. */
  groupColumns: readonly ColumnMeta[];
  getColumn?: (name: string) => Promise<ColumnValues>;
  sessionKey: string;
};

/**
 * How a population fires across the campaign: its spikes in every finished
 * simulation, summed over the cells the table picks and the raster's window,
 * as one plot, or one per group of a node property.
 */
export function CampaignStatisticsView({
  simulations,
  statusMap,
  activeSimulationId,
  onSelect,
  reportPath,
  populationName,
  cellCount,
  run,
  cells,
  timeWindow,
  groupColumns,
  getColumn,
  sessionKey,
}: Props) {
  const context = useWorkspace();
  const groupBy = useCampaignGroupBy(groupColumns);
  const groups = useCampaignGroups({
    groupBy,
    getColumn,
    sessionKey,
    cells,
    rowCount: cellCount ?? 0,
  });
  const summaries = useCampaignSummaries({
    simulations,
    statusMap,
    context,
    reportPath,
    populationName,
    cellCount,
    run,
    groups: groups ?? NO_GROUPS,
    timeWindow,
    enabled: true,
  });
  const picked = useMemo(
    () => (cells ? cells.reduce((sum, flag) => sum + flag, 0) : null),
    [cells]
  );
  const of =
    picked === null
      ? ''
      : ` · ${picked.toLocaleString()} of ${(cellCount ?? 0).toLocaleString()} cells`;
  const span = timeWindow ? ` · ${timeWindow[0].toFixed(1)}–${timeWindow[1].toFixed(1)} ms` : '';
  return (
    <CampaignPlots
      simulations={simulations}
      statusMap={statusMap}
      activeSimulationId={activeSimulationId}
      onSelect={onSelect}
      summaries={summaries}
      metrics={SPIKE_CAMPAIGN_METRICS}
      reading="spikes"
      files="spike files"
      scope={`${populationName ?? ''}${of}${span}`}
      course={SPIKE_COURSE}
      groupColumns={groupColumns}
      grouping={groups === null}
    />
  );
}

const SPIKE_COURSE: CampaignCourse = { label: 'PSTHs', yLabel: 'Rate (Hz)', steps: true };
/** While a property's values are on their way, nothing to sum up yet. */
export const NO_GROUPS: readonly [] = [];

type PlotsProps = {
  simulations: ISimulation[];
  statusMap: Map<string, ActivityStatus>;
  activeSimulationId: string;
  onSelect: (simulation: ISimulation) => void;
  summaries: CampaignSummaries;
  metrics: readonly CampaignMetric[];
  /** What is read from each simulation, as the progress says it: "spikes", "voltages". */
  reading: string;
  /** Their files, as the notices say them: "spike files", "voltage reports". */
  files: string;
  /** What the summaries are over, after the count of simulations: the population, the cells. */
  scope: string;
  /** Each simulation over time, offered first and shown at first. */
  course?: CampaignCourse;
  /** The node properties the plots can be grouped by. */
  groupColumns: readonly ColumnMeta[];
  /** Whether the chosen property's values are still on their way. */
  grouping: boolean;
};

/**
 * The campaign's simulations side by side, one measure at a time: each over
 * time on one plot, or a summary as a heatmap of square cells over two of its
 * swept parameters, or as lines, the rest held at the simulation on show. Group
 * by splits the cells into a plot per value of a node property, all on one
 * scale. A click on a finished simulation's point or line shows it.
 */
export type { CampaignCourse };

export function CampaignPlots({
  simulations,
  statusMap,
  activeSimulationId,
  onSelect,
  summaries,
  metrics,
  reading,
  files,
  scope,
  course,
  groupColumns,
  grouping,
}: PlotsProps) {
  const swept = useMemo(() => sweptParameters(simulations), [simulations]);
  const active = simulations.find((s) => s.id === activeSimulationId);
  const [{ plotKind: chosenKind, statistic: chosenStatistic, x: chosenX, y: chosenY }, setPlot] =
    useAtom(campaignPlotAtom);
  // The simulations over time first, where there is a way to show them; then a
  // summary, as heatmaps or lines, of the statistic chosen.
  const plotOptions = [
    ...(course ? [{ value: 'course', label: course.label }] : []),
    { value: 'heatmaps', label: 'Heatmaps' },
    { value: 'lines', label: 'Lines' },
  ];
  const plotKind: PlotKind = plotOptions.some((o) => o.value === chosenKind)
    ? (chosenKind as PlotKind)
    : course
      ? 'course'
      : 'heatmaps';
  const setPlotKind = (next: string) => setPlot((p) => ({ ...p, plotKind: next as PlotKind }));
  const metric = metrics.find((m) => m.key === chosenStatistic) ?? metrics[0];
  const setStatistic = (next: string) => setPlot((p) => ({ ...p, statistic: next }));
  const groupBy = useCampaignGroupBy(groupColumns);
  const setGroupBy = (next: string) => setPlot((p) => ({ ...p, groupBy: next }));
  const groupOptions = [
    { value: NO_GROUPING, label: 'None' },
    ...groupColumns.map((c) => ({ value: c.name, label: c.label ?? c.name })),
  ];
  const setChosenX = (next: string) => setPlot((p) => ({ ...p, x: next }));
  const setChosenY = (next: string) => setPlot((p) => ({ ...p, y: next }));
  const xKey = swept.some((p) => p.key === chosenX) ? chosenX : swept[0]?.key;
  const yKey =
    chosenY === NO_AXIS
      ? NO_AXIS
      : swept.some((p) => p.key === chosenY && p.key !== xKey)
        ? (chosenY as string)
        : (swept.find((p) => p.key !== xKey)?.key ?? NO_AXIS);

  const groups =
    summaries.state === 'loading' || summaries.state === 'ready' ? summaries.groups : NO_SUMMARIES;
  const x = useMemo(() => (xKey ? axisOf(swept, xKey) : null), [swept, xKey]);
  const y = useMemo(() => (yKey === NO_AXIS ? null : axisOf(swept, yKey)), [swept, yKey]);
  const figures = useMemo<{ name: string; figure: Figure }[] | null>(() => {
    if (!active || !x || !xKey) return null;
    const cellAt =
      (group: CampaignGroupSummaries) =>
      (xi: number, yi: number): GridCell => {
        const fixed: Record<string, string> = { [xKey]: x.values[xi].id };
        if (y) fixed[yKey] = y.values[yi].id;
        const simulation = nearestSimulation(simulations, active, fixed);
        if (!simulation) return null;
        const status = statusMap.get(simulation.id) ?? ActivityStatus.CREATED;
        if (status !== ActivityStatus.DONE) {
          return {
            simulationId: simulation.id,
            summary: undefined,
            status: { name: status, color: executionStatusColorMap[status] },
          };
        }
        return { simulationId: simulation.id, summary: group.summaries.get(simulation.id) };
      };
    const grouped = groupBy !== NO_GROUPING;
    const overTime = plotKind === 'course' && course ? course : null;
    const summary = overTime ? null : metric;
    if (!overTime && !summary) return null;
    // Several groups share one scale, so their plots compare.
    const range = !grouped
      ? null
      : overTime
        ? courseRange(groups, overTime.steps)
        : summary
          ? metricRange(groups, summary)
          : null;
    return groups.map((group, i) => {
      // Several plots of lines over time share the key over them, not one of their own.
      const options = {
        title: grouped ? group.name : overTime?.label,
        group: grouped ? group.name : undefined,
        range,
        key: grouped && overTime ? false : i === 0,
      };
      const at = cellAt(group);
      const figure = overTime
        ? coursesFigure(
            x,
            y,
            at,
            group.courses,
            activeSimulationId,
            overTime.yLabel,
            overTime.steps,
            options
          )
        : plotKind === 'heatmaps'
          ? heatmapFigure(summary as CampaignMetric, x, y, at, activeSimulationId, options)
          : linesFigure(summary as CampaignMetric, x, y, at, activeSimulationId, options);
      return { name: group.name, figure };
    });
  }, [
    active,
    x,
    y,
    xKey,
    yKey,
    groups,
    groupBy,
    simulations,
    statusMap,
    plotKind,
    activeSimulationId,
    course,
    metric,
  ]);
  const heatmaps = plotKind === 'heatmaps';
  // A heatmap's cells no larger than they need be, the plot in the middle of the panel.
  const heatmapBox = x
    ? {
        maxWidth: x.values.length * MAX_CELL + HEATMAP_ROOM.width,
        maxHeight: (y ? y.values.length : 1) * MAX_CELL + HEATMAP_ROOM.height,
      }
    : undefined;

  const pick = (id: unknown) => {
    const simulation = simulations.find((s) => s.id === id);
    if (simulation && statusMap.get(simulation.id) === ActivityStatus.DONE) onSelect(simulation);
  };
  const axisOptions = swept.map((p) => ({ value: p.key, label: p.key.split('.').at(-1) ?? p.key }));

  return (
    <div className="@container flex h-full min-h-0 flex-col px-1">
      <div
        className={cn(
          'flex shrink-0 flex-wrap items-center gap-2 pb-2',
          // Nothing to set while there is nothing to plot.
          summaries.state === 'too-large' && 'invisible'
        )}
      >
        <PillSelect label="Plot" value={plotKind} options={plotOptions} onChange={setPlotKind} />
        {plotKind !== 'course' && metric && (
          <PillSelect
            label="Statistic"
            value={metric.key}
            options={metrics.map((m) => ({ value: m.key, label: m.label }))}
            onChange={setStatistic}
          />
        )}
        {groupColumns.length > 0 && (
          <PillSelect
            label="Group by"
            value={groupBy}
            options={groupOptions}
            onChange={setGroupBy}
          />
        )}
        {/* Over time the parameters set the lines' colour and dashes; lines of a statistic
          have it for their y axis, the second parameter giving a line per value. */}
        {xKey && (
          <PillSelect
            label={plotKind === 'course' ? 'Colour' : 'X'}
            value={xKey}
            options={axisOptions}
            onChange={setChosenX}
          />
        )}
        {xKey && plotKind !== 'lines' && (
          <PillSelect
            label={plotKind === 'course' ? 'Dash' : 'Y'}
            value={yKey}
            options={[
              ...axisOptions.filter((o) => o.value !== xKey),
              { value: NO_AXIS, label: 'None' },
            ]}
            onChange={setChosenY}
          />
        )}
        <span className="whitespace-nowrap text-xs text-neutral-400">
          {progressText(summaries, reading, scope)}
        </span>
      </div>
      {summaries.state === 'too-large' ? (
        <TooLarge bytes={summaries.bytes} count={summaries.count} files={files} />
      ) : swept.length === 0 ? (
        <Notice>This campaign sweeps no parameter, so there is nothing to compare.</Notice>
      ) : !figures || summaries.state === 'resolving' || grouping ? (
        <div className="flex min-h-0 flex-1 items-center justify-center">
          <Spin tip={grouping ? 'Reading the cells’ groups…' : `Finding the simulations’ ${files}…`}>
            <div className="size-12" />
          </Spin>
        </div>
      ) : figures.length === 1 ? (
        <div className="flex min-h-0 min-w-0 flex-1 items-center justify-center">
          <div
            className="h-full min-h-0 w-full min-w-0"
            style={heatmaps ? heatmapBox : undefined}
          >
            <StatisticsPlot figure={figures[0].figure} onPointClick={pick} />
          </div>
        </div>
      ) : (
        // A plot per group, as many to a row as fit, under one scale.
        <div className="secondary-scrollbar min-h-0 flex-1 overflow-y-auto pr-1">
          {plotKind === 'course' && x && <CourseKey x={x} y={y} />}
          <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-3">
            {figures.map(({ name, figure }) => (
              <div key={name} className={heatmaps ? 'aspect-square' : 'h-[240px]'}>
                <StatisticsPlot figure={figure} onPointClick={pick} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function progressText(summaries: CampaignSummaries, reading: string, scope: string): string {
  if (summaries.state === 'loading') {
    return `Reading ${reading}: ${summaries.loaded} of ${summaries.total} simulations`;
  }
  if (summaries.state === 'ready') {
    return `${summaries.total} finished ${summaries.total === 1 ? 'simulation' : 'simulations'} · ${scope}`;
  }
  return '';
}

/** Said where the campaign's files are more than the browser should fetch at once. */
function TooLarge({ bytes, count, files }: { bytes: number; count: number; files: string }) {
  return (
    <Notice title="Large campaigns are not yet supported">
      Comparing this campaign would mean downloading the {files} of its {count} finished
      simulations, {formatBytes(bytes)} together, past the{' '}
      {formatBytes(CAMPAIGN_SPIKES_LIMIT_BYTES)} this view reads at a time.
    </Notice>
  );
}

function Notice({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-0 flex-1 items-center justify-center">
      <div
        role="status"
        className="border-neutral-2 max-w-md rounded-2xl border bg-white px-6 py-5 text-center shadow-sm"
      >
        {title && <div className="text-primary-9 text-sm font-semibold">{title}</div>}
        <p className="mt-1.5 text-xs leading-5 text-neutral-500">{children}</p>
      </div>
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
  return `${Math.round(bytes / 1024 ** 2)} MB`;
}

const NO_SUMMARIES: readonly CampaignGroupSummaries[] = [];

/** Each line style's dashes, as an SVG stroke draws them, for the key. */
const DASH_ARRAYS: Record<(typeof DASHES)[number], string | undefined> = {
  solid: undefined,
  dash: '6 3',
  dot: '1.5 3',
  dashdot: '6 3 1.5 3',
  longdash: '10 3',
  longdashdot: '10 3 1.5 3',
};

/** Over the groups' plots of the simulations over time: what a line's colour and its dashes say. */
function CourseKey({ x, y }: { x: ScanAxis; y: ScanAxis | null }) {
  const swatch = (color: string, dash: string | undefined) => (
    <svg aria-hidden width="18" height="6" className="shrink-0">
      <line x1="0" y1="3" x2="18" y2="3" stroke={color} strokeWidth="2" strokeDasharray={dash} />
    </svg>
  );
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pb-2 text-[11px] text-neutral-500">
      <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="text-neutral-400">{x.label}</span>
        {x.values.map((v, i) => (
          <span key={v.id} className="flex items-center gap-1">
            {swatch(courseColor(i), undefined)}
            {v.text}
          </span>
        ))}
      </span>
      {y && (
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-neutral-400">{y.label}</span>
          {y.values.map((v, i) => (
            <span key={v.id} className="flex items-center gap-1">
              {swatch('#64748b', DASH_ARRAYS[DASHES[i % DASHES.length]])}
              {v.text}
            </span>
          ))}
        </span>
      )}
    </div>
  );
}

/** A swept parameter as an axis: its name's last part, and its values with their text. */
function axisOf(swept: ReturnType<typeof sweptParameters>, key: string): ScanAxis {
  return {
    label: key.split('.').at(-1) ?? key,
    values: (swept.find((p) => p.key === key)?.values ?? []).map((v) => ({
      id: v.id,
      value: v.value,
      text: scanParamValueText(v.value, NO_NAMES),
    })),
  };
}

/** Every group's values of the measure, as drawn, within what the measure can be. */
function metricRange(
  groups: readonly CampaignGroupSummaries[],
  metric: CampaignMetric
): [number, number] | null {
  let low = Number.POSITIVE_INFINITY;
  let high = Number.NEGATIVE_INFINITY;
  for (const group of groups) {
    for (const summary of group.summaries.values()) {
      const value = summary[metric.key];
      if (value === undefined || Number.isNaN(value)) continue;
      low = Math.min(low, value * metric.scale);
      high = Math.max(high, value * metric.scale);
    }
  }
  if (!Number.isFinite(low)) return null;
  const pad = high > low ? 0 : Math.abs(low) * 0.05 || 1;
  return [
    Math.max(metric.min ?? Number.NEGATIVE_INFINITY, low - pad),
    Math.min(metric.max ?? Number.POSITIVE_INFINITY, high + pad),
  ];
}

/** Every group's courses' values, a little headroom over them; a rate from 0. */
function courseRange(
  groups: readonly CampaignGroupSummaries[],
  fromZero: boolean
): [number, number] | null {
  let low = Number.POSITIVE_INFINITY;
  let high = Number.NEGATIVE_INFINITY;
  for (const group of groups) {
    for (const course of group.courses.values()) {
      for (let i = 0; i < course.y.length; i++) {
        const value = course.y[i];
        if (Number.isNaN(value)) continue;
        if (value < low) low = value;
        if (value > high) high = value;
      }
    }
  }
  if (!Number.isFinite(low)) return null;
  const pad = (high - low || Math.abs(high) || 1) * 0.05;
  return [fromZero ? 0 : low - pad, high + pad];
}
