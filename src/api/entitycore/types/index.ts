import type { IExperimentalSynapsesPerConnection } from '@/api/entitycore/types/entities/synapses-per-connection';
import type { IReconstructionMorphology } from '@/api/entitycore/types/entities/reconstruction-morphology';
import type { IExperimentalNeuronDensity } from '@/api/entitycore/types/entities/neuron-density';
import type { IExperimentalBoutonDensity } from '@/api/entitycore/types/entities/bouton-density';

export type EntityCoreTypes =
  | IReconstructionMorphology
  | IExperimentalNeuronDensity
  | IExperimentalBoutonDensity
  | IExperimentalSynapsesPerConnection;
