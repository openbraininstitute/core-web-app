import { BoutonDensity } from '@/entity-configuration/domain/experimental/bouton-density';
import { CellMorphology } from '@/entity-configuration/domain/experimental/cell-morphology';
import { ElectricalCellRecording } from '@/entity-configuration/domain/experimental/electrical-cell-recording';
import { EmCellMesh } from '@/entity-configuration/domain/experimental/em-cell-mesh';
import { IonChannelRecording } from '@/entity-configuration/domain/experimental/ion-channel-recording';
import { NeuronDensity } from '@/entity-configuration/domain/experimental/neuron-density';
import { SynapsesPerConnection } from '@/entity-configuration/domain/experimental/synapses-per-connection';
import { UniversalCellMorphology } from '@/entity-configuration/domain/experimental/universal-cell-morphology';
import { CircuitExtractionCampaign } from '@/entity-configuration/domain/extraction/extraction-campaign';
import { Circuit } from '@/entity-configuration/domain/model/circuit';
import { ComputationallySynthesizedCellMorphology } from '@/entity-configuration/domain/model/computationally-synthesized-morphology';
import { Emodel } from '@/entity-configuration/domain/model/e-model';
import { IonChannelModel } from '@/entity-configuration/domain/model/ion-channel-model';
import { MEmodel } from '@/entity-configuration/domain/model/me-model';
import { MEModelCircuit } from '@/entity-configuration/domain/model/me-model-circuit';
import { MEModelWithSynapsesCircuit } from '@/entity-configuration/domain/model/me-model-with-synapses';
import { Microcircuit } from '@/entity-configuration/domain/model/mirocircuit';
import { PairedNeuronCircuit } from '@/entity-configuration/domain/model/paired-neurons';
import { SingleNeuronCircuit } from '@/entity-configuration/domain/model/single-neuron-circuit';
import { SingleNeuronSynaptome } from '@/entity-configuration/domain/model/single-neuron-synaptome';
import { SmallMicrocircuit } from '@/entity-configuration/domain/model/small-microcircuit';
import { Notebook } from '@/entity-configuration/domain/notebook';
import {
  SimulationCampaign,
  SingleNeuronSimulation,
  SingleNeuronSynaptomeSimulation,
} from '@/entity-configuration/domain/simulation';
import { MEModelCircuitSimulation } from '@/entity-configuration/domain/simulation/memodel-circuit-simulation';
import { MicrocircuitSimulation } from '@/entity-configuration/domain/simulation/microcircuit-simulation';
import { PairedNeuronCircuitSimulation } from '@/entity-configuration/domain/simulation/paired-neurons-simulation';
import { SingeNeuronCircuitSimulation } from '@/entity-configuration/domain/simulation/single-neuron-circuit-simulation';
import { SmallMicrocircuitSimulation } from '@/entity-configuration/domain/simulation/small-microcircuit-simulation';

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
  SingleNeuronCircuit,
  PairedNeuronCircuit,
  SmallMicrocircuit,
  Microcircuit,
  Circuit,
  IonChannelModel,
  MEModelWithSynapsesCircuit,
  ComputationallySynthesizedCellMorphology,
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
};

const EntityCoreExtractionConfiguration = {
  CircuitExtractionCampaign,
};

export const EntityCoreConfiguration = {
  ...UniversalTypesCoreConfiguration,
  ...EntityCoreExperimentalConfiguration,
  ...EntityCoreModelConfiguration,
  ...EntityCoreSimulationConfiguration,
  ...EntityCoreExtractionConfiguration,
  Notebook,
} as const;

export type TEntityCoreConfigurationItem =
  (typeof EntityCoreConfiguration)[keyof typeof EntityCoreConfiguration];

type InnerEntityType<T> = T extends EntityCoreTypeConfig<infer U> ? U : never;

export type EntityTypeValue = InnerEntityType<TEntityCoreConfigurationItem>;
