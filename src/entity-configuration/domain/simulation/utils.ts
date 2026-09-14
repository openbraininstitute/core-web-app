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

export type TSimulationLaunchTarget = {
  taskType: TObiOneTaskType;
  requiresOfflineTokenConsent: boolean;
};

/** Launched through the task system only when `smallScalesViaLaunchSystem` is on. */
const SMALL_SCALE_TASK_TYPES: Partial<Record<TCircuitScaleDictionary, TObiOneTaskType>> = {
  [CircuitScaleDictionary.Single]: ObiOneTaskTypeDict.SingleNeuronSynaptomeSimulationExecution,
  [CircuitScaleDictionary.PairNeuron]: ObiOneTaskTypeDict.CircuitSimulation,
  [CircuitScaleDictionary.SmallMicrocircuit]: ObiOneTaskTypeDict.CircuitSimulation,
};

const TASK_LAUNCH_SCALES: ReadonlySet<TCircuitScaleDictionary> = new Set([
  CircuitScaleDictionary.Microcircuit,
  CircuitScaleDictionary.Region,
  CircuitScaleDictionary.System,
  CircuitScaleDictionary.WholeBrain,
]);

/**
 * `null` means the campaign launches via the small-scale simulator.
 *
 * Order matters: a Brian2 circuit also carries a scale, and a me-model campaign carries neither.
 */
export function resolveSimulationLaunchTarget({
  entityType,
  scale,
  targetSimulator,
  smallScalesViaLaunchSystem,
}: {
  entityType: TEntityTypeDict | null;
  scale: TCircuitScaleDictionary | null;
  targetSimulator: string | null;
  smallScalesViaLaunchSystem: boolean;
}): TSimulationLaunchTarget | null {
  // The small scales run as machine jobs, which the launch system never issues an offline token for.
  const smallScaleTarget = (taskType: TObiOneTaskType) =>
    smallScalesViaLaunchSystem ? { taskType, requiresOfflineTokenConsent: false } : null;

  // Single neuron campaigns hang off a me-model, not a circuit, so obi-one's `circuit_simulation`
  // group can't resolve them — it reads `simulation.entity_id` as a Circuit.
  if (entityType === EntityTypeDict.Memodel) {
    return smallScaleTarget(ObiOneTaskTypeDict.SingleNeuronSimulationExecution);
  }
  if (targetSimulator === 'Brian2') {
    return {
      taskType: ObiOneTaskTypeDict.CircuitSimulationBrian2,
      requiresOfflineTokenConsent: true,
    };
  }
  if (targetSimulator === 'LearningEngine') {
    return { taskType: ObiOneTaskTypeDict.CircuitSimulation, requiresOfflineTokenConsent: true };
  }
  if (scale === null) return null;

  const smallScaleTaskType = SMALL_SCALE_TASK_TYPES[scale];
  if (smallScaleTaskType) return smallScaleTarget(smallScaleTaskType);

  return TASK_LAUNCH_SCALES.has(scale)
    ? { taskType: ObiOneTaskTypeDict.CircuitSimulation, requiresOfflineTokenConsent: true }
    : null;
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
