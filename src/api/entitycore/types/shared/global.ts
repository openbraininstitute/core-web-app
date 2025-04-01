import { ENTITY_CORE_DATA_TYPES } from '@/api/entitycore/types/shared/context';
import { PaginationFilter } from '@/api/entitycore/types/shared/request';
import { AssetLegacyMeta } from '@/api/entitycore/types/shared/legacy';

// TODO: should be in global shared type file
export type Nullish = null | undefined;
export type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};

export type EntityCoreDataType =
  (typeof ENTITY_CORE_DATA_TYPES)[keyof typeof ENTITY_CORE_DATA_TYPES]['type'];

export type EntityCoreBaseId = {
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
  extends EntityCoreBaseId,
    EntityCoreBaseType,
    EntityCoreBaseAsset {}

export interface DateMetadata extends EntityCoreBaseId {
  creation_date: string; // ISO format
  update_date: string; // ISO format
}

type BrainRegion = {
  ontology_id: string;
  name: string;
};

export interface IBrainRegion extends BrainRegion, DateMetadata {}

type Strain = {
  name: string;
  taxonomy_id: string;
  species_id: number;
};

export interface IStrain extends Strain, DateMetadata {}

type Species = {
  name: string;
  taxonomy_id: string;
};

export interface ISpecies extends Species, DateMetadata {}

interface License {
  name: string;
  description: string;
  label: string;
}

export interface ILicense extends License, DateMetadata {}

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

export interface IMType extends MTypeBase, DateMetadata {}
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

export interface IRole extends RoleBase, DateMetadata {}

type OrganizationBase = {
  type: 'organization';
  pref_label: string;
  alternative_name?: string | null;
};

export interface IOrganization extends OrganizationBase, DateMetadata {}

type PersonBase = {
  type: 'person';
  givenName: string;
  familyName: string;
  pref_label: string;
};

export interface IPerson extends PersonBase, DateMetadata {}
export type Agent = IPerson | IOrganization;

export interface IContributor extends DateMetadata {
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
