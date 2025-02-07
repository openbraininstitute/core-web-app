// should be in global shared type file
export type Nullish = null | undefined;

export interface IAuditMetadata {
  id: number;
  creation_date: string; // ISO format
  update_date: string; // ISO format
}

type BrainRegion = {
  ontology_id: string;
  name: string;
};

export interface IBrainRegion extends BrainRegion, IAuditMetadata { };

type Strain = {
  name: string;
  taxonomy_id: string;
  species_id: number;
};

export interface IStrain extends Strain, IAuditMetadata { };

type Species = {
  name: string;
  taxonomy_id: string;
};

export interface ISpecies extends Species, IAuditMetadata { };

interface License {
  name: string;
  description: string;
  label: string;
}

export interface ILicense extends License, IAuditMetadata { };

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
}

export interface IMType extends MTypeBase, IAuditMetadata { };