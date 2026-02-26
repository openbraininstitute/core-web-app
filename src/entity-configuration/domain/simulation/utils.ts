import { get, set } from 'es-toolkit/compat';

import { getCircuitSimulations } from '@/api/entitycore/queries/simulation/circuit-simulation';
import { getCircuitSimulationExecutions } from '@/api/entitycore/queries/simulation/circuit-simulation-execution';
import { AssetLabel } from '@/api/entitycore/types/shared/global';

import type { ICircuitSimulation } from '@/api/entitycore/types/entities/circuit-simulation';
import type { WorkspaceContext } from '@/types/common';

// TODO Remove this after the data is migrated
export function migrateConfig(config: any) {
  if (get(config, 'form.type') === 'SimulationsForm') {
    set(config, 'form.type', 'CircuitSimulationScanConfig');
    set(config, 'form.initialize.type', 'CircuitSimulationScanConfig.Initialize');
  }
}

export function hasSimConfigAsset(simulation: ICircuitSimulation) {
  return simulation.assets.some((asset) => asset.label === AssetLabel.sonata_simulation_config);
}

export async function getExtendedSimMap(simIds: string[], context: WorkspaceContext | undefined) {
  const chunkSize = 30;

  const promises: ReturnType<typeof getCircuitSimulations>[] = [];

  for (let i = 0; i < simIds.length; i += chunkSize) {
    const chunk = simIds.slice(i, i + chunkSize);

    promises.push(
      getCircuitSimulations({
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

  const promises: ReturnType<typeof getCircuitSimulationExecutions>[] = [];

  for (let i = 0; i < allSimIds.length; i += chunkSize) {
    const chunk = allSimIds.slice(i, i + chunkSize);

    promises.push(
      getCircuitSimulationExecutions({
        context,
        withFacets: false,
        filters: { used__id__in: [...chunk] },
      })
    );
  }

  const executionsResponses = await Promise.all(promises);

  return executionsResponses.flatMap((r) => r.data);
}
