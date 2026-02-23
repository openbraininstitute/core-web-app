import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { ViewDefForCircuit } from '@/entity-configuration/definitions/view-defs/model/circuit';
import { ViewDefForComputationallySynthesizedCellMorphology } from '@/entity-configuration/definitions/view-defs/model/computationally-synthesized-morphology';
import { ViewDefForEmodel } from '@/entity-configuration/definitions/view-defs/model/emodel';
import { ViewDefForIonChannelModel } from '@/entity-configuration/definitions/view-defs/model/ion-channel-model';
import { ViewDefForMEModelWithSynapsesCircuit } from '@/entity-configuration/definitions/view-defs/model/me-model-with-synapses';
import { ViewDefForMemodel } from '@/entity-configuration/definitions/view-defs/model/memodel';
import { ViewDefForMicrocircuit } from '@/entity-configuration/definitions/view-defs/model/microcircuit';
import { ViewDefForPairedNeuronCircuit } from '@/entity-configuration/definitions/view-defs/model/paired-neuron-circuit';
import { ViewDefForSingleNeuronCircuit } from '@/entity-configuration/definitions/view-defs/model/single-neuron-circuit';
import { ViewDefForSingleNeuronSynaptome } from '@/entity-configuration/definitions/view-defs/model/single-neuron-synaptome';
import { ViewDefForSmallMicrocircuit } from '@/entity-configuration/definitions/view-defs/model/small-micro-circuit';

import type { ViewDefinitionConfig } from '@/entity-configuration/definitions/view-defs/types';

export const ViewsDefinition: { [key: string]: ViewDefinitionConfig } = {
  [ExtendedEntitiesTypeDict.Emodel]: ViewDefForEmodel,
  [ExtendedEntitiesTypeDict.Memodel]: ViewDefForMemodel,
  [ExtendedEntitiesTypeDict.SingleNeuronSynaptome]: ViewDefForSingleNeuronSynaptome,
  [ExtendedEntitiesTypeDict.MemodelCircuit]: ViewDefForMemodel,
  [ExtendedEntitiesTypeDict.SingleNeuronCircuit]: ViewDefForSingleNeuronCircuit,
  [ExtendedEntitiesTypeDict.PairedNeuronCircuit]: ViewDefForPairedNeuronCircuit,
  [ExtendedEntitiesTypeDict.SmallMicrocircuit]: ViewDefForSmallMicrocircuit,
  [ExtendedEntitiesTypeDict.Microcircuit]: ViewDefForMicrocircuit,
  [ExtendedEntitiesTypeDict.Circuit]: ViewDefForCircuit,
  [ExtendedEntitiesTypeDict.IonChannelModel]: ViewDefForIonChannelModel,
  [ExtendedEntitiesTypeDict.MEModelWithSynapses]: ViewDefForMEModelWithSynapsesCircuit,
  [ExtendedEntitiesTypeDict.ComputationallySynthesizedCellMorphology]:
    ViewDefForComputationallySynthesizedCellMorphology,
};
