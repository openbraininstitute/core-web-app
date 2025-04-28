import {
  ReconstructionMorphology,
  ElectricalCellRecording,
  SynapsePerConnection,
  BoutonDensity,
  NeuronDensity,
} from './experimental';

import { Mesh, Emodel, MEmodel, SingleNeuronSynaptome } from './model';

export const EntityCoreConfiguration = {
  ReconstructionMorphology,
  SynapsePerConnection,
  ElectricalCellRecording,
  BoutonDensity,
  NeuronDensity,
  SingleNeuronSynaptome,
  MEmodel,
  Emodel,
  Mesh,
} as const;
