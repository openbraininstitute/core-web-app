import { ViewDefForMEModelWithSynapsesCircuit } from '@/entity-configuration/definitions/view-defs/model/me-model-with-synapses';
import { ViewDefForSingleNeuronSynaptome } from '@/entity-configuration/definitions/view-defs/model/single-neuron-synaptome';
import { ViewDefForPairedNeuronCircuit } from '@/entity-configuration/definitions/view-defs/model/paired-neuron-circuit';
import { ViewDefForSmallMicrocircuit } from '@/entity-configuration/definitions/view-defs/model/small-micro-circuit';
import { ViewDefForIonChannelModel } from '@/entity-configuration/definitions/view-defs/model/ion-channel-model';
import { ViewDefForCircuit } from '@/entity-configuration/definitions/view-defs/model/circuit';
import { ViewDefForMemodel } from '@/entity-configuration/definitions/view-defs/model/memodel';
import { ViewDefForEmodel } from '@/entity-configuration/definitions/view-defs/model/emodel';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';

import type { ViewDefinitionConfig } from '@/entity-configuration/definitions/view-defs/types';

export const ViewsDefinition: { [key: string]: ViewDefinitionConfig } = {
  [ExtendedEntitiesTypeDict.Emodel]: ViewDefForEmodel,
  [ExtendedEntitiesTypeDict.Memodel]: ViewDefForMemodel,
  [ExtendedEntitiesTypeDict.SingleNeuronSynaptome]: ViewDefForSingleNeuronSynaptome,
  [ExtendedEntitiesTypeDict.MEModelCircuit]: ViewDefForMemodel,
  [ExtendedEntitiesTypeDict.Circuit]: ViewDefForCircuit,
  [ExtendedEntitiesTypeDict.SmallMicrocircuit]: ViewDefForSmallMicrocircuit,
  [ExtendedEntitiesTypeDict.PairedNeuronCircuit]: ViewDefForPairedNeuronCircuit,
  [ExtendedEntitiesTypeDict.IonChannelModel]: ViewDefForIonChannelModel,
  [ExtendedEntitiesTypeDict.MEModelWithSynapses]: ViewDefForMEModelWithSynapsesCircuit,
};
