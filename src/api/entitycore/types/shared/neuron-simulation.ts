import type {
  EntityCoreIdentifiable,
  EntityCoreOwnership,
} from '@/api/entitycore/types/shared/global';

export interface ISingleNeuronSimulationBase extends EntityCoreIdentifiable, EntityCoreOwnership {
  name: string;
  description: string;
  seed: number;
  injection_location: Array<string>;
  recording_location: Array<string>;
}

export interface ICircuitSimulationBase extends EntityCoreIdentifiable, EntityCoreOwnership {
  name: string;
  description: string;
  simulation_campaign_id: string;
  entity_id: string;
  scan_parameters: {
    [key: string]: any;
  };
}
