import {
  ReconstructionMorphology,
  Electrophysiology,
  SynapsePerConnection,
  BoutonDensity,
  NeuronDensity,
} from './experimental';

import { Mesh, Emodel, MEmodel } from './model';

export const EntityCoreConfiguration = {
  ReconstructionMorphology,
  SynapsePerConnection,
  Electrophysiology,
  BoutonDensity,
  NeuronDensity,
  MEmodel,
  Emodel,
  Mesh,
} as const;
