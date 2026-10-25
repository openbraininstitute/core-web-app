'use client';

import { useQueries, useQueryClient } from '@tanstack/react-query';
import * as Comlink from 'comlink';
import { useEffect, useMemo, useState } from 'react';

import { downloadAsset } from '@/api/entitycore/queries/assets';
import { getSimulationExecutions } from '@/api/entitycore/queries/simulation/campaign/simulation-execution';
import { getSimulationResult } from '@/api/entitycore/queries/simulation/campaign/simulation-result';
import { ActivityStatus } from '@/api/entitycore/types/shared/activity';
import { psthSeries } from '@/features/spike-viewer/spike-statistics/figures';
import { computeSpikeStatistics } from '@/features/spike-viewer/spike-statistics/statistics';
import { spikesBetween } from '@/features/spike-viewer/spike-trace';
import { withSimulationTimeWindow } from '@/features/spike-viewer/time-window';

import type { TEntityTypeDict } from '@/api/entitycore/types';
import type { ISimulation } from '@/api/entitycore/types/entities/simulation';
import type { IAsset } from '@/api/entitycore/types/shared/global';
import type { CampaignGroup } from '@/features/spike-viewer/campaign-statistics/campaign-groups';
import type { PsthOptions } from '@/features/spike-viewer/spike-statistics/figures';
import type { SpikePopulation } from '@/features/spike-viewer/spike-trace';
import type { SpikeTraceWorkerApi } from '@/features/spike-viewer/spike-trace.worker';
import type { SimulationRun } from '@/features/spike-viewer/time-window';
import type { WorkspaceContext } from '@/types/common';

/**
 * The most the browser downloads to compare a campaign's simulations. Past it a
 * campaign is too large to summarise here, and says so rather than trying.
 */
export const CAMPAIGN_SPIKES_LIMIT_BYTES = 200 * 1024 * 1024;

/**
 * One simulation's population, cell by cell, over the run: what its summaries
 * are made from. Its spikes are kept too, so a span of the run can be counted
 * again without the file.
 */
export type CellStatistics = {
  /** Spikes per cell, by node index. */
  counts: Uint32Array;
  /** Each cell's ISI CV; NaN where it fired fewer than three times. */
  cvs: Float32Array;
  /** The window the counts are over. */
  seconds: number;
  /** Where that window starts and ends, in ms. */
  span?: [number, number];
  /** The population's spikes, time-sorted. */
  spikes: SpikePopulation;
};

/** One simulation's population, summed up, by measure: what the campaign's plots compare. */
export type SimulationSummary = Readonly<Record<string, number>>;

/** One simulation's population over time, such as its PSTH: a value at each of `x`, in ms. */
export type TimeCourseSeries = { x: ArrayLike<number>; y: ArrayLike<number> };

/** A simulation's spikes summed up: its rates, its active share (0 to 1) and its mean ISI CV. */
type SpikeSummary = {
  meanRate: number;
  medianRate: number;
  activeFraction: number;
  meanCv: number;
};

/** One group of cells across the campaign: each simulation summed up over them, and over time. */
export type CampaignGroupSummaries = {
  name: string;
  summaries: ReadonlyMap<string, SimulationSummary>;
  /** Each simulation over time, over the same cells and span as its summary. */
  courses: ReadonlyMap<string, TimeCourseSeries>;
};

export type CampaignSummaries =
  | { state: 'resolving' }
  | { state: 'too-large'; bytes: number; count: number }
  | {
      state: 'loading' | 'ready';
      /** A group per plot: the picked cells, or them split by a node property. */
      groups: readonly CampaignGroupSummaries[];
      loaded: number;
      total: number;
    };

type Options = {
  simulations: ISimulation[];
  statusMap: Map<string, ActivityStatus>;
  context: WorkspaceContext;
  /** The path of the report on show, which each simulation's result names the same. */
  reportPath: string | undefined;
  populationName: string | undefined;
  cellCount: number | undefined;
  /** The run on show, whose window the rates are over in every simulation. */
  run: SimulationRun | null;
  /** The cells summed up, a group per plot, each a flag per node index as the table picks them. */
  groups: readonly CampaignGroup[];
  /** The span of the run summed up, such as the raster's window, in ms; null for all of it. */
  timeWindow: [number, number] | null;
  /** How the courses' PSTHs bin and smooth. */
  psth: PsthOptions;
  enabled: boolean;
};

