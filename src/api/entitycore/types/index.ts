import type { IExperimentalSynapsesPerConnection } from '@/api/entitycore/types/entities/synapses-per-connection';
import type { IReconstructionMorphology } from '@/api/entitycore/types/entities/reconstruction-morphology';
import type { IElectricalCellRecording } from '@/api/entitycore/types/entities/electrical-cell-recording';
import type { ISingleNeuronSynaptome } from '@/api/entitycore/types/entities/single-neuron-synaptome';
import type { IExperimentalNeuronDensity } from '@/api/entitycore/types/entities/neuron-density';
import type { IExperimentalBoutonDensity } from '@/api/entitycore/types/entities/bouton-density';
import type { IMEModel } from '@/api/entitycore/types/entities/me-model';
import type { IEModel } from '@/api/entitycore/types/entities/e-model';
import type { ISingleNeuronSimulation } from './entities/single-neuron-simulation';

export type * from '@/api/entitycore/types/entity-type';

export {
  IExperimentalSynapsesPerConnection,
  IExperimentalNeuronDensity,
  IExperimentalBoutonDensity,
  IReconstructionMorphology,
  IElectricalCellRecording,
  ISingleNeuronSynaptome,
  IMEModel,
  IEModel,
  ISingleNeuronSimulation,
};

export type EntityCoreDensityObjectTypes =
  | IExperimentalNeuronDensity
  | IExperimentalBoutonDensity
  | IExperimentalSynapsesPerConnection;

export type EntityCoreObjectTypes =
  | IExperimentalSynapsesPerConnection
  | IExperimentalNeuronDensity
  | IExperimentalBoutonDensity
  | IReconstructionMorphology
  | IElectricalCellRecording
  | ISingleNeuronSynaptome
  | IMEModel
  | IEModel
  | ISingleNeuronSimulation;