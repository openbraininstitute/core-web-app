'use client';

import { useQueries, useQueryClient } from '@tanstack/react-query';
import { releaseProxy, transfer, wrap } from 'comlink';
import { useEffect, useMemo, useState } from 'react';

import { downloadAsset } from '@/api/entitycore/queries/assets';
import { ActivityStatus } from '@/api/entitycore/types/shared/activity';
import {
  CAMPAIGN_SPIKES_LIMIT_BYTES,
  reportAssetOf,
} from '@/features/spike-viewer/campaign-statistics/campaign-summaries';
import { SPIKING_HEADING } from '@/features/spike-viewer/spike-statistics/statistics';

import type { ISimulation } from '@/api/entitycore/types/entities/simulation';
import type { CellFrames, CellValueStatistics } from '@/features/sonata-viewer/types';
import type { SonataWorkerImpl } from '@/features/sonata-viewer/worker/sonata-worker';
import type { CampaignMetric } from '@/features/spike-viewer/campaign-statistics/campaign-figures';
import type { CampaignGroup } from '@/features/spike-viewer/campaign-statistics/campaign-groups';
import type {
  CampaignSummaries,
  SimulationSummary,
  TimeCourseSeries,
} from '@/features/spike-viewer/campaign-statistics/campaign-summaries';
import type { WorkspaceContext } from '@/types/common';

/**
 * One simulation's report, cell by cell, the span it covers, in seconds, and
 * its cells over time, thinned, for their mean.
 */
export type ReportCellStatistics = CellValueStatistics & { seconds: number; frames?: CellFrames };

/** Frames each simulation's cells are kept at, for their mean over time. */
const COURSE_FRAMES = 400;

/** What a campaign is compared by for a voltage: its level, its spread and its spiking. */
const VOLTAGE_CAMPAIGN_METRICS: readonly CampaignMetric[] = [
  { key: 'mean', label: 'Mean voltage (mV)', scale: 1, heading: 'Voltage' },
  { key: 'sd', label: 'Voltage SD (mV)', scale: 1, min: 0, heading: 'Voltage' },
  {
    key: 'spikingFraction',
    label: 'Spiking cells (%)',
    scale: 100,
    min: 0,
    max: 100,
    heading: SPIKING_HEADING,
  },
  { key: 'rate', label: 'Mean rate (Hz)', scale: 1, min: 0, heading: SPIKING_HEADING },
];

/** For a voltage, its measures; for another variable, its level, spread and extremes. */
export function reportCampaignMetrics(
  variable: string | null,
  units: string
): readonly CampaignMetric[] {
  if (variable === null) return VOLTAGE_CAMPAIGN_METRICS;
  const unit = units ? ` (${units})` : '';
  return [
    { key: 'mean', label: `Mean ${variable}${unit}`, scale: 1, heading: variable },
    { key: 'sd', label: `${variable} SD${unit}`, scale: 1, min: 0, heading: variable },
    { key: 'min', label: `Lowest ${variable}${unit}`, scale: 1, heading: variable },
    { key: 'max', label: `Highest ${variable}${unit}`, scale: 1, heading: variable },
  ];
}

type Options = {
  simulations: ISimulation[];
  statusMap: Map<string, ActivityStatus>;
  context: WorkspaceContext;
  /** The path of the report on show, which each simulation's result names the same. */
  reportPath: string | undefined;
  populationName: string | undefined;
  /** For a voltage, where an upward crossing counts as a spike; null for another variable. */
  spikeThreshold: number | null;
  /** The cells summed up, a group per plot, each a flag per node index; null for every recorded one. */
  groups: readonly CampaignGroup[];
  enabled: boolean;
};

const NO_STATISTICS: ReadonlyMap<string, ReportCellStatistics> = new Map();

/**
 * Every finished simulation's report, summed up for one population: found by
 * the report's path in each simulation's result, weighed against the same
 * limit as the spikes before anything is downloaded, then read one file at a
 * time on one report worker, which keeps each recorded cell's statistics at
 * the file's own resolution and lets the file go.
 */
