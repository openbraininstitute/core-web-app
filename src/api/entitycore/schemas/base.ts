import { z } from 'zod';

export const EntityTypeEnum = z.enum([
  'analysis_software_source_code',
  'brain_atlas',
  'brain_atlas_region',
  'cell_composition',
  'cell_morphology',
  'cell_morphology_protocol',
  'electrical_cell_recording',
  'electrical_recording',
  'electrical_recording_stimulus',
  'emodel',
  'experimental_bouton_density',
  'experimental_neuron_density',
  'experimental_synapses_per_connection',
  'external_url',
  'ion_channel_model',
  'ion_channel_modeling_campaign',
  'ion_channel_modeling_config',
  'ion_channel_recording',
  'memodel',
  'memodel_calibration_result',
  'me_type_density',
  'simulation',
  'simulation_campaign',
  'simulation_result',
  'scientific_artifact',
  'single_neuron_simulation',
  'single_neuron_synaptome',
  'single_neuron_synaptome_simulation',
  'subject',
  'validation_result',
  'circuit',
  'circuit_extraction_campaign',
  'circuit_extraction_config',
  'em_dense_reconstruction_dataset',
  'em_cell_mesh',
  'analysis_notebook_template',
  'analysis_notebook_environment',
  'analysis_notebook_result',
  'skeletonization_config',
  'skeletonization_campaign',
]);

export const RepairPipelineTypeEnum = z.enum(['raw', 'curated', 'unraveled', 'repaired']);

export const SexEnum = z.enum(['male', 'female', 'unknown']);

export const AgePeriodEnum = z.enum(['prenatal', 'postnatal', 'unknown']);

export const ContentTypeEnum = z.enum([
  'application/json',
  'application/swc',
  'application/nrrd',
  'application/obj',
  'application/hoc',
  'application/asc',
  'application/abf',
  'application/nwb',
  'application/x-hdf5',
  'text/plain',
  'application/vnd.directory',
  'application/mod',
  'application/pdf',
  'image/png',
  'image/jpeg',
  'model/gltf-binary',
  'application/gzip',
  'image/webp',
  'application/x-ipynb+json',
  'application/zip',
]);

export const StorageTypeEnum = z.enum(['aws_s3_internal', 'aws_s3_open']);

export const AssetStatusEnum = z.enum(['created', 'uploading', 'deleted']);

export const AssetLabelEnum = z.enum([
  'morphology',
  'morphology_with_spines',
  'cell_composition_summary',
  'cell_composition_volumes',
  'single_neuron_synaptome_config',
  'single_neuron_synaptome_simulation_data',
  'single_neuron_simulation_data',
  'sonata_circuit',
  'compressed_sonata_circuit',
  'circuit_figures',
  'circuit_analysis_data',
  'circuit_connectivity_matrices',
  'nwb',
  'neuron_hoc',
  'emodel_optimization_output',
  'sonata_simulation_config',
  'simulation_generation_config',
  'ion_channel_modeling_generation_config',
  'custom_node_sets',
  'campaign_generation_config',
  'campaign_summary',
  'replay_spikes',
  'voltage_report',
  'spike_report',
  'neuron_mechanisms',
  'brain_atlas_annotation',
  'brain_atlas_region_mesh',
  'voxel_densities',
  'validation_result_figure',
  'validation_result_details',
  'simulation_designer_image',
  'circuit_visualization',
  'node_stats',
  'network_stats_a',
  'network_stats_b',
  'cell_surface_mesh',
  'jupyter_notebook',
  'requirements',
  'notebook_required_files',
  'ion_channel_model_figure',
  'ion_channel_model_figure_summary_json',
  'ion_channel_model_thumbnail',
  'circuit_extraction_config',
  'skeletonization_config',
]);

export const CellMorphologyProtocolDesignEnum = z.enum([
  'electron_microscopy',
  'cell_patch',
  'fluorophore',
  'topological_synthesis',
]);

export const CellMorphologyGenerationTypeEnum = z.enum([
  'digital_reconstruction',
  'modified_reconstruction',
  'computationally_synthesized',
  'placeholder',
]);

export const StainingTypeEnum = z.enum([
  'golgi',
  'nissl',
  'luxol_fast_blue',
  'fluorescent_nissl',
  'fluorescent_dyes',
  'fluorescent_protein_expression',
  'immunohistochemistry',
  'other',
]);

export const SlicingDirectionTypeEnum = z.enum(['coronal', 'sagittal', 'horizontal', 'custom']);

export const ModifiedMorphologyMethodTypeEnum = z.enum([
  'cloned',
  'mix_and_match',
  'mousified',
  'ratified',
]);

export const PointLocationSchema = z.object({
  x: z.number(),
  y: z.number(),
  z: z.number(),
});

export const PersonSchema = z.object({
  id: z.string().uuid(),
  type: z.string(),
  sub_id: z.string().uuid().nullable(),
  given_name: z.string().nullable().optional(),
  family_name: z.string().nullable().optional(),
  pref_label: z.string(),
});

export const TimestampsSchema = z.object({
  creation_date: z.string().datetime(),
  update_date: z.string().datetime(),
});

export const OwnershipSchema = z.object({
  created_by: PersonSchema,
  updated_by: PersonSchema,
});

export const SpeciesSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  taxonomy_id: z.string(),
});

export const StrainSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  taxonomy_id: z.string(),
  species_id: z.string().uuid(),
});

export const BrainRegionSchema = z.object({
  id: z.string().uuid(),
  annotation_value: z.number().int(),
  name: z.string(),
  acronym: z.string(),
  color_hex_triplet: z.string(),
  parent_structure_id: z.string().uuid().nullable(),
  hierarchy_id: z.string().uuid(),
});

