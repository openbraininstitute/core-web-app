import { AnalysisNotebookResult } from '@/entity-configuration/domain/analysis-notebook-result';
import { AnalysisNotebookTemplate } from '@/entity-configuration/domain/analysis-notebook-template';
import { BoutonDensity } from '@/entity-configuration/domain/experimental/bouton-density';
import { CellMorphology } from '@/entity-configuration/domain/experimental/cell-morphology';
import { ElectricalCellRecording } from '@/entity-configuration/domain/experimental/electrical-cell-recording';
import { EmCellMesh } from '@/entity-configuration/domain/experimental/em-cell-mesh';
import { IonChannelRecording } from '@/entity-configuration/domain/experimental/ion-channel-recording';
import { NeuronDensity } from '@/entity-configuration/domain/experimental/neuron-density';
import { SynapsesPerConnection } from '@/entity-configuration/domain/experimental/synapses-per-connection';
import { UniversalCellMorphology } from '@/entity-configuration/domain/experimental/universal-cell-morphology';
import { CircuitExtractionCampaign } from '@/entity-configuration/domain/extraction/extraction-campaign';
import { BrainRegion } from '@/entity-configuration/domain/model/brain-region';
import { Circuit } from '@/entity-configuration/domain/model/circuit';
import { Emodel } from '@/entity-configuration/domain/model/e-model';
import { EmSynapseMappingCampaign } from '@/entity-configuration/domain/model/em-synapse-mapping-campaign';
import { ExtracellularRecordingArray } from '@/entity-configuration/domain/model/extracellular-recording-array';
import { ExtracellularRecordingArrayCampaign } from '@/entity-configuration/domain/model/extracellular-recording-array-campaign';
import { IonChannelModel } from '@/entity-configuration/domain/model/ion-channel-model';
import { IonChannelModelingCampaign } from '@/entity-configuration/domain/model/ion-channel-modeling-campaign';
import { MEmodel } from '@/entity-configuration/domain/model/me-model';
import { MEModelCircuit } from '@/entity-configuration/domain/model/me-model-circuit';
import { Microcircuit } from '@/entity-configuration/domain/model/microcircuit';
import { PairedNeuronCircuit } from '@/entity-configuration/domain/model/paired-neurons';
import { SingleNeuronCircuit } from '@/entity-configuration/domain/model/single-neuron-circuit';
import { SingleNeuronSynaptome } from '@/entity-configuration/domain/model/single-neuron-synaptome';
import { SmallMicrocircuit } from '@/entity-configuration/domain/model/small-microcircuit';
import { SynthesizedCellMorphology } from '@/entity-configuration/domain/model/synthesized-morphology';
import { WholeBrain } from '@/entity-configuration/domain/model/whole-brain';
import { SkeletonizationCampaign } from '@/entity-configuration/domain/processing/skeletonization-campaign';
import {
  SimulationCampaign,
  SingleNeuronSimulation,
  SingleNeuronSynaptomeSimulation,
} from '@/entity-configuration/domain/simulation';
import { IonChannelModelSimulation } from '@/entity-configuration/domain/simulation/ion-channel-model-simulation';
import { MEModelCircuitSimulation } from '@/entity-configuration/domain/simulation/memodel-circuit-simulation';
import { MicrocircuitSimulation } from '@/entity-configuration/domain/simulation/microcircuit-simulation';
import { PairedNeuronCircuitSimulation } from '@/entity-configuration/domain/simulation/paired-neurons-simulation';
import { RegionCircuitSimulation } from '@/entity-configuration/domain/simulation/region-circuit-simulation';
import { SingeNeuronCircuitSimulation } from '@/entity-configuration/domain/simulation/single-neuron-circuit-simulation';
import { SmallMicrocircuitSimulation } from '@/entity-configuration/domain/simulation/small-microcircuit-simulation';
import { WholeBrainCircuitSimulation } from '@/entity-configuration/domain/simulation/whole-brain-circuit-simulation';

import type { EntityCoreTypeConfig } from '@/entity-configuration/domain/types';

export const UniversalTypesCoreConfiguration = {
  UniversalCellMorphology,
} as const;

export const EntityCoreExperimentalConfiguration = {
  CellMorphology,
  ElectricalCellRecording,
  IonChannelRecording,
  NeuronDensity,
  BoutonDensity,
  SynapsesPerConnection,
  EmCellMesh,
} as const;

export const EntityCoreModelConfiguration = {
  Emodel,
  MEmodel,
  MEModelCircuit,
  SingleNeuronSynaptome,
  PairedNeuronCircuit,
  SmallMicrocircuit,
  Microcircuit,
  BrainRegion,
  WholeBrain,
  Circuit,
  IonChannelModel,
  IonChannelModelingCampaign,
  EmSynapseMappingCampaign,
  ExtracellularRecordingArray,
  ExtracellularRecordingArrayCampaign,
  SingleNeuronCircuit,
  SynthesizedCellMorphology,
} as const;

const EntityCoreSimulationConfiguration = {
  SingleNeuronSimulation,
  SingleNeuronSynaptomeSimulation,
  SimulationCampaign,
  MEModelCircuitSimulation,
  SingeNeuronCircuitSimulation,
  PairedNeuronCircuitSimulation,
  SmallMicrocircuitSimulation,
  MicrocircuitSimulation,
  IonChannelModelSimulation,
  RegionCircuitSimulation,
  WholeBrainCircuitSimulation,
};

const EntityCoreExtractionConfiguration = {
  CircuitExtractionCampaign,
};

const EntityCoreProcessingConfiguration = {
  SkeletonizationCampaign,
};

export const EntityCoreConfiguration = {
  ...UniversalTypesCoreConfiguration,
  ...EntityCoreExperimentalConfiguration,
  ...EntityCoreModelConfiguration,
  ...EntityCoreSimulationConfiguration,
  ...EntityCoreExtractionConfiguration,
  ...EntityCoreProcessingConfiguration,
  AnalysisNotebookTemplate,
  AnalysisNotebookResult,
} as const;

export type TEntityCoreConfigurationItem =
  (typeof EntityCoreConfiguration)[keyof typeof EntityCoreConfiguration];

type InnerEntityType<T> = T extends EntityCoreTypeConfig<infer U> ? U : never;

export type EntityTypeValue = InnerEntityType<TEntityCoreConfigurationItem>;
