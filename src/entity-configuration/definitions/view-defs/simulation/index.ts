import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';

import { viewDefForIonChannelModelSimulation } from './ion-channel-model-simulation';
import { viewDefForMEModelCircuitSimulation } from './memodel-circuit-simulation';
import { viewDefForMicrocircuitSimulation } from './microcircuit-simulation';
import { viewDefForPairedNeuronCircuitSimulation } from './paired-neuron-circuit-simulation';
import { viewDefForRegionCircuitSimulation } from './region-circuit-simulation';
import { viewDefForSimulationCampaign } from './simulation-campaign';
import { viewDefForSingleNeuronCircuitSimulation } from './single-neuron-circuit-simulation';
import { viewDefForSingleNeuronSimulation } from './single-neuron-simulation';
import { viewDefForSingleNeuronSynaptomeSimulation } from './single-neuron-synaptome-simulation';
import { viewDefForSmallMicrocircuitSimulation } from './small-microcircuit-simulation';
import { viewDefForWholeBrainCircuitSimulation } from './whole-brain-circuit-simulation';

import type { ViewDefinitionConfig } from '@/entity-configuration/definitions/view-defs/types';

export const ViewsDefinition: { [key: string]: ViewDefinitionConfig } = {
  [ExtendedEntitiesTypeDict.SingleNeuronSimulation]: viewDefForSingleNeuronSimulation,
  [ExtendedEntitiesTypeDict.SingleNeuronSynaptomeSimulation]:
    viewDefForSingleNeuronSynaptomeSimulation,
  [ExtendedEntitiesTypeDict.SimulationCampaign]: viewDefForSimulationCampaign,
  [ExtendedEntitiesTypeDict.SingleNeuronCircuitSimulation]: viewDefForSingleNeuronCircuitSimulation,
  [ExtendedEntitiesTypeDict.PairedNeuronCircuitSimulation]: viewDefForPairedNeuronCircuitSimulation,
  [ExtendedEntitiesTypeDict.SmallMicrocircuitSimulation]: viewDefForSmallMicrocircuitSimulation,
  [ExtendedEntitiesTypeDict.MicrocircuitSimulation]: viewDefForMicrocircuitSimulation,
  [ExtendedEntitiesTypeDict.MemodelCircuitSimulation]: viewDefForMEModelCircuitSimulation,
  [ExtendedEntitiesTypeDict.IonChannelModelSimulation]: viewDefForIonChannelModelSimulation,
  [ExtendedEntitiesTypeDict.RegionCircuitSimulation]: viewDefForRegionCircuitSimulation,
  [ExtendedEntitiesTypeDict.WholeBrainCircuitSimulation]: viewDefForWholeBrainCircuitSimulation,
};
