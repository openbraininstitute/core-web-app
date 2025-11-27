import { z } from 'zod';
import isNil from 'es-toolkit/compat/isNil';

import {
  EntityType,
  CellMorphologyProtocolDesign,
  CellMorphologyGenerationType,
  SlicingDirectionType,
  RepairPipelineType,
  ModifiedMorphologyMethodType,
} from '@/api/entitycore/types/shared/global';
import type {
  ContributionFilter,
  IDFilter,
  OwnershipFilter,
  PaginationFilter,
} from '@/api/entitycore/types/shared/request';

// Assuming you need an interface for filtering protocols
export interface IProtocolFilter
  extends PaginationFilter,
    OwnershipFilter,
    IDFilter,
    ContributionFilter {}
// Base schema for a Cell Morphology Protocol
export const ProtocolBaseSchema = z.object({
  // Protocol core fields (similar to entity core, using optional where data suggests null/None)
  id: z.string().uuid().optional(),
  type: EntityType, // Use EntityType for type: 'cell_morphology_protocol'
  name: z.string().nullable().optional(), // Name is null in the JSON
  description: z.string().nullable().optional(), // Description is null in the JSON
  contributions: z.any().nullable().optional(), // Placeholder, replace with actual Contribution schema if known
  legacy_id: z.string().nullable().optional(),

  // Protocol specific fields
  protocol_document: z.any().nullable().optional(), // Placeholder, replace with actual Document schema if known
  protocol_design: CellMorphologyProtocolDesign, // e.g., 'cell_patch'
  generation_type: CellMorphologyGenerationType, // e.g., 'digital_reconstruction'
  staining_type: z.string().nullable().optional(), // Assuming string, based on None
  slicing_thickness: z.number().positive().nullable().optional(), // 50.0 in JSON
  slicing_direction: SlicingDirectionType, // Assuming string, based on None
  magnification: z.number().positive().nullable().optional(), // Assuming number, based on None
  tissue_shrinkage: z.number().positive().nullable().optional(), // Assuming number, based on None
  corrected_for_shrinkage: z.boolean().nullable().optional(), // Assuming boolean, based on None

  repair_pipeline_type: RepairPipelineType, // e.g., 'raw'

  modified_morphology_method: ModifiedMorphologyMethodType, // e.g., 'cloned'
});

// Schema for creating a new DigitalReconstructionCellMorphologyProtocol
// We'll extend the base and make 'protocol_design' and 'generation_type' required for creation
export const ProtocolCreateSchema = ProtocolBaseSchema.extend({
  name: z.string().nonempty({ message: 'Protocol name is required' }).nullable(), // Allowing null/None per JSON, but requiring if present. This may need adjustment based on API.
  // Making fields that should be defined on creation explicit and non-optional if they are part of the protocol
  protocol_design: CellMorphologyProtocolDesign.nonempty({
    message: 'Protocol design is required',
  }),
  generation_type: CellMorphologyGenerationType.nonempty({
    message: 'Generation type is required',
  }),
}).superRefine((data, ctx) => {
  // Add any necessary superRefine logic for this protocol here
  // Example: Check for presence of required fields based on generation_type
  if (
    data.generation_type === CellMorphologyGenerationType.digital_reconstruction &&
    isNil(data.slicing_thickness)
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Slicing thickness is required for digital reconstruction',
      path: ['slicing_thickness'],
    });
  }
});

export type TProtocolCreate = z.infer<typeof ProtocolCreateSchema>;
