// TODO: this data type should be moved from this file "/explore-section/list-views"
import { ExtendedEntitiesType } from '@/api/entitycore/types/extended-entity-type';

export * from '@/entity-configuration/domain/simulation/single-neuron-synaptome-simulation';
export * from '@/entity-configuration/domain/simulation/single-neuron-simulation';
export * from '@/entity-configuration/domain/simulation/simulation-campaign';

export const SIMULATIONS_DATATYPES = [
  ExtendedEntitiesType.SingleNeuronSimulation,
  ExtendedEntitiesType.SingleNeuronSynaptomeSimulation,
  ExtendedEntitiesType.SimulationCampaign,
] as const;

export enum SimulationTypeNames {
  SINGLE_NEURON_SIMULATION = 'single-neuron-simulation',
  SYNAPTOME_SIMULATION = 'synaptome-simulation',
  SIMULATION_CAMPAIGN = 'simulation-campaign',
}
