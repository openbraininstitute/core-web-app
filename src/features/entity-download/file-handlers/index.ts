import { getElectricalCellRecordingFiles } from './electrical-cell-recording';
import { getEmodelFiles } from './emodel';
import { getExperimentalBoutonDensityFiles } from './experimental-bouton-density';
import { getExperimentalNeuronDensityFiles } from './experimental-neuron-density';
import { getExperimentalSynapsesPerConnectionFiles } from './experimental-synapses-per-connection';
import { getMEmodelFiles } from './memodel';
import { getCellMorphologyFiles } from './cell-morphology';
import { getSingleNeuronSynaptomeFiles } from './single-neuron-synaptome';
import { WorkspaceContext } from '@/types/common';
import { FileEntry } from '@/features/entity-download/types';
import { EntityTypeEnum, EntityTypeValue } from '@/api/entitycore/types';

type GetEntityFilesHandler = (
  entityIds: string[],
  ctx?: WorkspaceContext,
  abortSignal?: AbortSignal
) => AsyncGenerator<FileEntry>;

export const getEntityFilesHandlerMap: Partial<Record<EntityTypeValue, GetEntityFilesHandler>> = {
  // Experimental data
  [EntityTypeEnum.ElectricalCellRecording]: getElectricalCellRecordingFiles,
  [EntityTypeEnum.ExperimentalBoutonDensity]: getExperimentalBoutonDensityFiles,
  [EntityTypeEnum.ExperimentalNeuronDensity]: getExperimentalNeuronDensityFiles,
  [EntityTypeEnum.ExperimentalSynapsesPerConnection]: getExperimentalSynapsesPerConnectionFiles,
  [EntityTypeEnum.CellMorphology]: getCellMorphologyFiles,
  // Model data
  [EntityTypeEnum.Emodel]: getEmodelFiles,
  [EntityTypeEnum.Memodel]: getMEmodelFiles,
  [EntityTypeEnum.SingleNeuronSynaptome]: getSingleNeuronSynaptomeFiles,
};
