import { EntityCoreConfiguration } from '@/entity-configuration/domain/index';
import { PaginationFilter } from '@/api/entitycore/types/shared/request';
import { AssetLegacyMeta } from '@/api/entitycore/types/shared/legacy';

// TODO: should be in global shared type file
export type Nullish = null | undefined;
export type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};

export type EntityCoreDataType =
  (typeof EntityCoreConfiguration)[keyof typeof EntityCoreConfiguration]['type'];

export type EntityCoreIdentifiable = {
  id: string;
  legacy_id: Array<string> | null;
};

export type EntityCoreBaseType = {
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

type BrainRegion = {
  ontology_id: string;
  name: string;
};

export interface IBrainRegion extends BrainRegion, Timestamps, EntityCoreIdentifiable {}

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

export interface IBrainLocation {
  x: number;
  y: number;
  z: number;
}

export type MorphologyMeasurementSerie = {
  name: string;
  value: number;
};

export type Measurement = {
  measurement_of: string;
  measurement_serie: MorphologyMeasurementSerie[];
};

export type MTypeBase = {
  pref_label: string;
  alt_label: string;
  definition: string;
};

export interface IMType extends MTypeBase, Timestamps, EntityCoreIdentifiable {}
export interface IMtypeFilter extends PaginationFilter {
  id: string | null;
  pref_label: string | null;
  pref_label__in: string | null;
  order_by: string | null;
}

type RoleBase = {
  name: string;
  role_id: string;
};

export interface IRole extends RoleBase, Timestamps, EntityCoreIdentifiable {}

type OrganizationBase = {
  type: 'organization';
  pref_label: string;
  alternative_name?: string | null;
};

export interface IOrganization extends OrganizationBase, Timestamps, EntityCoreIdentifiable {}

type PersonBase = {
  type: 'person';
  givenName: string;
  familyName: string;
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

type AssetBase = {
  path: string;
  full_path: string;
  bucket_name: string;
  is_directory: boolean;
  content_type: string;
  size: number;
  sha256_digest?: string | null;
};

export interface IAsset extends AssetBase, AssetLegacyMeta {
  id: string;
  status: AssetStatus;
}