export const SubjectSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string(),
  sex: SexEnum,
  weight: z.number().positive().nullable().optional(),
  age_value: z.number().nullable().optional(),
  age_min: z.number().nullable().optional(),
  age_max: z.number().nullable().optional(),
  age_period: AgePeriodEnum.nullable().optional(),
  species: SpeciesSchema,
  strain: StrainSchema.nullable(),
});

export const LicenseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string(),
  label: z.string(),
  creation_date: z.string().datetime(),
  update_date: z.string().datetime(),
});

export const AssetSchema = z.object({
  id: z.string().uuid(),
  path: z.string(),
  full_path: z.string(),
  is_directory: z.boolean(),
  content_type: ContentTypeEnum,
  meta: z.record(z.unknown()).default({}),
  label: AssetLabelEnum,
  storage_type: StorageTypeEnum,
  size: z.number().int(),
  sha256_digest: z.string().nullable(),
  status: AssetStatusEnum,
});

export const RoleSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  role_id: z.string(),
  creation_date: z.string().datetime(),
  update_date: z.string().datetime(),
});

export const AgentSchema = z.union([
  PersonSchema,
  z.object({
    id: z.string().uuid(),
    type: z.string(),
    pref_label: z.string(),
    alternative_name: z.string().nullable().optional(),
  }),
]);

export const ContributionSchema = z.object({
  id: z.string().uuid(),
  agent: AgentSchema,
  role: RoleSchema,
});

export const AnnotationSchema = z.object({
  id: z.string().uuid(),
  pref_label: z.string(),
  alt_label: z.string().nullable().optional(),
  definition: z.string(),
  creation_date: z.string().datetime(),
  update_date: z.string().datetime(),
});

export const MTypeClassSchema = AnnotationSchema;

export const PaginationResponseSchema = z.object({
  page: z.number().int(),
  page_size: z.number().int(),
  total_items: z.number().int(),
});

export const FacetSchema = z.object({
  id: z.union([z.string().uuid(), z.number().int()]),
  label: z.string(),
  count: z.number().int(),
  type: z.string().nullable(),
});

export const FacetsSchema = z.record(z.array(FacetSchema));

export const IdentitySchema = z.object({
  id: z.string().uuid(),
});

export const EntityTypeSchema = z.object({
  type: EntityTypeEnum.nullable().optional(),
});

export const AuthorizationSchema = z.object({
  authorized_project_id: z.string().uuid(),
  authorized_public: z.boolean().default(false),
});

export const DisplayMetadataSchema = z.object({
  name: z.string(),
  description: z.string(),
});

export const BasicSchema = IdentitySchema.merge(OwnershipSchema)
  .merge(DisplayMetadataSchema)
  .merge(AuthorizationSchema)
  .merge(TimestampsSchema)
  .merge(EntityTypeSchema);

export function makeListResponse<T extends z.ZodTypeAny>(itemSchema: T) {
  return z.object({
    data: z.array(itemSchema),
    pagination: PaginationResponseSchema,
    facets: FacetsSchema.nullable().optional(),
  });
}

export type TEntityType = z.infer<typeof EntityTypeEnum>;
export type TRepairPipelineType = z.infer<typeof RepairPipelineTypeEnum>;
export type TSex = z.infer<typeof SexEnum>;
export type TAgePeriod = z.infer<typeof AgePeriodEnum>;
export type TContentType = z.infer<typeof ContentTypeEnum>;
export type TStorageType = z.infer<typeof StorageTypeEnum>;
export type TAssetStatus = z.infer<typeof AssetStatusEnum>;
export type TAssetLabel = z.infer<typeof AssetLabelEnum>;
export type TCellMorphologyProtocolDesign = z.infer<typeof CellMorphologyProtocolDesignEnum>;
export type TCellMorphologyGenerationType = z.infer<typeof CellMorphologyGenerationTypeEnum>;
export type TStainingType = z.infer<typeof StainingTypeEnum>;
export type TSlicingDirectionType = z.infer<typeof SlicingDirectionTypeEnum>;
export type TModifiedMorphologyMethodType = z.infer<typeof ModifiedMorphologyMethodTypeEnum>;

export type TPointLocation = z.infer<typeof PointLocationSchema>;
export type TPerson = z.infer<typeof PersonSchema>;
export type TTimestamps = z.infer<typeof TimestampsSchema>;
export type TOwnership = z.infer<typeof OwnershipSchema>;
export type TSpecies = z.infer<typeof SpeciesSchema>;
export type TStrain = z.infer<typeof StrainSchema>;
export type TBrainRegion = z.infer<typeof BrainRegionSchema>;
export type TSubject = z.infer<typeof SubjectSchema>;
export type TLicense = z.infer<typeof LicenseSchema>;
export type TAsset = z.infer<typeof AssetSchema>;
export type TRole = z.infer<typeof RoleSchema>;
export type TAgent = z.infer<typeof AgentSchema>;
export type TContribution = z.infer<typeof ContributionSchema>;
export type TAnnotation = z.infer<typeof AnnotationSchema>;
export type TMTypeClass = z.infer<typeof MTypeClassSchema>;
export type TPaginationResponse = z.infer<typeof PaginationResponseSchema>;
export type TFacet = z.infer<typeof FacetSchema>;
export type TFacets = z.infer<typeof FacetsSchema>;
export type TIdentity = z.infer<typeof IdentitySchema>;
export type TEntityTypeObj = z.infer<typeof EntityTypeSchema>;
export type TAuthorization = z.infer<typeof AuthorizationSchema>;
export type TDisplayMetadata = z.infer<typeof DisplayMetadataSchema>;
export type TBasic = z.infer<typeof BasicSchema>;
