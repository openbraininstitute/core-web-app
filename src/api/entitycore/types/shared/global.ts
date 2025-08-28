import { EntityCoreConfiguration } from '@/entity-configuration/domain';

import type { EntityTypeValue } from '@/api/entitycore/types/entity-type';
import type { AssetLegacyMeta } from '@/api/entitycore/types/shared/legacy';
import type { PaginationFilter } from '@/api/entitycore/types/shared/request';

export type EntityCoreDataType =
  (typeof EntityCoreConfiguration)[keyof typeof EntityCoreConfiguration]['type'];

export type EntityCoreIdentifiable = {
  id: string;
  legacy_id: Array<string> | null;
};

export type EntityCoreType = {
  type: EntityTypeValue;
};

export type ActivityType = {
  // TODO: derive from activity type, same as done with EntityTypeValue
  type: 'simulation_execution' | 'simulation_generation';
};

export type EntityCoreOwnership = {
  created_by: IPerson | null;
  updated_by: IPerson | null;
};

export interface EntityCoreIdentifiableNamed extends EntityCoreIdentifiable {
  name: string;
  type: EntityCoreDataType;
}

type EntityCoreBaseType = {
  type: EntityCoreDataType;
};

export interface EntityCoreBaseAsset {
  assets: Array<IAsset>;
}

export interface EntityCoreResource
  extends EntityCoreIdentifiable,
    EntityCoreBaseType,
    EntityCoreBaseAsset {}

export interface Timestamps {
  creation_date: string; // ISO format
  update_date: string; // ISO format
}

type Strain = {
  name: string;
  taxonomy_id: string;
  species_id: number;
};

export interface IStrain extends Strain, Timestamps, EntityCoreIdentifiable {}

type Species = {
  name: string;
  taxonomy_id: string;
};

export interface ISpecies extends Species, Timestamps, EntityCoreIdentifiable {}

interface License {
  name: string;
  description: string;
  label: string;
}

export interface ILicense extends License, Timestamps, EntityCoreIdentifiable {}

export interface PointLocationBase {
  x: number;
  y: number;
  z: number;
}

export interface IBrainLocation extends PointLocationBase {}

export type MeasurementBase = {
  id: number;
  name: string;
  unit: string;
  value: number;
};

export interface IMtypeFilter extends PaginationFilter {
  id: string | null;
  pref_label: string | null;
  pref_label__in: string | null;
  order_by: string | null;
}

export type TypeFilter = {
  id?: string | null;
  pref_label?: string | null;
  pref_label__in?: string | null;
  order_by?: string | null;
};

export interface IMTypeFilter extends PaginationFilter, TypeFilter {}
export interface IETypeFilter extends PaginationFilter, TypeFilter {}

type RoleBase = {
  name: string;
  role_id: string;
};

interface IRole extends RoleBase, Timestamps, EntityCoreIdentifiable {}

type OrganizationBase = {
  type: 'organization';
  pref_label: string;
  alternative_name?: string | null;
};

interface IOrganization extends OrganizationBase, Timestamps, EntityCoreIdentifiable {}

type PersonBase = {
  type: 'person';
  givenName: string | null;
  familyName: string | null;
  pref_label: string;
};

export interface IPerson extends PersonBase, Timestamps, EntityCoreIdentifiable {}
export type Agent = IPerson | IOrganization;

export interface IContributor extends Timestamps, EntityCoreIdentifiable {
  agent: Agent;
  role: IRole;
}

enum AssetStatus {
  CREATED = 'created',
  DELETED = 'deleted',
}

export enum AssetLabel {
  brain_atlas_annotation = 'brain_atlas_annotation',
  brain_atlas_region_mesh = 'brain_atlas_region_mesh',
  campaign_generation_config = 'campaign_generation_config',
  campaign_summary = 'campaign_summary',
  cell_composition_summary = 'cell_composition_summary',
  cell_composition_volumes = 'cell_composition_volumes',
  custom_node_sets = 'custom_node_sets',
  emodel_optimization_output = 'emodel_optimization_output',
  morphology = 'morphology',
  neuron_hoc = 'neuron_hoc',
  neuron_mechanisms = 'neuron_mechanisms',
  nwb = 'nwb',
  replay_spikes = 'replay_spikes',
  simulation_designer_image = 'simulation_designer_image',
  simulation_generation_config = 'simulation_generation_config',
  single_neuron_simulation_data = 'single_neuron_simulation_data',
  single_neuron_synaptome_config = 'single_neuron_synaptome_config',
  single_neuron_synaptome_simulation_data = 'single_neuron_synaptome_simulation_data',
  sonata_circuit = 'sonata_circuit',
  sonata_simulation_config = 'sonata_simulation_config',
  spike_report = 'spike_report',
  validation_result_details = 'validation_result_details',
  validation_result_figure = 'validation_result_figure',
  voltage_report = 'voltage_report',
  voxel_densities = 'voxel_densities',
  network_stats_a = 'network_stats_a',
  circuit_connectivity_matrices = 'circuit_connectivity_matrices',
  node_stats = 'node_stats',
  network_stats_b = 'network_stats_b',
  circuit_visualization = 'circuit_visualization',
  compressed_sonata_circuit = 'compressed_sonata_circuit',
}

type AssetBase = {
  path: string;
  full_path: string;
  bucket_name: string;
  is_directory: boolean;
  content_type: string;
  size: number;
  sha256_digest?: string | null;
  label: AssetLabel;
};

export interface IAsset extends AssetBase, AssetLegacyMeta {
  id: string;
  status: AssetStatus;
}

type Sex = 'male' | 'female' | 'unknown';
type AgePeriod = 'prenatal' | 'postnatal' | 'unknown';

type SubjectBase = {
  name: string;
  description: string;
  sex: Sex;
  weight?: number | null;
  age_value?: number | null;
  age_min?: number | null;
  age_max?: number | null;
  age_period?: AgePeriod | null;
};

export interface ISubject extends SubjectBase {
  species: ISpecies;
}

export type EntityAuthorization = {
  authorized_project_id: string;
  authorized_public: boolean;
};

type Annotation = {
  pref_label: string;
  alt_label: string;
  definition: string;
};

export interface IAnnotation extends EntityCoreIdentifiable, Annotation {}
export interface IMType extends IAnnotation {}
export interface IEType extends IAnnotation {}

// @FIXME: check this one
// const Dimension = {
//   dimensionless: 'dimensionless',
//   linear_density: '1/μm',
//   volume_density: '1/mm³',
// } as const;

export type DirectoryItem = {
  name: string;
  size: number;
  last_modified: string; // as Date
};
export type DirectoryListContent = {
  files: Record<string, DirectoryItem>;
};
