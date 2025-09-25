import { getElectricalCellRecordingFiles } from './electrical-cell-recording';
import { getEmodelFiles } from './emodel';
import { getExperimentalBoutonDensityFiles } from './experimental-bouton-density';
import { getExperimentalNeuronDensityFiles } from './experimental-neuron-density';
import { getExperimentalSynapsesPerConnectionFiles } from './experimental-synapses-per-connection';
import { getMEmodelFiles } from './memodel';
import { getCellMorphologyFiles } from './cell-morphology';
import { getSingleNeuronSynaptomeFiles } from './single-neuron-synaptome';
import { getSingleNeuronSimulationFiles } from './single-neuron-simulation';
import { getSingleNeuronSynaptomeSimulationFiles } from './single-neuron-synaptome-simulation';
import { WorkspaceContext } from '@/types/common';
import { FileEntry } from '@/features/entity-download/types';
import { EntityTypeDict, type TEntityTypeDict } from '@/api/entitycore/types';

type GetEntityFilesHandler = (
  entityIds: string[],
  ctx?: WorkspaceContext,
  abortSignal?: AbortSignal
) => AsyncGenerator<FileEntry>;

export const getEntityFilesHandlerMap: Partial<Record<TEntityTypeDict, GetEntityFilesHandler>> = {
  // Experimental data
  [EntityTypeDict.ElectricalCellRecording]: getElectricalCellRecordingFiles,
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
};
