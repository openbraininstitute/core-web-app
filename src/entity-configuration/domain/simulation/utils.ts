import { get, set } from 'es-toolkit/compat';

import { getSimulations } from '@/api/entitycore/queries/simulation/campaign/simulation';
import { AssetLabel } from '@/api/entitycore/types/shared/global';

import type { ISimulation } from '@/api/entitycore/types/entities/simulation';
import type { WorkspaceContext } from '@/types/common';

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
