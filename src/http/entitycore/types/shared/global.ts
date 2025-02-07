// should be in global shared type file
export type Nullish = null | undefined;
export type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};

export type AuditMetadata = {
  id: number;
  creation_date: string; // ISO format
  update_date: string; // ISO format
};

type BrainRegion = {
  ontology_id: string;
  name: string;
};

export interface IBrainRegion extends BrainRegion, AuditMetadata {}

type Strain = {
  name: string;
  taxonomy_id: string;
  species_id: number;
};

export interface IStrain extends Strain, AuditMetadata {}

type Species = {
  name: string;
  taxonomy_id: string;
};

export interface ISpecies extends Species, AuditMetadata {}

interface License {
  name: string;
  description: string;
  label: string;
}

export interface ILicense extends License, AuditMetadata {}

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

export interface IMType extends MTypeBase, AuditMetadata {}

type RoleBase = {
  name: string;
  role_id: string;
};

export interface IRole extends RoleBase, AuditMetadata {}

type OrganizationBase = {
  pref_label: string;
  alternative_name?: string | null;
};

export interface IOrganization extends OrganizationBase, AuditMetadata {}

type PersonBase = {
  givenName: string;
  familyName: string;
  pref_label: string;
};

export interface IPerson extends PersonBase, AuditMetadata {}
export type Agent = IPerson | IOrganization;

export interface IContributor {
  agent: Agent;
  role: IRole;
}
