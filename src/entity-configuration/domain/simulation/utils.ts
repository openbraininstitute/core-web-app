import { get, set } from 'es-toolkit/compat';

import { getSimulations } from '@/api/entitycore/queries/simulation/campaign/simulation';
import { getSimulationExecutions } from '@/api/entitycore/queries/simulation/campaign/simulation-execution';
import {
  CircuitScaleDictionary,
  type TCircuitScaleDictionary,
} from '@/api/entitycore/types/entities/circuit';
import { EntityTypeDict, type TEntityTypeDict } from '@/api/entitycore/types/entity-type';
import { AssetLabel } from '@/api/entitycore/types/shared/global';
import { ObiOneTaskTypeDict, type TObiOneTaskType } from '@/api/one/types/task';

import type { ISimulation } from '@/api/entitycore/types/entities/simulation';
import type { WorkspaceContext } from '@/types/common';

const MACHINE_LAUNCH_SCALES: ReadonlySet<TCircuitScaleDictionary> = new Set([
  CircuitScaleDictionary.PairNeuron,
  CircuitScaleDictionary.SmallMicrocircuit,
]);

const CLUSTER_LAUNCH_SCALES: ReadonlySet<TCircuitScaleDictionary> = new Set([
  CircuitScaleDictionary.Microcircuit,
  CircuitScaleDictionary.Region,
  CircuitScaleDictionary.System,
  CircuitScaleDictionary.WholeBrain,
]);

type TSimulationLaunchInput = {
  entityType: TEntityTypeDict | null;
  scale: TCircuitScaleDictionary | null;
  targetSimulator: string | null;
};

export type TSimulationLaunchTarget = {
  taskType: TObiOneTaskType;
  requiresOfflineTokenConsent: boolean;
};

/**
 * Single source of truth for how a simulation campaign is launched, and therefore for whether it
 * goes through the task system at all — `null` means launch via the small-scale simulator instead,
 * and no task configuration/log stream entries.
 *
 * Order matters: a Brian2 circuit also carries a scale, and a me-model campaign carries neither.
 */
export function resolveSimulationLaunchTarget({
  entityType,
  scale,
  targetSimulator,
}: TSimulationLaunchInput): TSimulationLaunchTarget | null {
  // "Single neuron (beta)" campaigns hang off a me-model, not a circuit, so obi-one's
  // `circuit_simulation` group can't resolve them — it reads `simulation.entity_id` as a Circuit.
  if (entityType === EntityTypeDict.Memodel) {
    return {
      taskType: ObiOneTaskTypeDict.SingleNeuronSimulationExecution,
      requiresOfflineTokenConsent: false,
    };
  }
  if (targetSimulator === 'Brian2') {
    return {
      taskType: ObiOneTaskTypeDict.CircuitSimulationBrian2,
      requiresOfflineTokenConsent: false,
    };
  }
  if (targetSimulator === 'LearningEngine') {
    return { taskType: ObiOneTaskTypeDict.CircuitSimulation, requiresOfflineTokenConsent: false };
  }
  // Scale `single` is the "Synaptome (beta)" circuit; it gets its own task type so it runs on
  // 1 core / 2 GB and bills as a synaptome sim rather than as a generic circuit simulation.
  if (scale === CircuitScaleDictionary.Single) {
    return {
      taskType: ObiOneTaskTypeDict.SingleNeuronSynaptomeSimulationExecution,
      requiresOfflineTokenConsent: false,
    };
  }
  if (scale !== null && MACHINE_LAUNCH_SCALES.has(scale)) {
    return { taskType: ObiOneTaskTypeDict.CircuitSimulation, requiresOfflineTokenConsent: false };
  }
  if (scale !== null && CLUSTER_LAUNCH_SCALES.has(scale)) {
    return { taskType: ObiOneTaskTypeDict.CircuitSimulation, requiresOfflineTokenConsent: true };
  }
  return null;
}

export function resolveSimulationLaunchTaskType(
  input: TSimulationLaunchInput
): TObiOneTaskType | null {
  return resolveSimulationLaunchTarget(input)?.taskType ?? null;
}

// TODO Remove this after the data is migrated
export function migrateConfig(config: any) {
  if (get(config, 'form.type') === 'SimulationsForm') {
    set(config, 'form.type', 'CircuitSimulationScanConfig');
    set(config, 'form.initialize.type', 'CircuitSimulationScanConfig.Initialize');
  }
}

export function hasSimConfigAsset(simulation: ISimulation) {
  return simulation.assets.some((asset) => asset.label === AssetLabel.sonata_simulation_config);
}

export async function getExtendedSimMap(simIds: string[], context: WorkspaceContext | undefined) {
  const chunkSize = 30;

  const promises: ReturnType<typeof getSimulations>[] = [];

  for (let i = 0; i < simIds.length; i += chunkSize) {
    const chunk = simIds.slice(i, i + chunkSize);

    promises.push(
      getSimulations({
        context,
        withFacets: false,
        filters: { id__in: [...chunk] },
      })
    );
  }

  const simulationResponses = await Promise.all(promises);
  const simulations = simulationResponses.flatMap((r) => r.data);

  return new Map(simulations.map((sim) => [sim.id, sim]));
}

export async function resolveExecutions({
  context,
  allSimIds,
}: {
  context: WorkspaceContext | undefined;
  allSimIds: string[];
}) {
  const chunkSize = 30;

  const promises: ReturnType<typeof getSimulationExecutions>[] = [];

  for (let i = 0; i < allSimIds.length; i += chunkSize) {
    const chunk = allSimIds.slice(i, i + chunkSize);

    promises.push(
      getSimulationExecutions({
        context,
        withFacets: false,
        filters: { used__id__in: [...chunk] },
      })
    );
  }

  const executionsResponses = await Promise.all(promises);

  return executionsResponses.flatMap((r) => r.data);
}
