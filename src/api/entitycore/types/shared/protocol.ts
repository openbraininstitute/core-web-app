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
  },
  Curated: {
    key: 'curated',
    label: 'Curated',
  },
  Unraveled: {
    key: 'unraveled',
    label: 'Unraveled',
  },
  Repaired: {
    key: 'repaired',
    label: 'Repaired',
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
