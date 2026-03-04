import { z } from 'zod';

import {
  AssetSchema,
  BasicSchema,
  BrainRegionSchema,
  CellMorphologyProtocolDesignEnum,
  ContributionSchema,
  LicenseSchema,
  ModifiedMorphologyMethodTypeEnum,
  MTypeClassSchema,
  PointLocationSchema,
  RepairPipelineTypeEnum,
  SlicingDirectionTypeEnum,
  StainingTypeEnum,
  SubjectSchema,
} from '@/api/entitycore/schemas/base';

import { MeasurementAnnotationSchema } from './measurement';

const ProtocolBaseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string(),
  type: z.literal('cell_morphology_protocol'),
});

export const NestedDigitalReconstructionProtocolSchema = ProtocolBaseSchema.extend({
  generation_type: z.literal('digital_reconstruction'),
  protocol_document: z.string().url().nullable().optional(),
  protocol_design: CellMorphologyProtocolDesignEnum,
  staining_type: StainingTypeEnum.nullable().optional(),
  slicing_thickness: z.number().min(0),
  slicing_direction: SlicingDirectionTypeEnum.nullable().optional(),
  magnification: z.number().min(0).nullable().optional(),
  tissue_shrinkage: z.number().min(0).nullable().optional(),
  corrected_for_shrinkage: z.boolean().nullable().optional(),
});

export const NestedModifiedReconstructionProtocolSchema = ProtocolBaseSchema.extend({
  generation_type: z.literal('modified_reconstruction'),
  protocol_document: z.string().url().nullable().optional(),
  protocol_design: CellMorphologyProtocolDesignEnum,
  method_type: ModifiedMorphologyMethodTypeEnum,
});

export const NestedComputationallySynthesizedProtocolSchema = ProtocolBaseSchema.extend({
  generation_type: z.literal('computationally_synthesized'),
  protocol_document: z.string().url().nullable().optional(),
  protocol_design: CellMorphologyProtocolDesignEnum,
  method_type: z.string(),
});

export const NestedPlaceholderProtocolSchema = ProtocolBaseSchema.extend({
  generation_type: z.literal('placeholder'),
});

export const NestedCellMorphologyProtocolSchema = z.discriminatedUnion('generation_type', [
  NestedDigitalReconstructionProtocolSchema,
  NestedModifiedReconstructionProtocolSchema,
  NestedComputationallySynthesizedProtocolSchema,
  NestedPlaceholderProtocolSchema,
]);

export const CellMorphologySchema = z
  .object({
    experiment_date: z.string().datetime().nullable().optional(),
    contact_email: z.string().nullable().optional(),
    published_in: z.string().nullable().optional(),
    notice_text: z.string().nullable().optional(),
    location: PointLocationSchema.nullable(),
    legacy_id: z.array(z.string()).nullable().optional(),
    has_segmented_spines: z.boolean().default(false),
    repair_pipeline_state: RepairPipelineTypeEnum.nullable().optional(),
    subject: SubjectSchema,
    brain_region: BrainRegionSchema,
    license: LicenseSchema.nullable().optional(),
    assets: z.array(AssetSchema),
    contributions: z.array(ContributionSchema).nullable(),
    mtypes: z.array(MTypeClassSchema).nullable(),
    cell_morphology_protocol: NestedCellMorphologyProtocolSchema.nullable(),
  })
  .merge(BasicSchema);

export type TCellMorphology = z.infer<typeof CellMorphologySchema>;

export const CellMorphologyAnnotationExpandedSchema = CellMorphologySchema.extend({
  measurement_annotation: MeasurementAnnotationSchema.nullable(),
});

export type TCellMorphologyAnnotationExpanded = z.infer<
  typeof CellMorphologyAnnotationExpandedSchema
>;
