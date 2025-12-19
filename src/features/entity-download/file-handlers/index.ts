import { EntityTypeDict, type TEntityTypeDict } from '@/api/entitycore/types';
import type { FileEntry } from '@/features/entity-download/types';
import type { WorkspaceContext } from '@/types/common';
import { getCellMorphologyFiles } from './cell-morphology';
import { getElectricalCellRecordingFiles } from './electrical-cell-recording';
import { getEmodelFiles } from './emodel';
import { getExperimentalBoutonDensityFiles } from './experimental-bouton-density';
import { getExperimentalNeuronDensityFiles } from './experimental-neuron-density';
import { getExperimentalSynapsesPerConnectionFiles } from './experimental-synapses-per-connection';
import { getIonChannelModelFiles } from './ion-channel-model';
import { getIonChannellRecordingFiles } from './ion-channel-recording';
import { getMEmodelFiles } from './memodel';
import { getNotebookFiles } from './notebook';
import { getSingleNeuronSimulationFiles } from './single-neuron-simulation';
import { getSingleNeuronSynaptomeFiles } from './single-neuron-synaptome';
import { getSingleNeuronSynaptomeSimulationFiles } from './single-neuron-synaptome-simulation';

type GetEntityFilesHandler = (
  entityIds: string[],
  ctx?: WorkspaceContext,
  abortSignal?: AbortSignal,
) => AsyncGenerator<FileEntry>;

export const getEntityFilesHandlerMap: Partial<Record<TEntityTypeDict, GetEntityFilesHandler>> = {
  // Experimental data
  [EntityTypeDict.ElectricalCellRecording]: getElectricalCellRecordingFiles,
  [EntityTypeDict.IonChannelRecording]: getIonChannellRecordingFiles,
  [EntityTypeDict.ExperimentalBoutonDensity]: getExperimentalBoutonDensityFiles,
  [EntityTypeDict.ExperimentalNeuronDensity]: getExperimentalNeuronDensityFiles,
  [EntityTypeDict.ExperimentalSynapsesPerConnection]: getExperimentalSynapsesPerConnectionFiles,
  [EntityTypeDict.CellMorphology]: getCellMorphologyFiles,
  // Model data
  [EntityTypeDict.Emodel]: getEmodelFiles,
  [EntityTypeDict.Memodel]: getMEmodelFiles,
  [EntityTypeDict.SingleNeuronSynaptome]: getSingleNeuronSynaptomeFiles,
  [EntityTypeDict.SingleNeuronSimulation]: getSingleNeuronSimulationFiles,
  [EntityTypeDict.SingleNeuronSynaptomeSimulation]: getSingleNeuronSynaptomeSimulationFiles,
  [EntityTypeDict.IonChannelModel]: getIonChannelModelFiles,
  [EntityTypeDict.Notebook]: getNotebookFiles,
};
