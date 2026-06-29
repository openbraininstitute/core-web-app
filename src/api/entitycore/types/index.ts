import type { ISingleNeuronSimulation } from 'src/api/entitycore/types/entities/single-neuron-simulation';
import type { IExperimentalBoutonDensity } from '@/api/entitycore/types/entities/bouton-density';
import type {
  ICellMorphology,
  ICellMorphologyExpanded,
} from '@/api/entitycore/types/entities/cell-morphology';
import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import type { IEModel } from '@/api/entitycore/types/entities/e-model';
import type { IElectricalCellRecording } from '@/api/entitycore/types/entities/electrical-cell-recording';
import type { IEMCellMesh } from '@/api/entitycore/types/entities/em-cell-mesh';
import type { IonChannelModel } from '@/api/entitycore/types/entities/ion-channel';
import type { IIonChannelModelingCampaign } from '@/api/entitycore/types/entities/ion-channel-modeling-campaign';
import type { IIonChannelRecording } from '@/api/entitycore/types/entities/ion-channel-recording';
import type { IMEModel } from '@/api/entitycore/types/entities/me-model';
import type { IExperimentalNeuronDensity } from '@/api/entitycore/types/entities/neuron-density';
import type { ISimulatableExtracellularRecordingArray } from '@/api/entitycore/types/entities/simulatable-extracellular-recording-array';
import type { ICircuitSimulationCampaign } from '@/api/entitycore/types/entities/simulation-campaign';
import type { ISingleNeuronSynaptome } from '@/api/entitycore/types/entities/single-neuron-synaptome';
import type { ISingleNeuronSynaptomeSimulation } from '@/api/entitycore/types/entities/single-neuron-synaptome-simulation';
import type { IExperimentalSynapsesPerConnection } from '@/api/entitycore/types/entities/synapses-per-connection';

export * from '@/api/entitycore/types/entity-type';

export type {
  ICellMorphology,
  ICellMorphologyExpanded,
  ICircuit,
  IElectricalCellRecording,
  IEModel,
  IExperimentalBoutonDensity,
  IExperimentalNeuronDensity,
  IExperimentalSynapsesPerConnection,
  IIonChannelRecording,
  IMEModel,
  IonChannelModel,
  ISingleNeuronSimulation,
  ISingleNeuronSynaptome,
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
  | IIonChannelModelingCampaign
  | IEMCellMesh
  | ISimulatableExtracellularRecordingArray;
