import {
  ReconstructionMorphology,
  Electrophysiology,
  SynapsePerConnection,
  BoutonDensity,
  NeuronDensity,
} from './experimental';

import { Mesh, Emodel } from './model';

export const EntityCoreConfiguration = {
  ReconstructionMorphology,
  SynapsePerConnection,
  Electrophysiology,
  BoutonDensity,
  NeuronDensity,
  Emodel,
  Mesh,
} as const;
