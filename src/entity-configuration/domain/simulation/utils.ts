import { get, set } from 'es-toolkit/compat';

import { getSimulations } from '@/api/entitycore/queries/simulation/campaign/simulation';
import { getSimulationExecutions } from '@/api/entitycore/queries/simulation/campaign/simulation-execution';
import {
  CircuitScaleDictionary,
  type TCircuitScaleDictionary,
} from '@/api/entitycore/types/entities/circuit';
import { AssetLabel } from '@/api/entitycore/types/shared/global';

import type { ISimulation } from '@/api/entitycore/types/entities/simulation';
import type { WorkspaceContext } from '@/types/common';

export const TASK_LAUNCH_SCALES: ReadonlySet<TCircuitScaleDictionary> = new Set([
  CircuitScaleDictionary.Microcircuit,
  CircuitScaleDictionary.Region,
  CircuitScaleDictionary.System,
  CircuitScaleDictionary.WholeBrain,
]);

/** simulations launched via obi-one also expose task configuration/log stream entries. */
export function shouldLaunchSimulationViaTaskSystem({
  scale,
  targetSimulator,
}: {
  scale: TCircuitScaleDictionary | null;
  targetSimulator: string | null;
}): boolean {
  const isSupportedSimulator = targetSimulator === 'Brian2' || targetSimulator === 'LearningEngine';
  return isSupportedSimulator || (scale !== null && TASK_LAUNCH_SCALES.has(scale));
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
