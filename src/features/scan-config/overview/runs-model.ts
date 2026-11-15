import { ActivityStatus } from '@/api/entitycore/types/shared/activity';
import { AssetLabel } from '@/api/entitycore/types/shared/global';
import {
  getLatestSimulationExecution,
  getSimulationStatusFromExecutions,
} from '@/entity-configuration/domain/simulation/status-utils';
import { isPlainObject } from '@/features/scan-config/components/utils';
import { isType, ScanConfigUIElementDict } from '@/features/scan-config/types';

import type { IExecutionActivity } from '@/api/entitycore/types/entities/execution';
import type { ISimulation } from '@/api/entitycore/types/entities/simulation';
import type { Config, ConfigSchema } from '@/features/scan-config/types';

export type TSimulationRow = {
  simulation: ISimulation;
  status: ActivityStatus;
  /** The latest execution: when it ran, and its launch-system job (for its log). */
  execution: IExecutionActivity | undefined;
  /** How long the latest execution ran, once it has ended. */
  durationMs: number | undefined;
};

/** Each simulation with its status and latest execution, as the Simulations tab works them out. */
export function simulationRows(
  simulations: ISimulation[],
  executions: IExecutionActivity[]
): TSimulationRow[] {
  return simulations.map((simulation) => {
    const own = executions.filter((e) => e.used?.some((used) => used.id === simulation.id));
    const execution = getLatestSimulationExecution({ executions: own });
    const status = getSimulationStatusFromExecutions({
      simulation,
      executions: own,
      createdStatus: ActivityStatus.CREATED,
      errorStatus: ActivityStatus.ERROR,
    });
    const start = execution?.start_time ? Date.parse(execution.start_time) : Number.NaN;
    const end = execution?.end_time ? Date.parse(execution.end_time) : Number.NaN;
    const durationMs = end >= start ? end - start : undefined;
    return { simulation, status, execution, durationMs };
  });
}

/** "2 done · 1 failed", in a fixed order. */
export function statusCounts(rows: TSimulationRow[]) {
  const order = [
    ActivityStatus.DONE,
    ActivityStatus.RUNNING,
    ActivityStatus.PENDING,
    ActivityStatus.CREATED,
    ActivityStatus.ERROR,
    ActivityStatus.CANCELLED,
  ];
  return order
    .map((status) => ({ status, count: rows.filter((r) => r.status === status).length }))
    .filter(({ count }) => count > 0);
}

export const STATUS_WORD: Record<ActivityStatus, string> = {
  [ActivityStatus.CREATED]: 'not launched',
  [ActivityStatus.PENDING]: 'queued',
  [ActivityStatus.RUNNING]: 'running',
  [ActivityStatus.DONE]: 'done',
  [ActivityStatus.ERROR]: 'failed',
  [ActivityStatus.CANCELLED]: 'cancelled',
};

export function formatDuration(ms: number): string {
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s} s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min ${s % 60} s`;
  return `${Math.floor(m / 60)} h ${m % 60} min`;
}

export type TConfigBlock = { rootElement: string; entry: string; name: string; kind: string };
export type TConfigGroup = { rootElement: string; title: string; blocks: TConfigBlock[] };

/**
 * What a campaign's config sets up, for a reader: its duration, and the blocks of each
 * dictionary (neuron sets, stimuli, recordings, …) by name and kind, in the editor's order.
 * Empty dictionaries are left out.
 */
export function describeConfig(schema: ConfigSchema, config: Config) {
  const initialize = config.initialize;
  const length = isPlainObject(initialize) ? initialize.simulation_length : undefined;

  const groups: TConfigGroup[] = Object.entries(schema.properties ?? {})
    .flatMap(([rootElement, spec]) => {
      if (isType(spec) || spec.ui_element !== ScanConfigUIElementDict.BlockDictionary) return [];
      const entries = config[rootElement];
      if (!isPlainObject(entries) || Object.keys(entries).length === 0) return [];
      const blocks = Object.entries(entries).map(([entry, value]) => {
        const type = isPlainObject(value) && typeof value.type === 'string' ? value.type : '';
        const variant = spec.additionalProperties.oneOf?.find(
          (v) => v.properties?.type?.const === type
        );
        return { rootElement, entry, name: entry, kind: variant?.title ?? type };
      });
      return [{ rootElement, title: spec.title, blocks, order: spec.group_order }];
    })
    .sort((a, b) => a.order - b.order)
    .map(({ order: _order, ...group }) => group);

  return {
    /** A number, or a list when the duration is swept. */
    durationMs: typeof length === 'number' || Array.isArray(length) ? length : undefined,
    groups,
  };
}

/** What a result file holds, in a word or two. */
export function outputKind(label: string, path: string): string {
  if (label === AssetLabel.spike_report) return 'Spikes';
  if (label === AssetLabel.voltage_report) return 'Voltages';
  const stem = path
    .split('/')
    .at(-1)
    ?.replace(/\.[^.]+$/, '');
  return stem || label;
}

/**
 * A spike file at a glance: how many spikes, how many cells fired, their mean rate over the
 * run, and the window and cell range a raster of it spans.
 */
export function spikeSummary(
  data: {
    populations: Array<{ nodeIds: ArrayLike<number>; timestamps: ArrayLike<number> }>;
    timeRange: { min: number; max: number };
    nodeIdRange: { min: number; max: number };
  },
  durationMs?: number
) {
  let spikes = 0;
  const cells = new Set<string>();
  data.populations.forEach((population, p) => {
    spikes += population.timestamps.length;
    for (let i = 0; i < population.nodeIds.length; i += 1)
      cells.add(`${p}:${population.nodeIds[i]}`);
  });
  const windowEnd = durationMs ?? data.timeRange.max;
  const seconds = windowEnd / 1000;
  return {
    spikes,
    cellsFiring: cells.size,
    meanRateHz: cells.size && seconds > 0 ? spikes / cells.size / seconds : undefined,
    window: [0, windowEnd] as [number, number],
    cellRange: [data.nodeIdRange.min, data.nodeIdRange.max] as [number, number],
  };
}
