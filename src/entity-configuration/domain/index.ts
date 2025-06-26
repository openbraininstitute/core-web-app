import { Emodel } from './model/e-model';
import { MEmodel } from './model/me-model';
import { SingleNeuronSynaptome } from './model/single-neuron-synaptome';
import { ReconstructionMorphology } from './experimental/reconstruction-morphology';
import { ElectricalCellRecording } from './experimental/electrical-cell-recording';
import { NeuronDensity } from './experimental/neuron-density';
import { BoutonDensity } from './experimental/bouton-density';
import { SynapsePerConnection } from './experimental/synapse-per-connection';
import { Circuit } from '@/entity-configuration/domain/model';

import {
  SingleNeuronSimulation,
  SingleNeuronSynaptomeSimulation,
} from '@/entity-configuration/domain/simulation';

// NOTE: order is important (it's used in stats panel in explore)
export const EntityCoreExperimentalConfiguration = {
  ReconstructionMorphology,
  ElectricalCellRecording,
  NeuronDensity,
  BoutonDensity,
  SynapsePerConnection,
};

// NOTE: order is important (it's used in stats panel in explore)
export const EntityCoreModelConfiguration = {
  Emodel,
  MEmodel,
  SingleNeuronSynaptome,
};

export const EntityCoreSimulationConfiguration = {
  SingleNeuronSimulation,
  SingleNeuronSynaptomeSimulation,
};

export const EntityCoreConfiguration = {
  ...EntityCoreExperimentalConfiguration,
  ...EntityCoreModelConfiguration,
  ...EntityCoreSimulationConfiguration,
  Circuit,
} as const;

export type TEntityCoreConfigurationItem =
  (typeof EntityCoreConfiguration)[keyof typeof EntityCoreConfiguration];
