import type { ICircuit } from './entities/circuit';
import type { ISingleNeuronSynaptomeSimulation } from '@/api/entitycore/types/entities/single-neuron-synaptome-simulation';
import type { IExperimentalSynapsesPerConnection } from '@/api/entitycore/types/entities/synapses-per-connection';
import type {
  ICellMorphology,
  ICellMorphologyExpanded,
} from '@/api/entitycore/types/entities/cell-morphology';
import type { ISingleNeuronSimulation } from 'src/api/entitycore/types/entities/single-neuron-simulation';
import type { IElectricalCellRecording } from '@/api/entitycore/types/entities/electrical-cell-recording';
import type { ISingleNeuronSynaptome } from '@/api/entitycore/types/entities/single-neuron-synaptome';
import type { IExperimentalNeuronDensity } from '@/api/entitycore/types/entities/neuron-density';
import type { IExperimentalBoutonDensity } from '@/api/entitycore/types/entities/bouton-density';
import type { ICircuitSimulationCampaign } from '@/api/entitycore/types/entities/circuit-simulation-campaign';
import type { IMEModel } from '@/api/entitycore/types/entities/me-model';
import type { IEModel } from '@/api/entitycore/types/entities/e-model';
import type { IonChannelModel } from '@/api/entitycore/types/entities/ion-channel';
import type { IEMCellMesh } from '@/api/entitycore/types/entities/em-cell-mesh';

export * from '@/api/entitycore/types/entity-type';

export {
  ICellMorphologyExpanded,
  IExperimentalSynapsesPerConnection,
  IExperimentalNeuronDensity,
  IExperimentalBoutonDensity,
  ICellMorphology,
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

export type EntityCoreSimulationObjectTypes =
  | ISingleNeuronSynaptomeSimulation
  | ISingleNeuronSimulation
  | ICircuitSimulationCampaign;

export type EntityCoreObjectTypes =
  | IExperimentalSynapsesPerConnection
  | ISingleNeuronSynaptomeSimulation
  | IExperimentalNeuronDensity
  | IExperimentalBoutonDensity
  | ICellMorphology
  | IElectricalCellRecording
  | ISingleNeuronSimulation
  | ISingleNeuronSynaptome
  | IMEModel
  | IEModel
  | ISingleNeuronSimulation
  | ICircuit
  | ICircuitSimulationCampaign
  | IonChannelModel
  | IEMCellMesh;
