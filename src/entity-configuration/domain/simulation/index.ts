// TODO: this data type should be moved from this file
import { DataType } from '@/constants/explore-section/list-views';

export * from '@/entity-configuration/domain/simulation/single-neuron-synaptome-simulation';
export * from '@/entity-configuration/domain/simulation/single-neuron-simulation';
export * from '@/entity-configuration/domain/simulation/simulation-campaign';

export const SIMULATIONS_DATATYPES = [
  DataType.SingleNeuronSimulation,
  DataType.SingleNeuronSynaptomeSimulation,
  DataType.SimulationCampaign,
] as const;

enum SimulationTypeNames {
  SINGLE_NEURON_SIMULATION = 'single-neuron-simulation',
  SYNAPTOME_SIMULATION = 'synaptome-simulation',
  SIMULATION_CAMPAIGN = 'simulation-campaign',
}

type TModelTypeNames = `${SimulationTypeNames}`;

type ModelDataType = (typeof SIMULATIONS_DATATYPES)[number];
