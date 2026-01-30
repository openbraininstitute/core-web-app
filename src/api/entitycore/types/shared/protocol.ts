import isNil from 'es-toolkit/compat/isNil';
import { z } from 'zod';

import {
  CellMorphologyGenerationTypeSchema,
  CellMorphologyProtocolDesignSchema,
  EntityTypeSchema,
  ModifiedMorphologyMethodTypeSchema,
  RepairPipelineTypeSchema,
  SlicingDirectionTypeSchema,
} from '@/api/entitycore/types/shared/global';
import type {
  ContributionFilter,
  IDFilter,
  OwnershipFilter,
  PaginationFilter,
} from '@/api/entitycore/types/shared/request';

export interface IProtocolFilter
  extends PaginationFilter,
    OwnershipFilter,
    IDFilter,
    ContributionFilter {}
// Base schema for a Cell Morphology Protocol
export const ProtocolBaseSchema = z.object({
  // Protocol core fields (similar to entity core, using optional where data suggests null/None)
  id: z.string().uuid().optional(),
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

  repair_pipeline_type: RepairPipelineTypeSchema,

  modified_morphology_method: ModifiedMorphologyMethodTypeSchema,
});

export const ProtocolCreateSchema = ProtocolBaseSchema.extend({
  name: z.string().nonempty({ message: 'Protocol name is required' }).nullable(),
  protocol_design: CellMorphologyProtocolDesignSchema,
  generation_type: CellMorphologyGenerationTypeSchema,
}).superRefine((data, ctx) => {
  if (data.generation_type === 'digital_reconstruction' && isNil(data.slicing_thickness)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Slicing thickness is required for digital reconstruction',
      path: ['slicing_thickness'],
    });
  }
});

export type TProtocolCreate = z.infer<typeof ProtocolCreateSchema>;
