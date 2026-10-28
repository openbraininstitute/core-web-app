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
