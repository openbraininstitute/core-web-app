import { get, set } from 'es-toolkit/compat';

// TODO Remove this after the data is migrated
export function migrateConfig(config: any) {
  if (get(config, 'form.type') === 'SimulationsForm') {
    set(config, 'form.type', 'CircuitSimulationScanConfig');
    set(config, 'form.initialize.type', 'CircuitSimulationScanConfig.Initialize');
  }
}
