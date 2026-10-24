'use client';

import { Spin } from 'antd';
import { atom, useAtom } from 'jotai';
import dynamic from 'next/dynamic';
import { useMemo } from 'react';

import { ActivityStatus } from '@/api/entitycore/types/shared/activity';
import {
  nearestSimulation,
  sweptParameters,
} from '@/features/scan-config/components/scan-coordinates';
import { scanParamValueText } from '@/features/scan-config/components/scan-params';
import {
  heatmapFigure,
  linesFigure,
  SPIKE_CAMPAIGN_METRICS,
} from '@/features/spike-viewer/campaign-statistics/campaign-figures';
import {
  CAMPAIGN_SPIKES_LIMIT_BYTES,
  useCampaignSummaries,
} from '@/features/spike-viewer/campaign-statistics/campaign-summaries';
import { executionStatusColorMap } from '@/features/task-runner/activity-execution/color-map';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { PillSelect } from '@/ui/molecules/select/pill-select';
import { cn } from '@/utils/css-class';

import type { ISimulation } from '@/api/entitycore/types/entities/simulation';
import type {
  CampaignMetric,
  GridCell,
  ScanAxis,
} from '@/features/spike-viewer/campaign-statistics/campaign-figures';
import type { CampaignSummaries } from '@/features/spike-viewer/campaign-statistics/campaign-summaries';
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

type PlotKind = 'heatmaps' | 'lines';

/**
 * The plot and its axes, outside the view: picking a simulation swaps the file
 * underneath and remounts the viewer it is shown from.
 */
const campaignPlotAtom = atom<{ plotKind: PlotKind; x?: string; y?: string }>({
  plotKind: 'heatmaps',
});

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
};

/**
 * How a population fires across the campaign: its spikes in every finished
 * simulation, summed over the cells the table picks and the raster's window.
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
}: Props) {
  const context = useWorkspace();
  const summaries = useCampaignSummaries({
    simulations,
    statusMap,
    context,
    reportPath,
    populationName,
    cellCount,
    run,
    cells,
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
    />
  );
}

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
};

/**
 * The campaign's simulations side by side: a heatmap per measure over two of
 * its swept parameters - or lines - with the rest held at the simulation on
 * show. A click on a finished simulation's point shows it below.
 */
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
}: PlotsProps) {
  const swept = useMemo(() => sweptParameters(simulations), [simulations]);
  const active = simulations.find((s) => s.id === activeSimulationId);
  const [{ plotKind, x: chosenX, y: chosenY }, setPlot] = useAtom(campaignPlotAtom);
  const setPlotKind = (next: PlotKind) => setPlot((p) => ({ ...p, plotKind: next }));
  const setChosenX = (next: string) => setPlot((p) => ({ ...p, x: next }));
  const setChosenY = (next: string) => setPlot((p) => ({ ...p, y: next }));
  const xKey = swept.some((p) => p.key === chosenX) ? chosenX : swept[0]?.key;
  const yKey =
    chosenY === NO_AXIS
      ? NO_AXIS
      : swept.some((p) => p.key === chosenY && p.key !== xKey)
        ? (chosenY as string)
        : (swept.find((p) => p.key !== xKey)?.key ?? NO_AXIS);

  const figures = useMemo(() => {
    if (!active || !xKey) return null;
    const axisOf = (key: string): ScanAxis => ({
      label: key.split('.').at(-1) ?? key,
      values: (swept.find((p) => p.key === key)?.values ?? []).map((v) => ({
        id: v.id,
        value: v.value,
        text: scanParamValueText(v.value, NO_NAMES),
      })),
    });
    const x = axisOf(xKey);
    const y = yKey === NO_AXIS ? null : axisOf(yKey);
    const byId =
      summaries.state === 'loading' || summaries.state === 'ready' ? summaries.summaries : null;
    const cellAt = (xi: number, yi: number): GridCell => {
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
      return { simulationId: simulation.id, summary: byId?.get(simulation.id) };
    };
    return metrics.map((metric, i) =>
      plotKind === 'heatmaps'
        ? heatmapFigure(metric, x, y, cellAt, activeSimulationId)
        : linesFigure(metric, x, y, cellAt, activeSimulationId, i === metrics.length - 1)
    );
  }, [
    active,
    xKey,
    yKey,
    swept,
    summaries,
    simulations,
    statusMap,
    plotKind,
    activeSimulationId,
    metrics,
  ]);

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
        <PillSelect
          label="Plot"
          value={plotKind}
          options={[
            { value: 'heatmaps', label: 'Heatmaps' },
            { value: 'lines', label: 'Lines' },
          ]}
          onChange={(v) => setPlotKind(v as PlotKind)}
        />
        {xKey && <PillSelect label="X" value={xKey} options={axisOptions} onChange={setChosenX} />}
        {xKey && (
          <PillSelect
            label="Y"
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
      ) : !figures || summaries.state === 'resolving' ? (
        <div className="flex min-h-0 flex-1 items-center justify-center">
          <Spin tip={`Finding the simulations’ ${files}…`}>
            <div className="size-12" />
          </Spin>
        </div>
      ) : (
        <div className="grid min-h-0 flex-1 auto-rows-fr grid-cols-2 gap-3 @4xl:grid-cols-4">
          {figures.map((figure, i) => (
            <div key={metrics[i].key} className="min-h-0 min-w-0">
              <StatisticsPlot figure={figure} onPointClick={pick} />
            </div>
          ))}
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