export function useReportCampaignSummaries({
  simulations,
  statusMap,
  context,
  reportPath,
  populationName,
  spikeThreshold,
  groups,
  enabled,
}: Options): CampaignSummaries {
  const queryClient = useQueryClient();
  const finished = useMemo(
    () => simulations.filter((s) => statusMap.get(s.id) === ActivityStatus.DONE),
    [simulations, statusMap]
  );

  const assets = useQueries({
    queries: finished.map((simulation) => ({
      queryKey: ['campaign-report-asset', simulation.id, reportPath],
      queryFn: () => reportAssetOf(simulation.id, reportPath ?? '', context),
      enabled: enabled && reportPath !== undefined,
      staleTime: 5 * 60 * 1000,
    })),
  });
  const resolved = assets.every((q) => q.isSuccess || q.isError);
  // biome-ignore lint/correctness/useExhaustiveDependencies: `assets` is a fresh array every render, so it is keyed by the ids it holds
  const files = useMemo(
    () =>
      resolved
        ? finished.flatMap((simulation, i) => {
            const found = assets[i].data;
            return found ? [{ simulation, ...found }] : [];
          })
        : null,
    [resolved, finished, assets.map((q) => q.data?.asset.id ?? '').join('\n')]
  );
  const bytes = files?.reduce((sum, f) => sum + f.asset.size, 0) ?? 0;
  const tooLarge = bytes > CAMPAIGN_SPIKES_LIMIT_BYTES;

  const [statistics, setStatistics] = useState<{
    key: string;
    byId: ReadonlyMap<string, ReportCellStatistics>;
  }>();
  const key = `${populationName}\n${spikeThreshold}\n${files?.map((f) => f.asset.id).join(',')}`;
  useEffect(() => {
    if (!enabled || !files || tooLarge || !populationName) return;
    let cancelled = false;
    const rawWorker = new Worker(new URL('./worker/sonata-worker.ts', import.meta.url), {
      type: 'module',
    });
    const worker = wrap<SonataWorkerImpl>(rawWorker);
    (async () => {
      const byId = new Map<string, ReportCellStatistics>();
      for (const file of files) {
        if (cancelled) return;
        try {
          const cellStatistics = await queryClient.fetchQuery({
            queryKey: ['campaign-report-cells', file.asset.id, populationName, spikeThreshold],
            queryFn: async (): Promise<ReportCellStatistics> => {
              const buffer = await downloadAsset<ArrayBuffer>({
                entityType: file.entityType,
                entityId: file.resultId,
                id: file.asset.id,
                ctx: context,
              });
              const metadata = await worker.loadFile(transfer(buffer, [buffer]));
              try {
                const population = metadata.populations.find((p) => p.name === populationName);
                if (!population) throw new Error(`No population ${populationName} in the report`);
                const found = await worker.getCellStatistics(populationName, spikeThreshold);
                const frames = await worker.getCellFrames(populationName, COURSE_FRAMES);
                const { startTime, endTime } = population.timeConfig;
                return { ...found, frames, seconds: (endTime - startTime) / 1000 };
              } finally {
                await worker.destroy();
              }
            },
            staleTime: Number.POSITIVE_INFINITY,
            // Past a pick of another simulation, which mounts this view anew.
            gcTime: 30 * 60 * 1000,
          });
          byId.set(file.simulation.id, cellStatistics);
        } catch {
          // A file that cannot be read is a gap in the plots, not a stop.
        }
        if (!cancelled) setStatistics({ key, byId: new Map(byId) });
      }
    })().finally(() => {
      worker[releaseProxy]();
      rawWorker.terminate();
    });
    return () => {
      cancelled = true;
    };
  }, [enabled, files, tooLarge, populationName, spikeThreshold, context, queryClient, key]);

  const loaded = statistics?.key === key ? statistics.byId : NO_STATISTICS;
  const grouped = useMemo(
    () =>
      groups.map((group) => ({
        name: group.name,
        summaries: new Map(
          [...loaded].map(([id, s]) => [id, summarizeReport(s, group.cells)] as const)
        ),
        courses: new Map(
          [...loaded].flatMap(([id, s]) => {
            const course = s.frames && meanCourse(s.frames, group.cells);
            return course ? [[id, course] as const] : [];
          })
        ),
      })),
    [loaded, groups]
  );

  if (!files) return { state: 'resolving' };
  if (tooLarge) return { state: 'too-large', bytes, count: files.length };
  return {
    state: loaded.size >= files.length ? 'ready' : 'loading',
    groups: grouped,
    loaded: loaded.size,
    total: files.length,
  };
}

const NO_SUMMARY: SimulationSummary = {
  mean: Number.NaN,
  sd: Number.NaN,
  min: Number.NaN,
  max: Number.NaN,
  spikingFraction: Number.NaN,
  rate: Number.NaN,
};

/**
 * A simulation's report summed up over the cells flagged in `cells`, or every
 * recorded one: the cells' mean level, spread and extremes, averaged, and for a
 * voltage the share of them that spiked and their mean rate.
 */
export function summarizeReport(
  { nodeIds, mean, sd, min, max, spikes, seconds }: ReportCellStatistics,
  cells: Uint8Array | null
): SimulationSummary {
  let n = 0;
  let meanSum = 0;
  let sdSum = 0;
  let minSum = 0;
  let maxSum = 0;
  let spiking = 0;
  let spikeSum = 0;
  for (let i = 0; i < nodeIds.length; i++) {
    if (cells && !cells[nodeIds[i]]) continue;
    n += 1;
    meanSum += mean[i];
    sdSum += sd[i];
    minSum += min[i];
    maxSum += max[i];
    if (spikes) {
      spikeSum += spikes[i];
      if (spikes[i] > 0) spiking += 1;
    }
  }
  if (n === 0) return NO_SUMMARY;
  return {
    mean: meanSum / n,
    sd: sdSum / n,
    min: minSum / n,
    max: maxSum / n,
    spikingFraction: spikes ? spiking / n : Number.NaN,
    rate: spikes && seconds > 0 ? spikeSum / n / seconds : Number.NaN,
  };
}

/** The mean, frame by frame, of the cells flagged in `cells`, or every recorded one. */
function meanCourse(frames: CellFrames, cells: Uint8Array | null): TimeCourseSeries | null {
  const columns = frames.nodeIds.length;
  const picked: number[] = [];
  for (let c = 0; c < columns; c++) if (!cells || cells[frames.nodeIds[c]]) picked.push(c);
  if (picked.length === 0) return null;
  const y = new Float64Array(frames.times.length);
  for (let f = 0; f < frames.times.length; f++) {
    let sum = 0;
    for (const c of picked) sum += frames.values[f * columns + c];
    y[f] = sum / picked.length;
  }
  return { x: frames.times, y };
}
