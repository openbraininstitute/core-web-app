import isNil from 'es-toolkit/compat/isNil';
import { z } from 'zod';

import {
  CellMorphologyGenerationTypeSchema,
  CellMorphologyProtocolDesignSchema,
  EntityTypeSchema,
  ModifiedMorphologyMethodTypeSchema,
  SlicingDirectionTypeSchema,
} from '@/api/entitycore/types/shared/global';

import type {
  ContributionFilter,
  IDFilter,
  IlikeSearchFilter,
  NameFilter,
  OwnershipFilter,
  PaginationFilter,
} from '@/api/entitycore/types/shared/request';

export const RepairPipelineState = {
  Raw: {
    key: 'raw',
    label: 'Raw',
    description:
      'These are the "as-is" digital tracings of neurons captured directly from experimental microscopy. They serve as the primary evidence but often contain biological damage, technical noise, and physical distortions introduced during tissue preparation.',
  },
  Curated: {
    key: 'curated',
    label: 'Curated',
    description:
      'These are high-quality, "vetted" digital models that have passed through a rigorous pipeline of structural cleaning and biological validation. Curation ensures the files are technically sound, standardized for software compatibility, and follow the fundamental rules of neurobiology.',
  },
  Unraveled: {
    key: 'unraveled',
    label: 'Unraveled',
    description:
      'These are reconstructions that have been mathematically "stretched" to reverse the physical shrinkage caused by chemical staining and fixation. Unravelling restores the neuron to its native biological dimensions, ensuring that the lengths and diameters of the branches are accurate for electrical simulation.',
  },
  Repaired: {
    key: 'repaired',
    label: 'Repaired',
    description:
      'These are neurons that have undergone algorithmic restoration to fix structural defects caused by the experimental process. This includes "regrowing" branches that were physically severed when the brain was sliced into sections and reconstructing the cell body (soma) into a biologically accurate 3D volume.',
  },
} as const;

export const RepairPipelineTypeDictionary = Object.fromEntries(
  Object.entries(RepairPipelineState).map(([name, value]) => [name, value.key])
) as {
  [K in keyof typeof RepairPipelineState]: (typeof RepairPipelineState)[K]['key'];
};
export type TRepairPipelineState =
  (typeof RepairPipelineTypeDictionary)[keyof typeof RepairPipelineTypeDictionary];

export const RepairPipelineTypeSchema = z.enum(
  Object.values(RepairPipelineState).map((value) => value.key)
);

export interface IProtocolFilter
  extends PaginationFilter,
    OwnershipFilter,
    IDFilter,
    IlikeSearchFilter,
    NameFilter,
    ContributionFilter {}

// Base schema for a Cell Morphology Protocol
export const ProtocolBaseSchema = z.object({
  // Protocol core fields (similar to entity core, using optional where data suggests null/None)
  id: z.uuid().optional(),
  type: EntityTypeSchema,
  name: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  contributions: z.any().nullable().optional(),
  legacy_id: z.string().nullable().optional(),

  // Protocol specific fields
  protocol_document: z.any().nullable().optional(),
  protocol_design: CellMorphologyProtocolDesignSchema,
  generation_type: CellMorphologyGenerationTypeSchema,
  staining_type: z.string().nullable().optional(),
  slicing_thickness: z.number().positive().nullable().optional(),
  slicing_direction: SlicingDirectionTypeSchema,
  magnification: z.number().positive().nullable().optional(),
  tissue_shrinkage: z.number().positive().nullable().optional(),
  corrected_for_shrinkage: z.boolean().nullable().optional(),

  repair_pipeline_state: RepairPipelineTypeSchema,

  modified_morphology_method: ModifiedMorphologyMethodTypeSchema,
});

export const ProtocolCreateSchema = ProtocolBaseSchema.extend({
  name: z
    .string()
    .nonempty({
      error: 'Protocol name is required',
    })
    .nullable(),
  protocol_design: CellMorphologyProtocolDesignSchema,
  generation_type: CellMorphologyGenerationTypeSchema,
}).superRefine((data, ctx) => {
  if (data.generation_type === 'digital_reconstruction' && isNil(data.slicing_thickness)) {
    ctx.addIssue({
      code: 'custom',
      message: 'Slicing thickness is required for digital reconstruction',
      path: ['slicing_thickness'],
    });
  }
});

export type TProtocolCreate = z.infer<typeof ProtocolCreateSchema>;
