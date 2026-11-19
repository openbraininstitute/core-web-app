import { smallScaleSimulatorApi } from '@/api/small-scale-simulator/utils';

// Bluenaas app/infrastructure/storage/epoch.py, CacheKind
export const SimulatorCache = {
  Circuit: 'circuit',
  SingleNeuron: 'single-neuron',
  Mesh: 'mesh',
  TaskConfig: 'task-config',
  Compilation: 'compilation',
  MorphologyPack: 'morphology-pack',
  LfpSummary: 'lfp-summary',
} as const;

export type TSimulatorCache = (typeof SimulatorCache)[keyof typeof SimulatorCache];

export const SIMULATOR_CACHES: Record<TSimulatorCache, { label: string; holds: string }> = {
  [SimulatorCache.Circuit]: {
    label: 'Circuit',
    holds: 'Circuits staged for simulation, their simulation configs and outputs',
  },
  [SimulatorCache.SingleNeuron]: {
    label: 'Single neuron',
    holds: 'ME-models, model candidates, validation outputs and compatibility checks',
  },
  [SimulatorCache.Mesh]: { label: 'Mesh', holds: 'Morphology meshes' },
  [SimulatorCache.TaskConfig]: {
    label: 'Task config',
    holds: 'Task config runs, ion channel builds among them',
  },
  [SimulatorCache.Compilation]: { label: 'Compilation', holds: 'Compiled NEURON mechanisms' },
  [SimulatorCache.MorphologyPack]: {
    label: 'Morphology pack',
    holds: 'Morphology packs for the circuit viewer',
  },
  [SimulatorCache.LfpSummary]: {
    label: 'LFP summary',
    holds: 'LFP report summaries for the results viewer',
  },
};

// 202: the clear starts a new, empty cache and queues the old one for deletion.
type CacheClearStarted = { message: string; job_id: string };

export async function clearSimulatorCache(cache: TSimulatorCache) {
  const api = await smallScaleSimulatorApi();
  return api.delete<CacheClearStarted>(`/admin/cache/${cache}`, {
    headers: { accept: 'application/json' },
  });
}
