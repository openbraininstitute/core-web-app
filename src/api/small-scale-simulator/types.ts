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
  emodel_id: z.uuid(),
  morphology_id: z.uuid(),
  brain_region_id: z.uuid(),
  species_id: z.uuid(),
  strain_id: z.uuid().nullable(),
});

export type TCreateSingleNeuron = z.infer<typeof CreateSingleNeuronSchema>;

export const CreateSingleNeuronSynaptomeSchema = z.object({
  name: z.string(),
  description: z.string(),
  memodel_id: z.uuid(),
  seed: z.int(),
  brain_region_id: z.uuid(),
  config: z.object({
    synapses: z.array(SingleNeuronSynaptomeConfigurationSchema),
  }),
});

export type TCreateSingleNeuronSynaptome = z.infer<typeof CreateSingleNeuronSynaptomeSchema>;
