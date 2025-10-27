import { SmallMicrocircuitSimulation } from '@/entity-configuration/domain/simulation/small-microcircuit-simulation';
import { PairedNeuronCircuitSimulation } from '@/entity-configuration/domain/simulation/paired-neurons-simulation';
import { ElectricalCellRecording } from '@/entity-configuration/domain/experimental/electrical-cell-recording';
import { SynapsePerConnection } from '@/entity-configuration/domain/experimental/synapse-per-connection';
import { MEModelWithSynapsesCircuit } from '@/entity-configuration/domain/model/me-model-with-synapses';
import { IonChannelRecording } from '@/entity-configuration/domain/experimental/ion-channel-recording';
import { SingleNeuronSynaptome } from '@/entity-configuration/domain/model/single-neuron-synaptome';
import { CellMorphology } from '@/entity-configuration/domain/experimental/cell-morphology';
import { SmallMicrocircuit } from '@/entity-configuration/domain/model/small-microcircuit';
import { NeuronDensity } from '@/entity-configuration/domain/experimental/neuron-density';
import { BoutonDensity } from '@/entity-configuration/domain/experimental/bouton-density';
import { IonChannelModel } from '@/entity-configuration/domain/model/ion-channel-model';
import { PairedNeuronCircuit } from '@/entity-configuration/domain/model/paired-neurons';
import { Microcircuit } from '@/entity-configuration/domain/model/mirocircuit';
import { MEmodel } from '@/entity-configuration/domain/model/me-model';
import { Circuit } from '@/entity-configuration/domain/model/circuit';
import { Emodel } from '@/entity-configuration/domain/model/e-model';
import { Notebook } from '@/entity-configuration/domain/notebook';
import {
  SingleNeuronSimulation,
  SingleNeuronSynaptomeSimulation,
  SimulationCampaign,
} from '@/entity-configuration/domain/simulation';

import type { EntityCoreTypeConfig } from '@/entity-configuration/domain/types';

export const EntityCoreExperimentalConfiguration = {
  CellMorphology,
  ElectricalCellRecording,
  IonChannelRecording,
  NeuronDensity,
  BoutonDensity,
  SynapsePerConnection,
} as const;

export const EntityCoreModelConfiguration = {
  Emodel,
  MEmodel,
  SingleNeuronSynaptome,
  Circuit,
  SmallMicrocircuit,
  Microcircuit,
  PairedNeuronCircuit,
  IonChannelModel,
  MEModelWithSynapsesCircuit,
} as const;

const EntityCoreSimulationConfiguration = {
  SingleNeuronSimulation,
  SingleNeuronSynaptomeSimulation,
  SimulationCampaign,
  SmallMicrocircuitSimulation,
  PairedNeuronCircuitSimulation,
};

export const EntityCoreConfiguration = {
  ...EntityCoreExperimentalConfiguration,
  ...EntityCoreModelConfiguration,
  ...EntityCoreSimulationConfiguration,
  Notebook,
} as const;

export type TEntityCoreConfigurationItem =
  (typeof EntityCoreConfiguration)[keyof typeof EntityCoreConfiguration];

type InnerEntityType<T> = T extends EntityCoreTypeConfig<infer U> ? U : never;

export type EntityTypeValue = InnerEntityType<TEntityCoreConfigurationItem>;
