import { viewDefForCellMorphology } from './cell-morphology';
import { viewDefForElectricalCellRecording } from './electrical-cell-recording';
import { viewDefForExperimentalNeuronDensity } from './experimental-neuron-density';
import { viewDefForExperimentalBoutonDensity } from './experimental-bouton-density';
import { viewDefForExperimentalSynapsesPerConnection } from './experimental-synapses-per-connection';
import { viewDefForIonChannelRecording } from './ion-channel-recording';

import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';

import type { ViewDefinitionConfig } from '@/entity-configuration/definitions/view-defs/types';

export const ViewsDefinition: { [key: string]: ViewDefinitionConfig } = {
  [ExtendedEntitiesTypeDict.CellMorphology]: viewDefForCellMorphology,
  [ExtendedEntitiesTypeDict.ElectricalCellRecording]: viewDefForElectricalCellRecording,
  [ExtendedEntitiesTypeDict.IonChannelRecording]: viewDefForIonChannelRecording,
  [ExtendedEntitiesTypeDict.ExperimentalNeuronDensity]: viewDefForExperimentalNeuronDensity,
  [ExtendedEntitiesTypeDict.ExperimentalBoutonDensity]: viewDefForExperimentalBoutonDensity,
  [ExtendedEntitiesTypeDict.ExperimentalSynapsesPerConnection]:
    viewDefForExperimentalSynapsesPerConnection,
};
