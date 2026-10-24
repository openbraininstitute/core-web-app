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
  CAMPAIGN_METRICS,
  heatmapFigure,
  linesFigure,
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
  GridCell,
  ScanAxis,
} from '@/features/spike-viewer/campaign-statistics/campaign-figures';
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
};

/**
 * The campaign's simulations side by side: how a population fires across the
 * scan, as a heatmap per measure over two of its parameters - or lines - with
 * the rest held at the simulation on show. Every simulation is summed over the
 * cells the table picks. A click on a finished simulation's point shows it below.
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
    enabled: true,
  });
  const picked = useMemo(
    () => (cells ? cells.reduce((sum, flag) => sum + flag, 0) : null),
    [cells]
  );

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
    return CAMPAIGN_METRICS.map((metric, i) =>
      plotKind === 'heatmaps'
        ? heatmapFigure(metric, x, y, cellAt, activeSimulationId)
        : linesFigure(metric, x, y, cellAt, activeSimulationId, i === CAMPAIGN_METRICS.length - 1)
    );
  }, [active, xKey, yKey, swept, summaries, simulations, statusMap, plotKind, activeSimulationId]);

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
          {progressText(summaries, populationName, picked, cellCount)}
        </span>
      </div>
      {summaries.state === 'too-large' ? (
        <TooLarge bytes={summaries.bytes} count={summaries.count} />
      ) : swept.length === 0 ? (
        <Notice>This campaign sweeps no parameter, so there is nothing to compare.</Notice>
      ) : !figures || summaries.state === 'resolving' ? (
        <div className="flex min-h-0 flex-1 items-center justify-center">
          <Spin tip="Finding the simulations’ spike files…">
            <div className="size-12" />
          </Spin>
        </div>
      ) : (
        <div className="grid min-h-0 flex-1 auto-rows-fr grid-cols-2 gap-3 @4xl:grid-cols-4">
          {figures.map((figure, i) => (
            <div key={CAMPAIGN_METRICS[i].key} className="min-h-0 min-w-0">
              <StatisticsPlot figure={figure} onPointClick={pick} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function progressText(
  summaries: ReturnType<typeof useCampaignSummaries>,
  populationName: string | undefined,
  picked: number | null,
  cellCount: number | undefined
): string {
  if (summaries.state === 'loading') {
    return `Reading spikes: ${summaries.loaded} of ${summaries.total} simulations`;
  }
  if (summaries.state === 'ready') {
    const of =
      picked === null
        ? ''
        : ` · ${picked.toLocaleString()} of ${(cellCount ?? 0).toLocaleString()} cells`;
    return `${summaries.total} finished ${summaries.total === 1 ? 'simulation' : 'simulations'} · ${populationName ?? ''}${of}`;
  }
  return '';
}

/** Said where the campaign's spike files are more than the browser should fetch at once. */
function TooLarge({ bytes, count }: { bytes: number; count: number }) {
  return (
    <Notice title="Large campaigns are not yet supported">
      Comparing this campaign would mean downloading the spike files of its {count} finished
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
