import type {
  EntityCoreIdentifiable,
  EntityCoreOwnership,
} from '@/api/entitycore/types/shared/global';

export enum SingleNeuronSimulationStatus {
  started = 'started',
  failure = 'failure',
  success = 'success',
}

export interface ISingleNeuronSimulationBase extends EntityCoreIdentifiable, EntityCoreOwnership {
  name: string;
  description: string;
  seed: number;
  status: SingleNeuronSimulationStatus;
  injection_location: string[];
  recording_location: string[];
}

export type SimulationStatusFilter = {
  status: SingleNeuronSimulationStatus | null;
};

export interface ICircuitSimulationBase extends EntityCoreIdentifiable, EntityCoreOwnership {
  name: string;
  description: string;
  simulation_campaign_id: string;
  entity_id: string;
  scan_parameters: {
    [key: string]: any;
  };
}