const NO_STATISTICS: ReadonlyMap<string, CellStatistics> = new Map();

/**
 * Every finished simulation's spikes, summed up for one population: found by
 * the report's path in each simulation's result, weighed against
 * {@link CAMPAIGN_SPIKES_LIMIT_BYTES} before anything is downloaded, then read
 * one file at a time on one worker. What is kept, and cached as it lands, is
 * each cell's count and CV, so the summaries can follow the table's pick of
 * cells; the whole spike tables are dropped once counted.
 */
export function useCampaignSummaries({
  simulations,
  statusMap,
  context,
  reportPath,
  populationName,
  cellCount,
  run,
  groups,
  timeWindow,
  psth,
  enabled,
}: Options): CampaignSummaries {
  const queryClient = useQueryClient();
  const finished = useMemo(
    () => simulations.filter((s) => statusMap.get(s.id) === ActivityStatus.DONE),
    [simulations, statusMap]
  );

  const assets = useQueries({
    queries: finished.map((simulation) => ({
      queryKey: ['campaign-spike-asset', simulation.id, reportPath],
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
    byId: ReadonlyMap<string, CellStatistics>;
  }>();
  const key = `${populationName}\n${cellCount}\n${files?.map((f) => f.asset.id).join(',')}`;
  useEffect(() => {
    if (!enabled || !files || tooLarge || !populationName || cellCount === undefined) return;
    let cancelled = false;
    const worker = new Worker(new URL('../spike-trace.worker.ts', import.meta.url));
    const proxy = Comlink.wrap<SpikeTraceWorkerApi>(worker);
    (async () => {
      const byId = new Map<string, CellStatistics>();
      for (const file of files) {
        if (cancelled) return;
        try {
          const cellStatistics = await queryClient.fetchQuery({
            queryKey: ['campaign-spike-cells', file.asset.id, populationName, cellCount, run],
            queryFn: async () => {
              const buffer = await downloadAsset<ArrayBuffer>({
                entityType: file.entityType,
                entityId: file.resultId,
                id: file.asset.id,
                ctx: context,
              });
              const data = withSimulationTimeWindow(
                await proxy.parseSpikeFile(file.asset.id, buffer),
                run
              );
              const population = data.populations.find((p) => p.name === populationName);
              return cellStatisticsOf(population, cellCount, data.timeRange);
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
      proxy[Comlink.releaseProxy]();
      worker.terminate();
    });
    return () => {
      cancelled = true;
    };
  }, [enabled, files, tooLarge, populationName, cellCount, run, context, queryClient, key]);

  const loaded = statistics?.key === key ? statistics.byId : NO_STATISTICS;
  // Each simulation counted over the span once, then summed up group by group.
  const windowed = useMemo(
    () => new Map([...loaded].map(([id, s]) => [id, windowedCells(s, timeWindow)] as const)),
    [loaded, timeWindow]
  );
  const grouped = useMemo(
    () =>
      groups.map((group) => ({
        name: group.name,
        summaries: new Map(
          [...windowed].map(([id, w]) => [id, summarizeCells(w, group.cells)] as const)
        ),
        courses: new Map(
          [...loaded].map(
            ([id, s]) =>
              [
                id,
                psthSeries(
                  s.spikes,
                  group.cells,
                  s.counts.length,
                  timeWindow ?? s.span ?? [0, s.seconds * 1000],
                  psth
                ),
              ] as const
          )
        ),
      })),
    [groups, windowed, loaded, timeWindow, psth]
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

/** A simulation's result entity and its asset at `path`, or null where it has none. */
export async function reportAssetOf(
  simulationId: string,
  path: string,
  context: WorkspaceContext
): Promise<{ resultId: string; entityType: TEntityTypeDict; asset: IAsset } | null> {
  const executions = await getSimulationExecutions({
    filters: { used__id: simulationId },
    context,
  });
  const resultId = executions.data[0]?.generated?.[0]?.id;
  if (!resultId) return null;
  const result = await getSimulationResult({ id: resultId, context });
  const asset = result.assets?.find((a) => a.path === path);
  return asset ? { resultId, entityType: result.type as TEntityTypeDict, asset } : null;
}

export function cellStatisticsOf(
  population: SpikePopulation | undefined,
  cellCount: number,
  window: { min: number; max: number }
): CellStatistics {
  const { count, isiCv } = computeSpikeStatistics(population, cellCount, window);
  return {
    counts: Uint32Array.from(count),
    cvs: Float32Array.from(isiCv),
    seconds: (window.max - window.min) / 1000,
    span: [window.min, window.max],
    // Copies, so the rest of the file's buffers can go.
    spikes: {
      name: population?.name ?? '',
      nodeIds: population ? population.nodeIds.slice() : new Float64Array(0),
      timestamps: population ? population.timestamps.slice() : new Float32Array(0),
      nodeIdRange: population?.nodeIdRange ?? { min: 0, max: 0 },
    },
  };
}

const NO_SUMMARY: SpikeSummary = {
  meanRate: Number.NaN,
  medianRate: Number.NaN,
  activeFraction: Number.NaN,
  meanCv: Number.NaN,
};

/**
 * A simulation's summary over the cells flagged in `cells`, or over all of
 * them, and over `timeWindow` of the run, counted again from its spikes, or
 * over all of it.
 */
export function summarize(
  statistics: CellStatistics,
  cells: Uint8Array | null,
  timeWindow: [number, number] | null = null
): SpikeSummary {
  return summarizeCells(windowedCells(statistics, timeWindow), cells);
}

/** Each cell's count and CV over `timeWindow` of the run, counted again from its spikes, or over all of it. */
type WindowedCells = { counts: ArrayLike<number>; cvs: ArrayLike<number>; seconds: number };

function windowedCells(
  statistics: CellStatistics,
  timeWindow: [number, number] | null
): WindowedCells {
  if (!timeWindow) return statistics;
  const [from, to] = timeWindow;
  const { count, isiCv } = computeSpikeStatistics(
    spikesBetween(statistics.spikes, from, to),
    statistics.counts.length,
    { min: from, max: to }
  );
  return { counts: count, cvs: isiCv, seconds: (to - from) / 1000 };
}

function summarizeCells(
  { counts, cvs, seconds }: WindowedCells,
  cells: Uint8Array | null
): SpikeSummary {
  let n = 0;
  let spikes = 0;
  let active = 0;
  let most = 0;
  let cvSum = 0;
  let cvCount = 0;
  for (let i = 0; i < counts.length; i++) {
    if (cells && !cells[i]) continue;
    const count = counts[i];
    n += 1;
    spikes += count;
    if (count > 0) active += 1;
    if (count > most) most = count;
    if (!Number.isNaN(cvs[i])) {
      cvSum += cvs[i];
      cvCount += 1;
    }
  }
  if (n === 0 || !(seconds > 0)) return NO_SUMMARY;

  // The median by counting, since counts are whole numbers: no sort per simulation.
  const histogram = new Uint32Array(most + 1);
  for (let i = 0; i < counts.length; i++) if (!cells || cells[i]) histogram[counts[i]] += 1;
  const countAt = (rank: number) => {
    let seen = 0;
    for (let c = 0; c < most; c++) {
      seen += histogram[c];
      if (seen > rank) return c;
    }
    return most;
  };
  const median = n % 2 ? countAt((n - 1) / 2) : (countAt(n / 2 - 1) + countAt(n / 2)) / 2;
  return {
    meanRate: spikes / n / seconds,
    medianRate: median / seconds,
    activeFraction: active / n,
    meanCv: cvCount ? cvSum / cvCount : Number.NaN,
  };
}
