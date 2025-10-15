import { ViewDefForEmodel } from './emodel';
import { ViewDefForMemodel } from './memodel';
import { ViewDefForSingleNeuronSynaptome } from './single-neuron-synaptome';
import { ViewDefForCircuit } from './circuit';
import { ViewDefForSmallMicrocircuit } from './small-micro-circuit';
import { ViewDefForPairedNeuronCircuit } from './paired-neuron-circuit';
import { ViewDefForIonChannelModel } from './ion-channel-model';

import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { ViewDefinitionConfig } from '@/entity-configuration/definitions/view-defs/types';

export const ViewsDefinition: { [key: string]: ViewDefinitionConfig } = {
  [ExtendedEntitiesTypeDict.Emodel]: ViewDefForEmodel,
  [ExtendedEntitiesTypeDict.Memodel]: ViewDefForMemodel,
  [ExtendedEntitiesTypeDict.SingleNeuronSynaptome]: ViewDefForSingleNeuronSynaptome,
  [ExtendedEntitiesTypeDict.Circuit]: ViewDefForCircuit,
  [ExtendedEntitiesTypeDict.SmallMicrocircuit]: ViewDefForSmallMicrocircuit,
  [ExtendedEntitiesTypeDict.PairedNeuronCircuit]: ViewDefForPairedNeuronCircuit,
  [ExtendedEntitiesTypeDict.IonChannelModel]: ViewDefForIonChannelModel,
};
