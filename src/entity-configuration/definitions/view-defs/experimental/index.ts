import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { viewDefForCellMorphology } from '@/entity-configuration/definitions/view-defs/experimental/cell-morphology';
import { viewDefForElectricalCellRecording } from '@/entity-configuration/definitions/view-defs/experimental/electrical-cell-recording';
import { viewDefForEMCellMesh } from '@/entity-configuration/definitions/view-defs/experimental/em-cell-mesh';
import { viewDefForExperimentalBoutonDensity } from '@/entity-configuration/definitions/view-defs/experimental/experimental-bouton-density';
import { viewDefForExperimentalNeuronDensity } from '@/entity-configuration/definitions/view-defs/experimental/experimental-neuron-density';
import { viewDefForExperimentalSynapsesPerConnection } from '@/entity-configuration/definitions/view-defs/experimental/experimental-synapses-per-connection';
import { viewDefForIonChannelRecording } from '@/entity-configuration/definitions/view-defs/experimental/ion-channel-recording';
import { viewDefForUniversalCellMorphology } from '@/entity-configuration/definitions/view-defs/experimental/universal-cell-morphology';

import type { ViewDefinitionConfig } from '@/entity-configuration/definitions/view-defs/types';

export const ViewsDefinition: { [key: string]: ViewDefinitionConfig } = {
  [ExtendedEntitiesTypeDict.CellMorphology]: viewDefForCellMorphology,
  [ExtendedEntitiesTypeDict.UniversalCellMorphology]: viewDefForUniversalCellMorphology,
  [ExtendedEntitiesTypeDict.ElectricalCellRecording]: viewDefForElectricalCellRecording,
  [ExtendedEntitiesTypeDict.IonChannelRecording]: viewDefForIonChannelRecording,
  [ExtendedEntitiesTypeDict.ExperimentalNeuronDensity]: viewDefForExperimentalNeuronDensity,
  [ExtendedEntitiesTypeDict.ExperimentalBoutonDensity]: viewDefForExperimentalBoutonDensity,
  [ExtendedEntitiesTypeDict.ExperimentalSynapsesPerConnection]:
    viewDefForExperimentalSynapsesPerConnection,
  [ExtendedEntitiesTypeDict.EMCellMesh]: viewDefForEMCellMesh,
};
