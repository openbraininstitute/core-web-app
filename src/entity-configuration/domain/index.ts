import {
  ReconstructionMorphology,
  ElectricalCellRecording,
  SynapsePerConnection,
  BoutonDensity,
  NeuronDensity,
} from '@/entity-configuration/domain/experimental';

import {
  Emodel,
  MEmodel,
  SingleNeuronSynaptome,
  SingleNeuronSimulation,
} from '@/entity-configuration/domain/model';

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

export const EntityCoreConfiguration = {
  ...EntityCoreExperimentalConfiguration,
  ...EntityCoreModelConfiguration,
} as const;
