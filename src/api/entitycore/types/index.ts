import type { IExperimentalSynapsesPerConnection } from '@/api/entitycore/types/entities/synapses-per-connection';
import type { IReconstructionMorphology } from '@/api/entitycore/types/entities/reconstruction-morphology';
import type { IExperimentalNeuronDensity } from '@/api/entitycore/types/entities/neuron-density';
import type { IExperimentalBoutonDensity } from '@/api/entitycore/types/entities/bouton-density';
import { Prettify } from '@/types/common';

export type EntityCoreDensityObjectTypes =
  | IExperimentalNeuronDensity
  | IExperimentalBoutonDensity
  | IExperimentalSynapsesPerConnection;

export type EntityCoreObjectTypes =
  | IReconstructionMorphology
  | IExperimentalNeuronDensity
  | IExperimentalBoutonDensity
  | IExperimentalSynapsesPerConnection;
