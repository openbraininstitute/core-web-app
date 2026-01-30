import { get, set } from 'es-toolkit/compat';
import { getCircuitSimulations } from '@/api/entitycore/queries/simulation/circuit-simulation';
import type { ICircuitSimulation } from '@/api/entitycore/types/entities/circuit-simulation';
import { AssetLabel } from '@/api/entitycore/types/shared/global';
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
  const simulationsResponse = await getCircuitSimulations({
    context,
    withFacets: false,
    filters: { id__in: simIds },
  });

  const simulations = simulationsResponse.data;
  return new Map(simulations.map((sim) => [sim.id, sim]));
}
