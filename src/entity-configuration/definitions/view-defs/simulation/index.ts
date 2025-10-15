import { viewDefForSingleNeuronSimulation } from './single-neuron-simulation';
import { viewDefForSingleNeuronSynaptomeSimulation } from './single-neuron-synaptome-simulation';
import { viewDefForSimulationCampaign } from './simulation-campaign';
import { viewDefForPairedNeuronCircuitSimulation } from './paired-neuron-circuit-simulation';
import { viewDefForSmallMicrocircuitSimulation } from './small-microcircuit-simulation';

import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';

import type { ViewDefinitionConfig } from '@/entity-configuration/definitions/view-defs/types';

export const ViewsDefinition: { [key: string]: ViewDefinitionConfig } = {
  [ExtendedEntitiesTypeDict.SingleNeuronSimulation]: viewDefForSingleNeuronSimulation,
  [ExtendedEntitiesTypeDict.SingleNeuronSynaptomeSimulation]:
    viewDefForSingleNeuronSynaptomeSimulation,
  [ExtendedEntitiesTypeDict.SimulationCampaign]: viewDefForSimulationCampaign,
  [ExtendedEntitiesTypeDict.PairedNeuronCircuitSimulation]: viewDefForPairedNeuronCircuitSimulation,
  [ExtendedEntitiesTypeDict.SmallMicrocircuitSimulation]: viewDefForSmallMicrocircuitSimulation,
};
