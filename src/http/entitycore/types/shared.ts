export interface IAuditMetadata {
  id: number;
  creationDate: string; // ISO format
  updateDate: string; // ISO format
}

type BrainRegion = {
  ontologyId: string;
  name: string;
};

export interface IBrainRegion extends BrainRegion, IAuditMetadata {}

type Strain = {
  name: string;
  taxonomyId: string;
  speciesId: number;
};

export interface IStrain extends Strain, IAuditMetadata {}

type Species = {
  name: string;
  taxonomyId: string;
};

export interface ISpecies extends Species, IAuditMetadata {}

interface License {
  name: string;
  description: string;
  label: string;
}

export interface ILicense extends License, IAuditMetadata {}

export interface IBrainLocation {
  x: number;
  y: number;
  z: number;
}
