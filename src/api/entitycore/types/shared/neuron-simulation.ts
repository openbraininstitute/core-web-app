import { EntityCoreIdentifiable } from '@/api/entitycore/types/shared/global';

export enum SingleNeuronSimulationStatus {
  started = 'started',
  failure = 'failure',
  success = 'success',
}

export interface ISingleNeuronSimulationBase extends EntityCoreIdentifiable {
  name: string;
  description: string;
  seed: number;
  status: SingleNeuronSimulationStatus;
  injection_location: Array<string>;
  recording_location: Array<string>;
}

export type SimulationStatusFilter = {
  status: SingleNeuronSimulationStatus | null;
};
