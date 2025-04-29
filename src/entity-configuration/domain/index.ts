import {
  ReconstructionMorphology,
  ElectricalCellRecording,
  SynapsePerConnection,
  BoutonDensity,
  NeuronDensity,
} from './experimental';

import { Mesh, Emodel, MEmodel } from './model';

export const EntityCoreConfiguration = {
  ReconstructionMorphology,
  SynapsePerConnection,
  ElectricalCellRecording,
  BoutonDensity,
  NeuronDensity,
  MEmodel,
  Emodel,
  Mesh,
} as const;
