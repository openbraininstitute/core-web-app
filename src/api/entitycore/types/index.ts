import type { ICircuit } from './entities/circuit';
import type { ISingleNeuronSynaptomeSimulation } from '@/api/entitycore/types/entities/single-neuron-synaptome-simulation';
import type { IExperimentalSynapsesPerConnection } from '@/api/entitycore/types/entities/synapses-per-connection';
import type {
  IReconstructionMorphology,
  IReconstructionMorphologyExpanded,
} from '@/api/entitycore/types/entities/reconstruction-morphology';
import type { ISingleNeuronSimulation } from 'src/api/entitycore/types/entities/single-neuron-simulation';
import type { IElectricalCellRecording } from '@/api/entitycore/types/entities/electrical-cell-recording';
import type { ISingleNeuronSynaptome } from '@/api/entitycore/types/entities/single-neuron-synaptome';
import type { IExperimentalNeuronDensity } from '@/api/entitycore/types/entities/neuron-density';
import type { IExperimentalBoutonDensity } from '@/api/entitycore/types/entities/bouton-density';
import type { ISimulationCampaign } from '@/api/entitycore/types/entities/simulation';
import type { IMEModel } from '@/api/entitycore/types/entities/me-model';
import type { IEModel } from '@/api/entitycore/types/entities/e-model';

export * from '@/api/entitycore/types/entity-type';

export {
  IReconstructionMorphologyExpanded,
  IExperimentalSynapsesPerConnection,
  IExperimentalNeuronDensity,
  IExperimentalBoutonDensity,
  IReconstructionMorphology,
  IElectricalCellRecording,
  ISingleNeuronSynaptome,
  IMEModel,
  IEModel,
  ISingleNeuronSimulation,
  ISingleNeuronSynaptomeSimulation,
};

export type EntityCoreDensityObjectTypes =
  | IExperimentalNeuronDensity
  | IExperimentalBoutonDensity
  | IExperimentalSynapsesPerConnection;

type EntityCoreSimulationObjectTypes =
  | ISingleNeuronSynaptomeSimulation
  | ISingleNeuronSimulation
  | ISimulationCampaign;

export type EntityCoreObjectTypes =
  | IExperimentalSynapsesPerConnection
  | ISingleNeuronSynaptomeSimulation
  | IExperimentalNeuronDensity
  | IExperimentalBoutonDensity
  | IReconstructionMorphology
  | IElectricalCellRecording
  | ISingleNeuronSimulation
  | ISingleNeuronSynaptome
  | IMEModel
  | IEModel
  | ISingleNeuronSimulation
  | ICircuit
  | ISimulationCampaign;
