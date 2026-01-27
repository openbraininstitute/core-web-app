import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { ViewDefinitionConfig } from '@/entity-configuration/definitions/view-defs/types';
import { viewDefForCellMorphology } from './cell-morphology';
import { viewDefForElectricalCellRecording } from './electrical-cell-recording';
import { viewDefForExperimentalBoutonDensity } from './experimental-bouton-density';
import { viewDefForExperimentalNeuronDensity } from './experimental-neuron-density';
import { viewDefForExperimentalSynapsePerConnection } from './experimental-synapse-per-connection';
import { viewDefForIonChannelRecording } from './ion-channel-recording';

export const ViewsDefinition: { [key: string]: ViewDefinitionConfig } = {
  [ExtendedEntitiesTypeDict.CellMorphology]: viewDefForCellMorphology,
  [ExtendedEntitiesTypeDict.ElectricalCellRecording]: viewDefForElectricalCellRecording,
  [ExtendedEntitiesTypeDict.IonChannelRecording]: viewDefForIonChannelRecording,
  [ExtendedEntitiesTypeDict.ExperimentalNeuronDensity]: viewDefForExperimentalNeuronDensity,
  [ExtendedEntitiesTypeDict.ExperimentalBoutonDensity]: viewDefForExperimentalBoutonDensity,
  [ExtendedEntitiesTypeDict.ExperimentalSynapsesPerConnection]:
    viewDefForExperimentalSynapsePerConnection,
};
