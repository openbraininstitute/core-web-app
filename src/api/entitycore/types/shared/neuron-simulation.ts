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
  injectionLocation: string[];
  recordingLocation: string[];
}

export type SimulationStatusFilter = {
  status: SingleNeuronSimulationStatus | null;
};
