import { get, set } from 'es-toolkit/compat';
import type { ICircuitSimulation } from '@/api/entitycore/types/entities/circuit-simulation';
import { AssetLabel } from '@/api/entitycore/types/shared/global';

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
