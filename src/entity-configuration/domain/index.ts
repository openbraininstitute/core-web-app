import type { EntityCoreTypeConfig } from './types';
import { Emodel } from './model/e-model';
import { MEmodel } from './model/me-model';
import { SingleNeuronSynaptome } from './model/single-neuron-synaptome';
import { CellMorphology } from './experimental/cell-morphology';
import { ElectricalCellRecording } from './experimental/electrical-cell-recording';
import { NeuronDensity } from './experimental/neuron-density';
import { BoutonDensity } from './experimental/bouton-density';
import { SynapsePerConnection } from './experimental/synapse-per-connection';
import { IonChannelModel } from './model/ion-channel-model';

import { Circuit } from '@/entity-configuration/domain/model/circuit';
import { SmallMicrocircuit } from '@/entity-configuration/domain/model/small-microcircuit';
import { SmallMicrocircuitSimulation } from '@/entity-configuration/domain/simulation/small-microcircuit-simulation';
import { Microcircuit } from '@/entity-configuration/domain/model/mirocircuit';
import { PairedNeuronCircuit } from '@/entity-configuration/domain/model/paired-neurons';
import { PairedNeuronCircuitSimulation } from '@/entity-configuration/domain/simulation/paired-neurons-simulation';

import {
  SingleNeuronSimulation,
  SingleNeuronSynaptomeSimulation,
  SimulationCampaign,
} from '@/entity-configuration/domain/simulation';

export const EntityCoreExperimentalConfiguration = {
  ReconstructionMorphology: CellMorphology,
  ElectricalCellRecording,
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
} as const;

export type TEntityCoreConfigurationItem =
  (typeof EntityCoreConfiguration)[keyof typeof EntityCoreConfiguration];

type InnerEntityType<T> = T extends EntityCoreTypeConfig<infer U> ? U : never;

export type EntityTypeValue = InnerEntityType<TEntityCoreConfigurationItem>;
