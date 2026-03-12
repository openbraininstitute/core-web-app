import { EntityTypeDict, type TEntityTypeDict } from '@/api/entitycore/types';

import { getCellMorphologyFiles } from './cell-morphology';
import { getCircuitFiles } from './circuit';
import { getCircuitSimulationFiles } from './circuit-simulation';
import { getElectricalCellRecordingFiles } from './electrical-cell-recording';
import { getEMCellMeshFiles } from './em-cell-mesh';
import { getEmodelFiles } from './emodel';
import { getExperimentalBoutonDensityFiles } from './experimental-bouton-density';
import { getExperimentalNeuronDensityFiles } from './experimental-neuron-density';
import { getExperimentalSynapsesPerConnectionFiles } from './experimental-synapses-per-connection';
import { getIonChannelModelFiles } from './ion-channel-model';
import { getIonChannelRecordingFiles } from './ion-channel-recording';
import { getMEmodelFiles } from './memodel';
import { getNotebookFiles } from './notebook';
import { getSingleNeuronSimulationFiles } from './single-neuron-simulation';
import { getSingleNeuronSynaptomeFiles } from './single-neuron-synaptome';
import { getSingleNeuronSynaptomeSimulationFiles } from './single-neuron-synaptome-simulation';

import type { FileEntry } from '@/features/entity-download/types';
import type { WorkspaceContext } from '@/types/common';

type GetEntityFilesHandler = (
  entityIds: string[],
  ctx?: WorkspaceContext,
  abortSignal?: AbortSignal
) => AsyncGenerator<FileEntry>;

export const getEntityFilesHandlerMap: Partial<Record<TEntityTypeDict, GetEntityFilesHandler>> = {
  // Experimental data
  [EntityTypeDict.ElectricalCellRecording]: getElectricalCellRecordingFiles,
  [EntityTypeDict.IonChannelRecording]: getIonChannelRecordingFiles,
  [EntityTypeDict.ExperimentalBoutonDensity]: getExperimentalBoutonDensityFiles,
  [EntityTypeDict.ExperimentalNeuronDensity]: getExperimentalNeuronDensityFiles,
  [EntityTypeDict.ExperimentalSynapsesPerConnection]: getExperimentalSynapsesPerConnectionFiles,
  [EntityTypeDict.CellMorphology]: getCellMorphologyFiles,
  [EntityTypeDict.EMCellMesh]: getEMCellMeshFiles,
  // Model data
  [EntityTypeDict.Emodel]: getEmodelFiles,
  [EntityTypeDict.Memodel]: getMEmodelFiles,
  [EntityTypeDict.SingleNeuronSynaptome]: getSingleNeuronSynaptomeFiles,
  [EntityTypeDict.IonChannelModel]: getIonChannelModelFiles,
  [EntityTypeDict.Notebook]: getNotebookFiles,
  [EntityTypeDict.Circuit]: getCircuitFiles,
  // Simulation data
  [EntityTypeDict.SingleNeuronSimulation]: getSingleNeuronSimulationFiles,
  [EntityTypeDict.SingleNeuronSynaptomeSimulation]: getSingleNeuronSynaptomeSimulationFiles,
  [EntityTypeDict.SimulationCampaign]: getCircuitSimulationFiles,
};
