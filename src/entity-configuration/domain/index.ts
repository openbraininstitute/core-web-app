import {
  ReconstructionMorphology,
  ElectricalCellRecording,
  SynapsePerConnection,
  BoutonDensity,
  NeuronDensity,
} from '@/entity-configuration/domain/experimental';

import { Emodel, MEmodel, SingleNeuronSynaptome } from '@/entity-configuration/domain/model';
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
} as const;

export type TEntityCoreConfigurationItem =
  (typeof EntityCoreConfiguration)[keyof typeof EntityCoreConfiguration];
