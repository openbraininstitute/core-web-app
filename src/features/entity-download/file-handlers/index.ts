import { EntityTypeDict, type TEntityTypeDict } from '@/api/entitycore/types';

import { getNotebookResultFiles } from './analysis-notebook-result';
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
import { getSimulatableExtracellularRecordingArrayFiles } from './simulatable-extracellular-recording-array';
import { getSingleNeuronSimulationFiles } from './single-neuron-simulation';
import { getSingleNeuronSynaptomeFiles } from './single-neuron-synaptome';
import { getSingleNeuronSynaptomeSimulationFiles } from './single-neuron-synaptome-simulation';
import { getTaskResultFiles } from './task-result';

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
  // every workflow result shares the `task_result` type; the handler works off the record's assets
  [EntityTypeDict.TaskResult]: getTaskResultFiles,
  [EntityTypeDict.EMCellMesh]: getEMCellMeshFiles,
  // Model data
  [EntityTypeDict.Emodel]: getEmodelFiles,
  [EntityTypeDict.Memodel]: getMEmodelFiles,
  [EntityTypeDict.SingleNeuronSynaptome]: getSingleNeuronSynaptomeFiles,
  [EntityTypeDict.IonChannelModel]: getIonChannelModelFiles,
  [EntityTypeDict.AnalysisNotebookTemplate]: getNotebookFiles,
  [EntityTypeDict.AnalysisNotebookResult]: getNotebookResultFiles,
  [EntityTypeDict.Circuit]: getCircuitFiles,
  [EntityTypeDict.SimulatableExtracellularRecordingArray]:
    getSimulatableExtracellularRecordingArrayFiles,
  // Simulation data
  [EntityTypeDict.SingleNeuronSimulation]: getSingleNeuronSimulationFiles,
  [EntityTypeDict.SingleNeuronSynaptomeSimulation]: getSingleNeuronSynaptomeSimulationFiles,
  [EntityTypeDict.SimulationCampaign]: getCircuitSimulationFiles,
};
