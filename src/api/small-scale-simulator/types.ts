import z from 'zod';

import { SingleNeuronSynaptomeConfigurationSchema } from '@/api/entitycore/types/entities/single-neuron-synaptome';

type Coordinates3D = [number, number, number];

interface SynapsePosition {
  segment_id: number;
  coordinates: Coordinates3D;
  position: number;
}

export interface SectionSynapses {
  section_id: string;
  synapses: Array<SynapsePosition>;
}

export const CreateSingleNeuronSchema = z.object({
  name: z.string(),
  description: z.string(),
  emodel_id: z.string().uuid(),
  morphology_id: z.string().uuid(),
  brain_region_id: z.string().uuid(),
  species_id: z.string().uuid(),
  strain_id: z.string().uuid().nullable(),
});

export type TCreateSingleNeuron = z.infer<typeof CreateSingleNeuronSchema>;

export const CreateSingleNeuronSynaptomeSchema = z.object({
  name: z.string(),
  description: z.string(),
  memodel_id: z.string().uuid(),
  seed: z.number().int(),
  brain_region_id: z.string().uuid(),
  config: z.object({
    synapses: z.array(SingleNeuronSynaptomeConfigurationSchema),
  }),
});

export type TCreateSingleNeuronSynaptome = z.infer<typeof CreateSingleNeuronSynaptomeSchema>;
