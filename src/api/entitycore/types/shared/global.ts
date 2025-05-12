import { EntityCoreConfiguration } from '@/entity-configuration/domain';

import type { PaginationFilter } from '@/api/entitycore/types/shared/request';
import type { AssetLegacyMeta } from '@/api/entitycore/types/shared/legacy';
import type { EntityTypeValue } from '@/api/entitycore/types/entity-type';

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

export type EntityCoreType = {
  type: EntityTypeValue;
};

export type EntityCoreOwnership = {
  createdBy: Agent;
  updatedBy: Array<Agent> | null;
};

export interface EntityCoreIdentifiableNamed extends EntityCoreIdentifiable {
  name: string;
}

export type EntityCoreBaseType = {
  type: EntityCoreDataType;
};

export interface EntityCoreBaseAsset {
  assets: Array<IAsset> | null;
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
  id: number;
  name: string;
  acronym: string;
  children: Array<number>;
};

export interface IBrainRegion extends BrainRegion, Timestamps {}

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

export type Sex = 'male' | 'female' | 'unknown';
export type AgePeriod = 'prenatal' | 'postnatal' | 'unknown';

export type SubjectBase = {
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

// check this one
const Dimension = {
  dimensionless: 'dimensionless',
  linear_density: '1/μm',
  volume_density: '1/mm³',
} as const;
